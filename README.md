# Har Har Har

A mobile-first puzzle arcade for adults. Midnight Arcade pairs deep navy with violet and aqua, rounded tiles, and a restrained glow.

## First release

- Game hub with 2048 and Block Flux, favourites, and separate top-five previews.
- 2048 with swipe, keyboard, and on-screen controls; sound is optional and muted by default.
- Automatic device-local game recovery, editable player nickname, eight selectable profile icons, and personal bests. A random device token authorizes profile edits; only its hash is stored on the server. Each leaderboard entry keeps the player name saved at its first publication, including when the same run improves. New entries use the current profile name. Icons still reflect the current profile. Score submissions cannot overwrite a newer profile edit.
- Shared all-time and rolling seven-day top-five leaderboards, with one personal best per device profile per game. Qualifying scores publish automatically while playing; notifications announce entry and improved rank without ending the run. The server verifies every score by replaying the registered run, and later snapshots update the same record only when they improve it.
- Continued play after reaching 2048, game-over handling, and confirmation before replacing a run.
- Swipeable game-card deck with previous/next buttons, direct card selection, keyboard arrows, and an animated Shuffle button. The phone remembers deck order; favourites filter the playable deck. Future-game placeholders have been removed.

## Development

Requires Node 22.13+ and pnpm (the exact version is in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development entry serves the shared client UI and local Worker APIs from one server, so the tracked production Pages HTML cannot shadow the development route.

The public homepage is https://coryharasym.github.io/harharhar/. A standalone Vite build serves the existing React/HTML/CSS interface from GitHub Pages. The leaderboard API runs separately on the public Worker at https://har-har-har.cooory.chatgpt.site with D1 storage. The server-rendered version is retained for API hosting and development.

```sh
pnpm test
pnpm typecheck
pnpm build
```

After the first local build, apply the local database schema once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_perfect_magneto.sql
```

Production migrations are applied by Sites during publication. The hosting identity is retained in `.openai/hosting.json`; no credentials are stored in source. Browser preferences and in-progress games stay on each device. Submitted scores persist in the shared database. Profiles are tied to one browser; clearing browser data loses that editing identity. Nicknames are not reserved accounts, and the leaderboard is intended for friendly competition, not prizes. Replay verification checks scoring consistency; it does not prevent bots from playing valid games.

Online runs can be submitted within 30 days. If the API is unavailable, the player can start an explicitly labelled practice run; practice scores cannot be submitted. The UI includes loading, error, empty, and retry states.

## GitHub Pages publication

The existing Pages configuration publishes `main` at the repository root. `index.html`, `assets/`, `favicon.svg`, and `.nojekyll` are generated and tracked so the current branch-based setup works without changing repository settings.

```sh
pnpm build:pages
```

Run this after frontend edits and commit the regenerated files with the source. CI rebuilds the Pages files and rejects stale output. Assets use the `/harharhar/` base path. Hash navigation keeps Games, 2048, and Scores available without server rewrites.

The static entry configures the public API host; API requests do not point at GitHub Pages. The Worker allows cross-origin requests from exactly `https://coryharasym.github.io`, handles JSON preflights, and does not use cookies for Pages requests. Other browser origins do not receive cross-origin access. Nickname-based gameplay and qualifying scores are published automatically; no ChatGPT login is needed to play.

## Review process

Changes are developed on feature branches. Merging requires Cory's explicit approval. The GitHub Pages compatibility update was explicitly approved for implementation and merge.

## Block Flux

An 8×8 block-placement puzzle inspired by the supplied examples, with newly generated starting layouts rather than fixed copies. The seeded generator creates clustered layouts with no pre-completed lines, then searches for a valid sequence that places the entire opening rack. The seed and placement history restore the exact game and let the server verify scores.

Select and tap a cell to place the piece’s top-left corner, or drag with a lifted ghost and valid/invalid board preview. Rotation is free. Keyboard controls support 1–3 to select a piece, R to rotate, arrows to move board focus, and Enter to place. All remaining pieces and rotations are considered before declaring game over. Three used pieces refill the rack.

Scoring: 5 points per placed cell, plus 100 × n × (n + 1) / 2 for clearing n rows/columns simultaneously. Consecutive clearing placements add 25 × (streak − 1) × n. Play is endless from the first placement: no levels, line targets, stage bonuses, timer, board resets, or placement cap. Only a rack with no fitting piece in any rotation ends the run. Remaining blocks stay fixed after a clear.

Qualifying scores publish automatically under the saved phone profile. Profiles without a name are prompted to set one before publishing. A short debounce batches moves; a failed sync shows Retry, and starting a new run flushes the current score first. Network availability is required to publish. In-progress game histories remain saved on the device. This is friendly competition, not authenticated cross-device account sync.

## Validation

28 automated tests cover random starting layouts across 50 seeds, whole-rack playability, row/column intersections, rotation, collisions, score streaks, continuous play beyond the former line targets and placement cap, game over, deterministic replay, top-five grouping by game and profile, fixed entry names and current profile icons, qualification tie rules, API URL selection and CORS. TypeScript and both static and Worker builds are checked. Browser QA covers tap placement, rotation, drag-and-drop at a 390px viewport, line clears, rack refill, saved-game restoration, profile renames leaving published entry names unchanged, automatic publication, rank notification, and continued play after qualifying.

Endless runs use rules v2 and a separate device save key. Score verification advances a server-owned checkpoint in bounded batches of at most 4,000 placements, so long runs do not hit a lifetime upload limit. Retries and reloads reconcile the verified prefix; divergent tabs fail safely. The server replays every placement, never trusting a submitted board or score. Rules v1 replay remains server-only for already open clients during rollout. The existing Block Flux leaderboard is retained.

## Midnight Circuit · phase-two gameplay review

Neon Dodger is the third game in the deck and opens at `#tunnel`. Online flights receive a server seed and rules version 3. Steering is replayed on the server in bounded checkpoints; score, pickups, hull and survival time come from that replay. Each game has a separate public top five, with one personal best per profile. Qualifying scores publish automatically and announce rank; published names remain fixed. New offline flights are practice runs. Existing competitive flights save their run ID and steering on the device and retry score sync after reconnecting. Replacing a competitive flight waits for successful sync. Rules-v3 review saves without a server ID remain practice runs.

The approved Follow camera keeps the ship near the bottom while turning through the full circle. Rendering interpolates fixed 60 Hz positions at the display refresh rate, uses the same sampled angle for ship and camera, and eases bank through direction changes. Steering velocity is retained on frames without a simulation tick. Recycled tunnel sections retain their world identity so panel shades and neon phases do not pop at each six-metre wrap. Tunnel instances rebuild only at section changes; a shared parent translates the whole tunnel between them, avoiding 1,312 per-instance matrix writes each animation frame. Neon rings use a single, slightly thicker surface rather than overlapping additive glow shells. Thin neon/rail/obstacle-trim details fade continuously from 45m to 125m using the existing fog-depth varying, with depth testing retained and depth writes disabled. Metallic highlights are broader and more muted to reduce shimmer during sustained rotations; speed/steering and collision rules are unchanged. A 0.35–240m camera depth range and polygon offset improve separation of thin obstacle trim. Warning sectors use a continuous amber-to-coral fade with transparent depth writes disabled rather than rapid opacity oscillation. Pointer releases on the turn buttons no longer add a second click nudge; keyboard activation still nudges. On the canvas, displacement from the touch-down point now controls signed turn speed rather than a capped destination angle. One swipe followed by a stationary hold continues through full rotations; a longer swipe increases speed, returning to the origin dead zone stops turning, and lifting stops steering. Only the initiating pointer can move/release that gesture. Sensitivity scales speed response and pause/background clears it. Tests run a single swipe with no subsequent movement events for ten seconds/five revolutions in both directions. These are presentation/input fixes with no rules or save-key change. Steady camera and sensitivity remain in Controls & audio. The top HUD uses bounded portrait rows for hull, score, distance, multiplier and crystals. Reward feedback lives above the ship, outside the score. Control taps reject swipes (including swipes that return to their starting point). Turn buttons use native non-passive touch handlers, suppress selection/callouts/context menus and track the initiating finger independently of pointer capture. A held finger has no angle/time cap; unrelated contacts and pointer cancellations cannot release it. Lift, actual touch cancellation, pause and leaving the page clear steering. Mouse/pen retain matching-pointer capture. Tests hold both directions for ten seconds through five full rotations. Transient window focus changes release steering without opening Pause; page visibility, navigation and the deliberate Pause button still pause and save. The interceptor has a faceted fuselage/cockpit, layered swept-wing armor, inset cyan navigation strips, panel seams, stabilizers, twin engine nacelles, cooling vents and recessed ion cores. Its original silhouette size and collision rules are retained.

Three hull points end a flight on the third unshielded hit. Damage pulses the ship coral, emits a short expanding ring and sparks, displays “−1 HULL” beside the ship and updates the hull icons. The final impact fades the ship before displaying results. A shield hit is cyan, consumes the shield and preserves hull. Both hits grant 75 ticks (1.25 seconds) of protection. Optional sound and supported-device vibration default off. Reduced motion removes the expanding ring, sparks and blinking while retaining ship tint, text and hull icons.

Survival awards 10 points/second, crystals 25 and close passes 10. Five scoring actions reach ×2, ten reach ×3; the multiplier applies to crystals and near misses. Four seconds without an action or hull damage resets the streak. Shields last at most 12 seconds and absorb one hit; magnets attract crystals within a wider angular radius for six seconds. Powerups refresh, never stack duration or restore hull. Near misses during protection do not award bonuses.

Seeded layouts provide gates, blocks, moving openings, staggered sections and warning pulse sectors. Four-barrier alternating gates debut at obstacle 24, double wall blocks at 36, a six-barrier spiral at 48 and a rotating-gate section at 60. From 72, four-barrier patterns cycle with four-barrier recovery sections. Double sectors preserve two escape routes and are shown on the compass. The speed cap and 38-metre spacing remain unchanged; all patterns are simulated through full flights for steering reachability. Speed ramps from 17 to a capped 29 m/s over 75 seconds. Barriers remain 38 metres apart, providing over a second to cross half the tunnel even at maximum speed. Collectibles follow the route between openings. The fixed 60 Hz model interpolates the ship angle at each crossing and evaluates each barrier/item once.

Obstacle rules v3 use new local save/best keys so earlier review histories are never reinterpreted under changed obstacles. A notice invites a fresh flight; earlier review data remains on the phone.

An original Web Audio score loops eight bars at 84 BPM with soft chord pads, bass, a sparse melody, kick and light percussion. Distinct synthesized cues cover crystals, close passes, multiplier increases, shield/magnet pickups, shield absorption, hull hits and game over. A quiet twin-oscillator engine hum responds to speed/steering. Music and effects have independent persisted levels, plus a quick master mute. Audio is created/resumed by Enter/Resume, suspended on pause/background, and closed on navigation. Fatal impacts retain a short sound tail, interrupted immediately if the page backgrounds. No music files, downloads or external audio requests are needed. Earlier effects-off preferences are respected.

Each flight records quantized steering for deterministic replay. The seed and steering history save every two seconds, on pause/navigation and game over. Reloads reconstruct the exact score, hull, combo and powers and restore paused; completed flights restore their results. A new flight replaces current progress but retains the local personal best. A newer save from another tab pauses the stale tab rather than overwriting it. Storage failure shows a visible notice.

Built with pinned Three.js 0.180.0, instanced metallic tunnel panels/ribs/lights, custom low-poly ship geometry, and bounded pools of barriers and collectibles. Rendering caps pixel ratio at 1.65; passed objects and navigation release GPU resources. Unsupported or lost graphics contexts show a reload/back recovery path.

Automated checks cover deterministic replay, health/death, shields, protection, scoring, multiplier thresholds/expiry, magnets, pickups, near misses, obstacle progression, speed caps, impact presentation and reduced motion. Actual ship vertices are projection-tested around the full orbit at three portrait aspect ratios in both camera modes. Existing puzzle/leaderboard tests also remain passing.

Verification limitation: the managed cloud browser reports its graphics renderer disabled and cannot create a WebGL context. The model, camera projection and builds can be verified here; rendered appearance, native touch feel and phone frame rate need the iPhone playtest.

## Home Screen app

The manifest uses relative scope/start URLs for both the Sites root and GitHub Pages `/harharhar/`. In Safari, use Share → Add to Home Screen and enable Open as Web App when shown. Re-add an older bookmark to pick up the icon and app launch behavior. Native safe areas keep controls clear of the status bar and home indicator.

Both builds generate a versioned service worker and precache list containing the app shell, game bundles and local icons. After an online visit completes installation, the app can reopen offline. Navigations try the network first; cached assets work offline. APIs and cross-origin requests are never cached. Public rankings still require a connection. Updates wait until existing app windows close. Browser storage holds profiles and progress; this is not cross-device account sync.

## Neon Dodger card artwork

The card uses `public/neon-dodger-preview.webp`, a transparent, softly beveled illustration of a lavender ship, mint thrusters, portal rings, an amber obstacle and energy crystals. The rounded forms and purple/teal palette match the 2048 and Block Flux card art. The committed 750×1050 WebP is copied by both builds and included in the offline cache; the hub runs no Three.js scene for this card. CSS uses `object-fit: contain` without edge masks to preserve the illustration's silhouette. The older preview scripts remain available for gameplay-reference renders, but do not generate the current stylized card artwork.
