import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAYS, clean, formatTimeText, isClosed, closedDays, dayConflicts, mergedPlaces, autoPlan,
  planWarnings, distanceMinutes, hoursStatus, encodeState, decodeState,
} from '../src/lib/trip';
import type { Place, Booking, ClusterData, Plan } from '../src/types';
import {isSuggested,preserveArchivedAssignments,hasCoordinates} from '../src/lib/curation';
import {convertMoney,splitMoney,FX_REFERENCE} from '../src/lib/currency';

const readData = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'));
const places = readData<Place[]>('places');
const bookingData = readData<{items: Booking[]; optional_reservations: Booking[]}>('bookings');
const bookings = [...bookingData.items, ...bookingData.optional_reservations];
const clusters = readData<ClusterData>('clusters');
const find = (slug: string): Place => {
  const found = places.find(p => p.slug === slug);
  assert.ok(found, `Fixture place exists: ${slug}`);
  return found;
};
const fixture = (overrides: Partial<Place> = {}): Place => ({
  slug: 'fixture-cafe', name: 'Fixture Cafe', area: 'Shibuya', category: 'Food',
  lat: 35.6595, lng: 139.7005, google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Fixture',
  price: 'Source price', wait_level: 'Low', reservation_needed: 'n', best_time: 'Afternoon',
  hours: '', notes: '', from_antonie_list: false, cluster_code: 'SBY',
  cluster_station: 'Shibuya Sta', walk_min_from_station: 5, booking_status: 'walk_in',
  closed_days: [], closed_dates: [], event_dates: [], ...overrides,
});
const book = (overrides: Partial<Booking> = {}): Booking => ({
  slug: 'fixture-cafe', name: 'Fixture Cafe', area: 'Shibuya', booking_status: 'booked',
  booking_priority: 0, booking_url: 'https://example.com/book', booking_window: 'Authoritative booking window',
  confirmation: { date: '2026-11-14', time: '17:00' }, ...overrides,
});

// Public-source integrity checks guard accidental fixture loss and privacy regressions.
test('public dataset preserves exactly 94 unique source places and 26 selections', () => {
  assert.equal(places.length, 94);
  assert.equal(new Set(places.map(p => p.slug)).size, 94);
  assert.equal(places.filter(p => p.from_antonie_list).length, 26);
  assert.deepEqual(Object.fromEntries(['Food','Bars','Activities/Sports','Shopping/Thrift','Sights'].map(c => [c, places.filter(p => p.category === c).length])), {
    Food: 23, Bars: 16, 'Activities/Sports': 20, 'Shopping/Thrift': 25, Sights: 10,
  });
});

test('all 94 places belong to one of 15 clusters or the single off-map chapter', () => {
  assert.equal(clusters.clusters.length, 15);
  const off = clusters.off_map as {place_slugs: string[]};
  const slugs = [...clusters.clusters.flatMap(c => c.place_slugs), ...off.place_slugs];
  assert.equal(slugs.length, 94);
  assert.equal(new Set(slugs).size, 94);
  assert.deepEqual([...slugs].sort(), places.map(p => p.slug).sort());
  for (const a of clusters.codes) for (const b of clusters.codes) {
    assert.equal(clusters.matrix[a][b], clusters.matrix[b][a]);
    assert.ok(Number.isFinite(clusters.matrix[a][b]));
    if (a === b) assert.equal(clusters.matrix[a][b], 0);
  }
});

test('public files contain no private confirmation fields or em dashes', () => {
  const forbidden = new Set(['confirmation_number', 'party_size', 'passport_number', 'email', 'phone']);
  const scan = (value: unknown, path: string): void => {
    if (typeof value === 'string') assert.ok(!value.includes('\u2014'), `${path}: em dash`);
    if (Array.isArray(value)) value.forEach((v, i) => scan(v, `${path}.${i}`));
    else if (value && typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        assert.ok(!forbidden.has(key), `${path}.${key}: private field`);
        if (key === 'confirmation') assert.deepEqual(Object.keys(val as object).sort(), ['date', 'time']);
        scan(val, `${path}.${key}`);
      }
    }
  };
  scan(places, 'places'); scan(bookingData, 'bookings'); scan(clusters, 'clusters');scan(readData('curated'),'curated');
  assert.ok(!JSON.stringify(places).includes('his cropped/boxy XL vibe'));
  assert.equal(bookings.filter(b => b.booking_status === 'booked').length, 0);
});

