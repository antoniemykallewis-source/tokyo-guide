# Public data handoff

Prepared 2026-10-27 from the supplied `places.json`, `bookings.json`, `sections.md`, `research.md`, and build brief. Original files stay outside the public bundle.

## Structure and checks

- `public/data/places.json`: exactly 94 unique source records, including 26 original-list flags. Category totals: Food 23, Bars 16, Activities/Sports 20, Shopping/Thrift 25, Sights 10.
- `public/data/bookings.json`: 19 urgent items plus 8 optional reservations. No item is booked in the supplied data. The prerequisite IDP item is not an extra place.
- `public/data/clusters.json`: 15 urban clusters with codes SBY, HAR, EBI, NAK, SHM, SHJ, KOE, GIN, TSU, TOY, ODA, ASA, AKI, DOM, TOR, plus a separate `off_map` tour. Cluster membership covers every source place exactly once.
- The 15 by 15 matrix is symmetric, with zero diagonal. Values reproduce the supplied matrix, not live transit calculations.
- Every record has numeric coordinates and a syntactically valid Google Maps URL. Coordinates and link destinations have not all been independently verified.
- JSON was parsed successfully. Slug uniqueness, category set, cluster coverage, private-field exclusion and absence of em dashes were checked.

## Schema for the UI

Place records retain source display fields and add:

- `cluster_code`: one of the 15 codes or `OFF`.
- `closed_days`: JavaScript weekday numbers, Sunday 0 to Saturday 6. Source-declared closures, not a full opening calendar.
- `closed_dates`: currently includes Gold's Gym on 2026-11-16.
- `events`: dated items with `date`, `time` in JST, `name`, and organizer `source`.
- `event_dates`: date-only convenience list.
- `availability`: `check_hours` for normal source records, `permanently_closed` for the closed Jingu Gaien combined record.
- `closure_note`, `availability_note`, `verification_source`, `verification_scope`, and `verified_on` where applicable.
- `confirmation`: date and time only. All values are currently blank.

Clusters contain `code`, `name`, `station`, `description`, `good_day`, `pairs`, `place_slugs`, `count`, and `center`. Centers are the arithmetic mean of supplied place coordinates, explicitly not station coordinates. A pair contains a matrix-based `minutes` value and the original `description` with route context. For example, Shibuya to Harajuku is 3 in the matrix but the pair copy says 2 minutes by JR. Do not silently present these as one exact live route.

Bookings are authoritative for booking status, priority, URL and window. The sanitized place data already incorporates the booking values. Runtime code should still merge the latest bookings file by slug. `release_windows` on Shibuya Sky contains ISO timestamps with the JST offset and visit dates. Display Pacific time through `America/Los_Angeles`, not a fixed UTC offset. Exact midnight release timing remains source-provided; the official page confirms the two-week sales window.

## Corrections and targeted primary-source checks

1. **Meiji Jingu Gaien golf and batting are closed.** The official sports page states golf closed December 31, 2022 and the batting dome closed April 5, 2026. The English golf page remains online with obsolete operating information. The combined source record is retained so all 94 supplied records remain visible, but marked `permanently_closed`, with stale price/hours/visit copy replaced by a closure notice. Exclude it from automatic itineraries and never show it as open. Source: https://www.meijijingugaien.jp/sports/ .
2. Hikiniku's official Shibuya page confirms Wednesday closure, 11:00-15:00 and 17:00-21:00 service, online registration, and advance priority tickets. Source: https://hikinikutocome.com/en/visit/shibuya/ .
3. Shibuya Sky's official ticket page confirms sales up to two weeks ahead and afternoon tickets at JPY 3,400. Source: https://www.shibuya-scramble-square.com/sky/ticket/ . Its FAQ did not expose usable text, so the precise midnight release rule is not claimed independently verified.
4. Alvark's official site confirms the listed home games on November 11 at 19:05, November 14 at 17:05, and November 16 at 19:05. Source: https://www.alvark-tokyo.jp/?lang=en . The Tokyo metropolitan sports announcement corroborates the dates: https://www.sports-tokyo-info.metro.tokyo.lg.jp/eventblog/2026/10/bm_26100501.html . The November 16 game conflicts with the brief's morning-only departure day and must not be silently scheduled.
5. FREEDOMS confirms November 13 at 18:30 at Korakuen Hall: https://www.pw-freedoms.co.jp/ticket_list.php . NEXUS confirms November 14 at 18:00: https://fighting-nexus.net/schedule.php . All Japan Pro Wrestling confirms November 15 at 11:30, adding the precise time absent from the input: https://www.all-japan.co.jp/events/9597/ . Ticket inventory can change.
6. HIRAKUZA terms confirm 50% cancellation at 7-20 days before, and 100% at 6 days or less. Source: https://hirakuza.net/sumolp2/assets/pdf/hirakuza_GINZA_terms_of_use_en.pdf . Calendar shows evening showtimes vary, so the blanket 20:30 recommendation was replaced with a dated-calendar check: https://hirakuza.net/tokyo/calendar/ . No booking was made.

## Important limits

- 70 of the 94 records still have blank structured `hours`. Some notes contain hours, but do not infer reliable live opening from those paragraphs. Show **Hours unconfirmed** when the schedule is not machine-parseable. A blank schedule must never mean open 24 hours.
- Supplied estimates omit transfers, station access, platforms, waiting and traffic. The matrix heading says add 5-10 minutes. The Tsukiji-Toyosu pair is explicitly a taxi estimate, although the overall matrix says train. Present as travel estimates, not precise train routes.
- Source-declared Toyosu Wednesday closure is conservative. The actual monthly market calendar has not been checked. The planner blocks Wednesday but should explain that the source says most Wednesdays.
- JBS hours are explicitly uncertain in the source. Luis JDM is an unconfirmed operator match. No undisclosed substitute venue has been added.
- The remaining venue prices, schedules, holiday exceptions, URLs, inventory, accessibility and image accuracy are source-provided and not universally reverified. Do not describe this output as 94 independently verified operating venues.
- The document claim that every driver needs the same IDP is too broad for a public guide. Street Kart lists country-specific document alternatives. For a U.S. license holder, the 1949 Geneva IDP plus original license and passport route is the relevant source guidance. Confirm against the operator's current license requirements before paying: https://streetkart.com/en/agreement_akihabara2.html . AAA source: https://www.aaa.com/vacation/idpf.html .

## Privacy

All supplied confirmation objects were empty. The public files strip confirmation numbers, party sizes, and confirmation notes regardless. Personal clothing-size and preference copy was removed. Public selection flags were retained as specifically requested. Do not commit raw Slack responses, the original research pack, screenshots with private UI, signed download URLs, API secrets or later private booking details. A public GitHub Pages URL, even with noindex, is public. Public reservation dates/times should only be added when sharing them is authorized.

## Shibuya Sky release timing update

Operator notice dated February27,2025, page2 confirms midnight Japan time two weeks before entry for visits from April2 onward: https://shibuya-scramble-square.com/assets/pdf/about/20250227scsq.pdf . The2026 festival page repeats the ordinary exhibition rule: https://shibuya-scramble-square.com/sky/bonodori/ . This confirms the release rule, not November inventory. America/Los_Angeles conversion crosses the November1 DST change: October27–31 at8AM PDT, November1 at7AM PST.
