import type {Place,Booking,Plan,ClusterData} from '../types';
export const DAYS=Array.from({length:6},(_,i)=>`2026-11-${11+i}`);
export const LABELS=['WED 11','THU 12','FRI 13','SAT 14','SUN 15','MON 16'];
export function formatTimeText(value:unknown):string{return String(value??'').replace(/(?<![\d:])([01]?\d|2[0-4]):([0-5]\d)(?::([0-5]\d))?(?![\d:])(?:\s*(AM|PM))?/gi,(match,h,m,seconds,meridiem)=>{if(meridiem)return `${Number(h)}:${m}${seconds?':'+seconds:''} ${meridiem.toUpperCase()}`;const hour=Number(h);if(hour===24&&m!=='00')return match;return `${hour%12||12}:${m}${seconds?':'+seconds:''} ${hour>=12&&hour<24?'PM':'AM'}`;});}
export const clean=(s:unknown)=>formatTimeText(s).replace(/—/g,'. ').replace(/\s+/g,' ').trim();
export function isClosed(p:Place){return p.permanently_closed===true||['permanently_closed','closed'].includes(String(p.availability));}
const closedBySlug:Record<string,number[]>={'hikiniku-to-kome-shibuya':[3],'shimizuyu':[5],'grandfathers':[1],'kitsuneya':[0],'nihonbashi-philly':[0,6]};
export function closedDays(p:Place):number[]{if(Array.isArray(p.closed_days))return p.closed_days;const s=p.slug.toLowerCase();if(s.includes('hikiniku'))return [3];if(s.includes('shimizuyu'))return [5];if(s.includes('grandfather'))return [1];if(s.includes('kitsuneya'))return [0];if(s.includes('nihonbashi-philly'))return [0,6];if(s.includes('toyosu-market'))return [0,3];return closedBySlug[s]??[];}
export function dayConflicts(p:Place,date:string):string[]{let r:string[]=[];const dow=new Date(`${date}T12:00:00+09:00`).getUTCDay();if(isClosed(p))r.push('CLOSED VENUE');if(Array.isArray(p.closed_dates)&&p.closed_dates.includes(date))r.push('CLOSED ON THIS DATE');if(closedDays(p).includes(dow))r.push(`CLOSED ${['SUN','MON','TUE','WED','THU','FRI','SAT'][dow]}`);if(p.slug.includes('gold')&&p.slug.includes('gym')&&date==='2026-11-16')r.push('CLOSED NOV 16');let dates=p.event_dates;if(!dates&&p.slug.includes('alvark'))dates=['2026-11-11','2026-11-14','2026-11-16'];if(!dates&&p.slug.includes('korakuen'))dates=['2026-11-13','2026-11-14','2026-11-15'];if(dates?.length&&!dates.includes(date))r.push('NO EVENT LISTED THIS DAY');if(date==='2026-11-16'&&(p.category==='Bars'||p.slug.includes('alvark')||p.slug.includes('korakuen')))r.push('DEPARTURE DAY. MORNING ONLY');return r;}
export function mergedPlaces(places:Place[],bookings:Booking[]):Place[]{const b=new Map(bookings.map(x=>[x.slug,x]));return places.map(p=>{let q=b.get(p.slug);return q?{...p,booking_status:q.booking_status,booking_priority:q.booking_priority,booking_url:q.booking_url||p.booking_url,booking_window:q.booking_window,confirmation:q.confirmation}:p;});}
export function autoPlan(stars:string[],places:Place[],bookings:Booking[],data:ClusterData):Plan{
 const result:Plan={};const fixed=new Set<string>();
 for(const b of bookings){if(b.booking_status==='booked'&&DAYS.includes(b.confirmation?.date||'')){result[b.slug]=b.confirmation!.date!;fixed.add(b.slug);}}
 const options=(p:Place)=>DAYS.filter((d,i)=>i!==2&&!dayConflicts(p,d).length&&!(i===0&&(p.cluster_code==='OFF'||(data.matrix.SBY?.[p.cluster_code]??60)>5))&&!(i===5&&p.cluster_code==='OFF')).length;
 const selected=places.filter(p=>stars.includes(p.slug)&&!fixed.has(p.slug)&&!isClosed(p)).sort((a,b)=>options(a)-options(b)||a.cluster_code.localeCompare(b.cluster_code));
 for(const p of selected){
  const scores=DAYS.map((d,i)=>{
   const peers=places.filter(q=>result[q.slug]===d);const areas=[...new Set([...peers.map(q=>q.cluster_code),p.cluster_code])];
   // Friday stays free for the unplanned afternoon. Manually assigned or booked events can override.
   if(i===2||dayConflicts(p,d).length||peers.length>=(i===0||i===5?2:5))return {d,score:Infinity};
   if(i===0&&(p.cluster_code==='OFF'||(data.matrix.SBY?.[p.cluster_code]??60)>5))return {d,score:Infinity};
   if(i===5&&p.cluster_code==='OFF')return {d,score:Infinity};
   if(areas.length>2||areas.some(a=>areas.some(b=>a!==b&&(data.matrix[a]?.[b]??60)>15)))return {d,score:Infinity};
   const sameArea=peers.some(q=>q.cluster_code===p.cluster_code);
   // Once a day passes every hard constraint, fill its anchor and nearby pair
   // before opening another day. Travel/load scores only break ties in a tier.
   // In particular, Toyosu should join an Odaiba event day, not drift to Thursday.
   const group=sameArea?0:peers.length?1:2;
   let score=peers.length*3+(i===0?7:0)+(i===5?12:0);
   if(peers.length&&!sameArea)score+=(data.matrix[peers[0].cluster_code]?.[p.cluster_code]??60)/2;
   return {d,score,group};
  }).sort((a,b)=>(a.group??3)-(b.group??3)||a.score-b.score);
  if(Number.isFinite(scores[0].score))result[p.slug]=scores[0].d;
 }
 return result;
}
export function planWarnings(p:Place,date:string,plan:Plan,places:Place[],data:ClusterData):string[]{const r=dayConflicts(p,date);const far=places.some(q=>q.slug!==p.slug&&plan[q.slug]===date&&(data.matrix[p.cluster_code]?.[q.cluster_code]??0)>=40);if(far)r.push('40+ MIN FROM REST OF DAY');const time=p.confirmation?.time;if(time&&places.some(q=>q.slug!==p.slug&&plan[q.slug]===date&&q.confirmation?.time&&Math.abs(minutes(q.confirmation.time)-minutes(time))<90))r.push('FIXED BOOKINGS MAY OVERLAP');return r;}
function minutes(t:string){const [h,m]=t.split(':').map(Number);return h*60+m;}
export function distanceMinutes(a:{lat:number;lng:number},b:{lat:number;lng:number}){const R=6371000,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;const v=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return Math.round((2*R*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))*1.3)/80);}
export function jstNow(date=new Date()){return new Date(date.toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));}
export function hoursStatus(p:Place,date=new Date()):{label:string;state:string}{if(isClosed(p))return {label:'PERMANENTLY CLOSED',state:'closed'};const d=jstNow(date);const dateKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);if(Array.isArray(p.closed_dates)&&p.closed_dates.includes(dateKey))return {label:'CLOSED TODAY',state:'closed'};if(closedDays(p).includes(d.getDay()))return {label:'CLOSED TODAY',state:'closed'};const h=(p.hours||'').trim();if(!/^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/.test(h))return {label:'CHECK HOURS',state:'unknown'};const parts=h.split(/[-–]/).map(v=>v.trim());if(parts.some(v=>{const [hh,mm]=v.split(':').map(Number);return hh<0||hh>23||mm<0||mm>59;}))return {label:'CHECK HOURS',state:'unknown'};const [start,end]=parts.map(minutes);const n=d.getHours()*60+d.getMinutes();const open=end>start?n>=start&&n<end:n>=start||n<end;return {label:open?'OPEN BY LISTED HOURS':'CLOSED BY LISTED HOURS',state:open?'open':'closed'};}
export function encodeState(stars:string[],plan:Plan){const p=new URLSearchParams();p.set('s',stars.join(','));if(Object.keys(plan).length)p.set('p',Object.entries(plan).map(([s,d])=>`${s}:${DAYS.indexOf(d)}`).join(','));return '#'+p.toString();}
export function decodeState(hash:string,places:Place[]):{stars:string[];plan:Plan}|null{const p=new URLSearchParams(hash.replace(/^#/,''));if(!p.has('s'))return null;const valid=new Set(places.map(x=>x.slug));const stars=[...new Set((p.get('s')||'').split(',').filter(s=>valid.has(s)))];const plan:Plan={};for(const item of (p.get('p')||'').split(',')){const match=/^([^:]+):([0-5])$/.exec(item);if(!match)continue;const [,s,i]=match;const d=DAYS[Number(i)];if(valid.has(s)&&d)plan[s]=d;}return {stars,plan};}