test('every place has valid coordinate bounds and a usable Maps URL', () => {
  for (const p of places) {
    assert.ok(Number.isFinite(p.lat) && Math.abs(p.lat) <= 90, p.slug);
    assert.ok(Number.isFinite(p.lng) && Math.abs(p.lng) <= 180, p.slug);
    const url = new URL(p.google_maps_url);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname.endsWith('google.com'), p.slug);
  }
});

test('clean normalizes copy without producing em dashes or undefined', () => {
  assert.equal(clean('  NIGHT—TOKYO\n\tNOW  '), 'NIGHT. TOKYO NOW');
  assert.equal(clean(null), '');
  assert.equal(clean(undefined), '');
});

test('booking file overrides stale place status, URL, window and confirmation without mutating inputs', () => {
  const p = fixture({booking_status: 'need_to_book', booking_url: 'https://example.com/stale', booking_window: 'Stale', confirmation: {date:'', time:''}});
  const b = book();
  const before = JSON.stringify([p,b]);
  const [merged] = mergedPlaces([p], [b]);
  assert.equal(merged.booking_status, 'booked');
  assert.equal(merged.booking_url, b.booking_url);
  assert.equal(merged.booking_window, b.booking_window);
  assert.deepEqual(merged.confirmation, b.confirmation);
  assert.equal(JSON.stringify([p,b]), before);
});

test('booking file is also authoritative for urgency priority', () => {
  const [merged] = mergedPlaces([fixture({booking_priority:9})], [book({booking_priority:1})]);
  assert.equal(merged.booking_priority, 1);
});

test('missing booking retains place details and blank booking URL retains valid place URL', () => {
  const p = fixture({booking_url:'https://example.com/place'});
  assert.deepEqual(mergedPlaces([p], [book({slug:'different'})]), [p]);
  assert.equal(mergedPlaces([p], [book({booking_url:''})])[0].booking_url, p.booking_url);
});

test('weekday closures use Tokyo calendar days and the actual source slugs', () => {
  assert.deepEqual(closedDays(find('hikiniku-to-kome-shibuya')), [3]);
  assert.ok(dayConflicts(find('hikiniku-to-kome-shibuya'), '2026-11-11').includes('CLOSED WED'));
  assert.ok(!dayConflicts(find('hikiniku-to-kome-shibuya'), '2026-11-12').includes('CLOSED WED'));
  assert.ok(dayConflicts(find('minami-aoyama-shimizuyu-sento'), '2026-11-13').includes('CLOSED FRI'));
  assert.ok(dayConflicts(find('grandfather-s'), '2026-11-16').includes('CLOSED MON'));
  assert.ok(dayConflicts(find('kitsuneya'), '2026-11-15').includes('CLOSED SUN'));
  assert.ok(dayConflicts(find('nihonbashi-philly-eagles-bar'), '2026-11-14').includes('CLOSED SAT'));
});

test('specific closed dates are respected for any venue, not only a hard-coded gym slug', () => {
  const p = fixture({closed_dates:['2026-11-12']});
  assert.ok(dayConflicts(p,'2026-11-12').some(x => x.startsWith('CLOSED')));
  assert.equal(dayConflicts(p,'2026-11-13').length, 0);
  assert.ok(dayConflicts(find('gold-s-gym-harajuku-tokyo'),'2026-11-16').some(x => x.includes('CLOSED')));
});

