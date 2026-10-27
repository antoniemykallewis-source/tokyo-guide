# NEON ARCHIVE: TOKYO

A public, phone-first Tokyo field guide for November 11 to 16, 2026.

Live destination: https://antoniemykallewis-source.github.io/tokyo-guide/

## Run

Node24, then `npm ci`, `npm run dev`. `npm run qa` runs36 unit tests, strict TypeScript and production build. `npm run build` emits `dist`, a94-record no-JavaScript fallback,404fallback and a versioned offline service worker.

GitHub Actions builds and publishes `main` to GitHub Pages. Base path is `/tokyo-guide/`. The public site has `noindex,nofollow`. This is not access control: the repository, built site and shared plan links are public.

## What works without credentials

- Clear Places / Saved / My day / Bookings screens with labeled, in-flow top phone navigation, compact rows and always-visible schematic 3D. All94 source records,26 original selections,15 area clusters plus the off-map tour.93 active entries are shown by default; the corrected closed record is opt-in.
- Owner-authorized public Home Base address with Google Maps directions. Address edits stay local and are excluded from shared plan URLs. Ikebukuro is outside the supplied15-area transit matrix, so no home-origin travel estimate is invented.
- Search, category/original-list/booking filters, direct Maps links, details, venue-source previews.
- Nearby walking estimates with explicit location permission, or manual area selection plus the supplied transit matrix. Coordinates stay on-device.
- Saved places, conservative area-first day grouping, dated closure/event warnings, pinned booked items and shared URL state. Overflow stays visibly unplaced instead of forcing a distant or closed venue into a day. Friday stays free by default. Arrival is light in the original source grouping; Monday is morning-only.
- Urgency-sorted booking links from `public/data/bookings.json`, runtime refresh with build-ID cache key and bundled offline fallback.
- Actual R3F/three WebGPU/TSL schematic city, automatic WebGL2 backend, genuine compileAsync signal, district rings and scramble particles. Decorative, not photorealistic Tokyo or a navigational map.
- Static/reduced-motion mode, manual Lite Mode, labeled, in-flow top phone navigation, keyboard/native-dialog accessibility, muted-default original synthesized chime and scratchable listening-bar records. Ornamental rack/cursor/claw surfaces are not in the default clarity view.
- Local fonts, offline card data and available images after service-worker installation. Booking sites, Google Maps and external map tiles need a network.

## Data and privacy

`public/data/places.json`, `bookings.json`, `clusters.json` and `images.json` are the shipped data. See `docs/data-notes.md` for targeted primary-source checks and schema.

94 is the source-record count, not94 independently reverified open venues. One source venue (Meiji Jingu Gaien golf/batting) is permanently closed and excluded from saved plans.70 records lack structured hours; they remain unknown. Complex hours are not guessed. Live status means only 'by listed hours', not live venue confirmation.

All confirmations in the supplied files were blank. No reservations have been made. Only public booking date/time may be included. Never commit confirmation numbers, guest names, party details, private notes, licenses, keys or payment data. URL shares contain saved venue slugs and day assignments only. No backend or analytics. The lodging address is public with explicit owner approval; the source lodging screenshot, host identity, guest images and other private details are excluded.

The provided 139.5 MB screenshot archive could not be downloaded through the available authorized Slack routes. The final guide instead has 103 independently captured, visually reviewed source artifacts in `screenshots.json` and 29 official public venue/site previews in `images.json`, with source provenance and seasonal context. Some source artifacts are historical listings or text/booking screens, not venue photos. These are not represented as the supplied screenshots. Copyright remains with the source owners; no separate reuse license is claimed.

## Optional real maps and genuine blockers

`VITE_MAPBOX_TOKEN` gates a lazy Mapbox GL JS v3 Standard map with district markers,flyTo and Tokyo-time light preset. Without a token no Mapbox request is made. This integration is type/build checked but not credentialed-runtime verified.

Creating/configuring credentials, billing and quota changes require separate per-action approval. No credentials were created and no billing enabled. Public client keys injected through Actions secrets become visible in built JavaScript and network requests. Secrets storage does NOT hide browser tokens. Apply least privilege, actual provider URL/referrer restrictions and appropriate quotas before use.