test('dated event restrictions and departure morning are surfaced', () => {
  const alvark = find('alvark-tokyo-b-league-at-toyota-arena-tokyo');
  assert.ok(dayConflicts(alvark,'2026-11-12').includes('NO EVENT LISTED THIS DAY'));
  assert.ok(!dayConflicts(alvark,'2026-11-14').includes('NO EVENT LISTED THIS DAY'));
  assert.ok(dayConflicts(alvark,'2026-11-16').includes('DEPARTURE DAY. MORNING ONLY'));
  const korakuen = find('korakuen-hall-boxing-pro-wrestling');
  assert.ok(!dayConflicts(korakuen,'2026-11-15').includes('NO EVENT LISTED THIS DAY'));
});

test('autoPlan pins booked dates even when not starred and keeps conflicts visible', () => {
  const p = fixture({closed_days:[6]});
  const fixed = book({confirmation:{date:'2026-11-14',time:'17:00'}});
  const plan = autoPlan([], [p], [fixed], clusters);
  assert.equal(plan[p.slug], '2026-11-14');
  assert.ok(planWarnings(p, plan[p.slug], plan, [p], clusters).includes('CLOSED SAT'));
});

test('autoPlan excludes permanently closed unbooked venues and restricts events', () => {
  const closed = find('meiji-jingu-gaien-batting-golf-range');
  const hikiniku = find('hikiniku-to-kome-shibuya');
  const alvark = find('alvark-tokyo-b-league-at-toyota-arena-tokyo');
  const korakuen = find('korakuen-hall-boxing-pro-wrestling');
  const selected = [closed,hikiniku,alvark,korakuen];
  const plan = autoPlan(selected.map(p=>p.slug), selected, [], clusters);
  assert.ok(isClosed(closed));
  assert.equal(plan[closed.slug], undefined);
  for (const p of [hikiniku,alvark,korakuen]) {
    assert.ok(DAYS.includes(plan[p.slug]));
    assert.deepEqual(dayConflicts(p,plan[p.slug]), []);
  }
  assert.notEqual(plan[alvark.slug], '2026-11-16');
});

test('autoPlan does not mutate stars, source data, or booking data', () => {
  const selected = places.filter(p=>p.from_antonie_list).map(p=>p.slug);
  const before = JSON.stringify([selected,places,bookings,clusters]);
  const plan = autoPlan(selected,places,bookings,clusters);
  assert.ok(Object.keys(plan).length > 0);
  assert.equal(JSON.stringify([selected,places,bookings,clusters]), before);
  for (const [slug,date] of Object.entries(plan)) assert.deepEqual(dayConflicts(find(slug),date), []);
});

test('planner flags 40+ minute area gaps and potentially overlapping fixed bookings', () => {
  const a = fixture({slug:'west',cluster_code:'SHM',confirmation:{date:'2026-11-12',time:'17:00'}});
  const b = fixture({slug:'east',cluster_code:'TOY',confirmation:{date:'2026-11-12',time:'17:30'}});
  const plan: Plan = {west:'2026-11-12', east:'2026-11-12'};
  const warnings = planWarnings(a,'2026-11-12',plan,[a,b],clusters);
  assert.ok(warnings.includes('40+ MIN FROM REST OF DAY'));
  assert.ok(warnings.includes('FIXED BOOKINGS MAY OVERLAP'));
});

test('shared URL state round-trips stars and planner dates across devices', () => {
  const stars = [places[0].slug,places[3].slug];
  const plan = {[stars[0]]:'2026-11-12',[stars[1]]:'2026-11-14'};
  assert.deepEqual(decodeState(encodeState(stars,plan),places),{stars,plan});
  assert.deepEqual(decodeState(encodeState([],{}),places),{stars:[],plan:{}});
  assert.equal(decodeState('#areas',places),null);
});

test('shared state discards unknown places, duplicate stars, and invalid day indices', () => {
  const slug = places[0].slug;
  const hash = `#s=${slug},unknown,${slug}&p=unknown:0,${slug}:99`;
  assert.deepEqual(decodeState(hash,places),{stars:[slug],plan:{}});
  for (const bad of ['-1','6','NaN','1.5','Infinity']) {
    assert.deepEqual(decodeState(`#s=${slug}&p=${slug}:${bad}`,places)?.plan,{});
  }
});

test('malformed shared plan entries do not silently become arrival-day bookings', () => {
  const slug = places[0].slug;
  for (const bad of ['', ' ', '0:extra']) {
    assert.deepEqual(decodeState(`#s=${slug}&p=${slug}:${encodeURIComponent(bad)}`,places)?.plan,{});
  }
});

test('walking estimates are nonnegative, symmetric and apply the stated street factor', () => {
  const a = {lat:35.6595,lng:139.7005};
  const b = {lat:35.6605,lng:139.7005};
  assert.equal(distanceMinutes(a,a),0);
  assert.equal(distanceMinutes(a,b),2); // about111m x1.3 /80m per minute, rounded
  assert.equal(distanceMinutes(a,b),distanceMinutes(b,a));
  assert.ok(distanceMinutes(a,{lat:35.7148,lng:139.7967})>=40);
});

test('unknown and complex opening hours never become Open Now', () => {
  const noonJst = new Date('2026-11-12T03:00:00Z');
  for (const hours of ['', 'Ask venue', 'Shops ~11:00-21:00, restaurants 11:30-23:00', '11:00-15:00, 17:00-21:00; closed Wed']) {
    assert.equal(hoursStatus(fixture({hours}),noonJst).state,'unknown');
  }
});

test('simple opening ranges honor JST, closing boundaries, and overnight service', () => {
  const p = fixture({hours:'11:00-21:00'});
  assert.equal(hoursStatus(p,new Date('2026-11-12T02:00:00Z')).state,'open');
  assert.equal(hoursStatus(p,new Date('2026-11-12T12:00:00Z')).state,'closed');
  const night = fixture({hours:'17:00-02:00'});
  assert.equal(hoursStatus(night,new Date('2026-11-12T16:00:00Z')).state,'open');
  assert.equal(hoursStatus(night,new Date('2026-11-12T17:00:00Z')).state,'closed');
  assert.equal(hoursStatus(night,new Date('2026-11-12T03:00:00Z')).state,'closed');
});

test('hours status honors explicit closure dates and permanently closed venues', () => {
  const closedDate = fixture({hours:'11:00-21:00',closed_dates:['2026-11-12']});
  assert.equal(hoursStatus(closedDate,new Date('2026-11-12T03:00:00Z')).state,'closed');
  assert.equal(hoursStatus(find('meiji-jingu-gaien-batting-golf-range'),new Date('2026-11-12T03:00:00Z')).state,'closed');
});

test('invalid clock ranges are unknown, not an asserted live state', () => {
  for (const hours of ['25:00-26:00','11:99-21:00','11:00-24:30']) {
    assert.equal(hoursStatus(fixture({hours}),new Date('2026-11-12T03:00:00Z')).state,'unknown');
  }
});

test('unbooked auto-plan keeps one anchor plus one nearby area instead of forcing distant clusters together', () => {
  const selected = places.filter(p=>p.from_antonie_list).map(p=>p.slug);
  const plan = autoPlan(selected,places,[],clusters);
  for (const date of DAYS) {
    const areas = [...new Set(places.filter(p=>plan[p.slug]===date).map(p=>p.cluster_code))];
    assert.ok(areas.length<=2, `${date}: at most two area clusters, got ${areas.join(', ')}`);
    for (const a of areas) for (const b of areas) {
      if (a!==b) assert.ok((clusters.matrix[a]?.[b]??Infinity)<=15, `${date}: ${a} to ${b} must be a nearby pair`);
    }
  }
});

test('unbooked arrival day does not auto-assign an off-map multi-hour tour', () => {
  const tour = find('luis-jdm-experience-daikoku-pa-night-tour');
  const selected = places.filter(p=>p.from_antonie_list).map(p=>p.slug);
  const plan = autoPlan(selected,places,[],clusters);
  assert.notEqual(plan[tour.slug],DAYS[0]);
});