Google Photorealistic3D Tiles, Google attribution overlay and cinematic real-Tokyo intro are NOT active or implemented. They need an authorized billed API configuration plus a separately tested renderer integration. Do not mislabel the schematic city as Google3D imagery.

No licensed Rive file, district ambient recordings or neon-alley splat was supplied, so these are not faked. The authored HTML/CSS UI and original synth chime replace those optional presentation layers. No claim of FWA/Awwwards readiness is made. Real iPhone/Android cellular, Lighthouse and shader/performance results must be established separately.

## Updating a booking

Edit the corresponding public entry in `public/data/bookings.json`. Set `booking_status` to `booked` and public `confirmation.date` (`YYYY-MM-DD`) and `time` (`HH:MM`, JST). This file overrides place status. Commit to `main`; Actions redeploys. Never put private confirmation identifiers in this public file. Booking links open the official/provider page; using the guide does not purchase anything.

## Source references

- Brand reference: https://vessel-archive.com/ and supplied Vessel Archive brand-guide assets. Font files: Archivo,Instrument Serif,Martian Mono. Neutral mark is not recolored or recreated.
- Vite Pages deployment: https://vite.dev/guide/static-deploy.html#github-pages
- Mapbox Standard configuration: https://docs.mapbox.com/mapbox-gl-js/guides/migrate/
- Google3D Tiles prerequisites: https://developers.google.com/maps/documentation/tile/3d-tiles
- R3F/WebGPU implementation notes: `docs/visual-layer.md`

## Phone clarity revision

Places open first, with neighborhood, search, category, direct Maps and save. Nearby geolocation remains available with an explicit permission prompt and manual fallback. My day keeps suggested sets, grouping, date selection, conflict warnings, direct Maps, shared plans and a collapsible neighborhood travel matrix. Bookings is a separate priority list. A non-intercepting schematic 3D city remains behind the interface, progressively loaded after core content. Coarse-pointer phones use low-power rendering; unavailable GPUs and reduced motion use a dimensional isometric static fallback.

Design references: [Apple tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [WebKit reduced motion](https://webkit.org/blog/7551/responsive-design-for-motion/).

## Hybrid and practical-trip additions

- Restored a large authentic Shibuya photo hero while keeping separate labeled views and descriptive place rows.
- All94 records have plain-language cuisine/dish, shopping type or attraction explanations in `descriptions.json`.
- `recommendations.json` adds five area-based sample day menus, five cycling options, four additional tourist stops and an optional weather-dependent Kawaguchiko/Fuji day. These are ideas, not bookings. New options remain separate from the original94.
- Displayed clock times use AM/PM. Stored opening hours and booking data stay24-hour for parsing. Source screenshots retain their original publisher content.
- `home.json` records Japan GSI's exact-address geocode (an address point, not a surveyed doorway). `home-distances.json` has approximate straight-line distance for all94 original places plus actual-address transit/walking links. Never interpret these distances as road distance or travel time. New options have route links but no invented coordinates or distance.
- Official/source-site screenshots were captured independently and individually visually reviewed. `screenshots.json` records source, capture date and kind, distinct from venue photos. Empty/blocked captures are not represented as successful venue imagery.
- A real iPhone screenshot exposed a fixed-bottom navigation overlay failure. Mobile navigation is now a compact in-flow sticky top row with no bottom safe-area expansion. Narrow desktop-browser QA is not a substitute for a fresh iPhone verification.

## Final visual coverage

The reviewed source-capture manifest contains103 entries: all94 original places plus nine new cycling/tourist options. There are101 genuine browser captures and two exact PDF-rendered excerpts,4,290,582bytes total. These are source captures, NOT103 venue photos.29 separately sourced official-site previews remain available, with real venue photographs preferred where present. Historical HUB listing, operator press releases and shared rental overview caveats are displayed in details. Every source-capture file is SHA-256 checked in CI. The original139.5MB supplied screenshot archive remains unavailable through the authorized transfer route.