test('Bay Night keeps Alvark and Round1 on Saturday without recommending teamLab', () => {
  const slugs = [
    'teamlab-planets',
    'alvark-tokyo-b-league-at-toyota-arena-tokyo',
    'round1-stadium-divercity-tokyo-plaza',
  ];
  const plan = autoPlan(slugs,places,[],clusters);
  assert.equal(plan['teamlab-planets'],undefined);
  for (const slug of slugs.filter(isSuggested)) {
    assert.equal(plan[slug],'2026-11-14', `${slug} should join the Saturday bay event`);
    assert.deepEqual(dayConflicts(find(slug),plan[slug]),[]);
  }
});

test('nearby-area preference never overrides closures, daily capacity or the free Friday', () => {
  const plan = autoPlan(places.map(p=>p.slug),places,[],clusters);
  for (const [i,date] of DAYS.entries()) {
    const dayPlaces = places.filter(p=>plan[p.slug]===date);
    assert.ok(dayPlaces.length<=(i===0||i===5?2:3), `${date} exceeds its place limit`);
    if (i===2) assert.equal(dayPlaces.length,0, 'Friday stays free unless manually overridden');
    const areas = [...new Set(dayPlaces.map(p=>p.cluster_code))];
    assert.ok(areas.length<=2);
    for (const p of dayPlaces) assert.deepEqual(dayConflicts(p,date),[]);
    for (const a of areas) for (const b of areas) {
      if(a!==b) assert.ok((clusters.matrix[a]?.[b]??Infinity)<=15);
    }
  }
});

test('every original place has a clear source-grounded description', () => {
  const descriptions = readData<Record<string,string>>('descriptions');
  assert.deepEqual(Object.keys(descriptions).sort(), places.map(p=>p.slug).sort());
  for(const text of Object.values(descriptions)) { assert.ok(text.length>60); assert.ok(!text.includes('\u2014')); }
  assert.match(descriptions['good-wood-terrace'], /Jamaican.*jerk chicken/);
  assert.match(descriptions['hikiniku-to-kome-shibuya'], /hamburger patties.*rice/);
});
test('new recommendation options are separate, sourced and coordinate-free', () => {
  const rec = readData<any>('recommendations');
  assert.equal(rec.options.length,6); assert.equal(rec.archived_options.length,3); assert.equal(rec.packages.length,5);
  assert.equal(new Set([...rec.options,...rec.archived_options].map((o:any)=>o.id)).size,9);
  for(const o of rec.options) { assert.equal(new URL(o.source_url).protocol,'https:');assert.equal(new URL(o.maps_url).hostname,'www.google.com');assert.equal(o.checked_date,'2026-10-27');assert.ok(!('lat' in o)); }
});
test('sample-day linked stops resolve without substituting shops for generic meals', () => {
  const rec=readData<any>('recommendations');
  for(const p of rec.packages)for(const step of p.sequence){if(step.place_slug)assert.ok([...places,...readData<any>('curated').places].some(p=>p.slug===step.place_slug));if(step.option_id)assert.ok(rec.options.some((o:any)=>o.id===step.option_id));if(['Asakusa','Koenji'].includes(step.title))assert.equal(step.place_slug,null);}
});
test('Fuji is an optional weather-dependent replacement, not a summit hike or forecast',()=>{
  const {fuji}=readData<any>('recommendations');assert.match(fuji.what,/not climbing/);assert.match(fuji.recommendation,/Optional only, not a default day/);assert.match(fuji.recommendation,/No November visibility forecast/);assert.ok(fuji.constraints.some((s:string)=>s.includes('No summit climbing')));
});


test('all displayed clocks use AM/PM while stored hours retain 24-hour parsing',()=>{
assert.equal(formatTimeText('09:00–16:30, last entry 16:00'),'9:00 AM–4:30 PM, last entry 4:00 PM');
assert.equal(formatTimeText('12:00–24:00 / 00:00 JST'),'12:00 PM–12:00 AM / 12:00 AM JST');
assert.equal(formatTimeText('10:00 AM / 8:00 pm'),'10:00 AM / 8:00 PM');
assert.equal(formatTimeText('JPY 2,500 / 2026-11-16'),'JPY 2,500 / 2026-11-16');
assert.equal(find('shibuya-sky').hours,'10:00-22:30');
});


test('home distances cover94 archive stops and9 new options without invented travel times',()=>{
const d=readData<Record<string,any>>('home-distances'); const h=readData<any>('home');assert.equal(Object.keys(d).length,103);assert.equal(h.lat,35.740334);assert.equal(h.lng,139.716202);assert.match(h.source_url,/msearch.gsi.go.jp/);
for(const p of places){assert.ok(d[p.slug].straight_line_km>=0);assert.equal(d[p.slug].travel_time,null);const u=new URL(d[p.slug].transit_url);assert.match(u.searchParams.get('origin')||'',/Ikebukurohonchō/);assert.equal(u.searchParams.get('travelmode'),'transit');}
assert.equal(d['shibuya-scramble-crossing'].straight_line_km,9.1);assert.equal(d['tgct'].straight_line_km,null);
});


test('all94 original places and9 new options have reviewed source captures',()=>{
const shots=readData<Record<string,any>>('screenshots');const rec=readData<any>('recommendations');const ids=[...new Set([...places.map(p=>p.slug),...[...rec.options,...rec.archived_options].map((o:any)=>o.id),...readData<any>('curated').places.map((p:Place)=>p.slug)])];assert.equal(Object.keys(shots).length,119);assert.deepEqual(Object.keys(shots).sort(),ids.sort());for(const shot of Object.values(shots)){assert.equal(shot.verified_visual,true);assert.match(shot.src,/^shots\/[a-z0-9-]+\.webp$/);assert.equal(new URL(shot.source).protocol,'https:');}
});
test('all119 capture files match their published integrity hashes',()=>{
for(const shot of Object.values(readData<Record<string,any>>('screenshots'))){const bytes=readFileSync(new URL('../public/'+shot.src,import.meta.url));assert.equal(bytes.length,shot.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),shot.sha256);}
});
test('historical and shared source captures retain explicit non-photo caveats',()=>{
const shots=readData<Record<string,any>>('screenshots');assert.match(shots['hub-shibuya-british-pub-sports'].capture_note,/historical listing, not a venue photo/);assert.match(shots['2nd-street-harajuku'].capture_note,/historical 2025/);assert.match(shots['tokyobike-yanaka'].capture_note,/not asserted/);assert.equal(Object.values(shots).filter(s=>s.capture_method.startsWith('PDF')).length,2);
});


test('group preference removes gardens and traditional museum from active ideas and all day alternatives',()=>{
 const rec=readData<any>('recommendations');
 const archived=['shinjuku-gyoen','kiyosumi-gardens','tokyo-national-museum'];
 assert.deepEqual(rec.archived_options.map((o:any)=>o.id).sort(),archived.sort());
 const active=JSON.stringify({options:rec.options,packages:rec.packages,fuji:rec.fuji});
 for(const id of archived)assert.ok(!active.includes(id));
 assert.doesNotMatch(active,/Kiyosumi Gardens|Tokyo National Museum|Shinjuku Gyoen/i);
 assert.equal(rec.options.filter((o:any)=>['tgct','dig-west-side','tokyobike-kiyosumi','tokyobike-yanaka','docomo-share'].includes(o.id)).length,5);
 assert.ok(rec.options.some((o:any)=>o.id==='sunshine-aquarium'));
});
test('preference refinement preserves original immersive experiences and source evidence',()=>{
 assert.ok(places.some(p=>p.slug==='teamlab-planets'));
 assert.equal(places.length,94);
 const shots=readData<Record<string,any>>('screenshots');
 for(const id of ['shinjuku-gyoen','kiyosumi-gardens','tokyo-national-museum','teamlab-planets'])assert.equal(shots[id].verified_visual,true);
});


test('excluded suggestions remain in original source and shared state but do not auto-plan',()=>{
 const old={stars:['teamlab-planets','shibuya-sky'],plan:{'teamlab-planets':DAYS[3],'shibuya-sky':DAYS[4]}};
 assert.deepEqual(decodeState(encodeState(old.stars,old.plan),places),old);assert.equal(isSuggested('teamlab-planets'),false);
 const next=autoPlan(old.stars,places,[],clusters);assert.ok(!next['teamlab-planets']);assert.equal(preserveArchivedAssignments(old.plan,next)['teamlab-planets'],DAYS[3]);
});
test('new curated cards have no fabricated coordinates and can round-trip saved URLs',()=>{
 const extras=readData<any>('curated').places as Place[];assert.equal(extras.length,22);
 for(const p of extras){assert.equal(p.lat,null);assert.equal(p.lng,null);assert.equal(p.walk_min_from_station,null);assert.equal(hasCoordinates(p),false);assert.ok(p.description&&p.description.length>30);assert.ok(p.official_url?.startsWith('https://'));}
 const saved=extras.map(p=>p.slug);assert.deepEqual(decodeState(encodeState(saved,{}),[...places,...extras])?.stars,saved);
});
test('unknown-area activities stay manual and ordinary grouped days cap at three stops',()=>{
 const extras=readData<any>('curated').places as Place[];const all=[...places,...extras];const plan=autoPlan(all.map(p=>p.slug),all,[],clusters);
 for(const p of extras.filter(p=>p.auto_plan===false))assert.equal(plan[p.slug],undefined);
 for(const d of DAYS)assert.ok(Object.values(plan).filter(x=>x===d).length<=3);
});
test('pickleball and gym caveats do not imply held inventory or tourist eligibility',()=>{
 const extras=readData<any>('curated').places as Place[];const pick=(id:string)=>extras.find(p=>p.slug===id)!;
 assert.match(JSON.stringify(pick('neon-pickleball-shibuya').source_notes),/Not booked or held/);
 assert.match(JSON.stringify(pick('seibu-fast-sports-shinagawa-pickleball').source_notes),/14 days/);
 assert.match(JSON.stringify(pick('lyft-gym-omotesando').source_notes),/residence card/);assert.equal(pick('lyft-gym-omotesando').requires_access_check,true);
 assert.ok(extras.every(p=>p.booking_status!=='booked'));
});
test('reference currency calculator handles yen, dollars, splitting and invalid rates',()=>{
 assert.equal(FX_REFERENCE.checkedAt,'2026-10-27T03:00:00Z');assert.ok(Math.abs(convertMoney(10000,'JPY')!-63.40677333)<0.0001);
 assert.ok(Math.abs(splitMoney(convertMoney(10000,'JPY')!,5)!-12.68135467)<0.0001);
 assert.equal(convertMoney(100,'USD',150),15000);assert.equal(convertMoney(100,'JPY',0),null);assert.equal(convertMoney(-1,'JPY'),null);assert.equal(splitMoney(100,0),null);assert.equal(splitMoney(100,2.5),null);
});


test('social-bar curation stays public-factual and retains camera shopping',()=>{
 const c=readData<any>('curated');const all=c.places as Place[];
 assert.ok(all.some(p=>p.slug==='wrep'));assert.ok(all.some(p=>p.slug==='bridge-shibuya'));assert.ok(all.some(p=>p.slug==='map-camera-shinjuku'));
 assert.equal(all.find(p=>p.slug==='bridge-shibuya')?.closed_dates?.includes('2026-11-15'),true);
 const barText=JSON.stringify(all.filter(p=>['wrep','bridge-shibuya','popinn-ginza'].includes(p.slug)));assert.doesNotMatch(barText,/single women|attractiveness|dating|girlfriend|relationship status/i);
});

test('supplementary source captures also match integrity hashes',()=>{
 for(const shot of Object.values(readData<Record<string,any>>('screenshots')))for(const extra of shot.supplementary||[]){const bytes=readFileSync(new URL('../public/'+extra.src,import.meta.url));assert.equal(bytes.length,extra.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),extra.sha256);}
});
