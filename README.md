# Har Har Har

A mobile-first puzzle arcade for adults. Midnight Arcade pairs deep navy with violet and aqua, rounded tiles, and a restrained glow.

## First release

- Game hub with 2048 and Block Flux, favourites, and separate top-ten previews.
- 2048 with swipe, keyboard, and on-screen controls; sound is optional and muted by default.
- Automatic device-local game recovery, editable player nickname, eight selectable profile icons, and personal bests. A random device token authorizes profile edits; only its hash is stored on the server. Each leaderboard entry keeps the player name saved at its first publication, including when the same run improves. New entries use the current profile name. Icons still reflect the current profile. Score submissions cannot overwrite a newer profile edit.
- Shared all-time and rolling seven-day top-ten leaderboards, with separate entries for each finished run. Qualifying final scores publish automatically after server replay verifies game over; unfinished, paused, and abandoned runs do not publish. The server verifies every score by replaying the registered run, and later snapshots update the same record only when they improve it.
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

28 automated tests cover random starting layouts across 50 seeds, whole-rack playability, row/column intersections, rotation, collisions, score streaks, continuous play beyond the former line targets and placement cap, game over, deterministic replay, top-ten grouping by game and run, fixed entry names and current profile icons, qualification tie rules, API URL selection and CORS. TypeScript and both static and Worker builds are checked. Browser QA covers tap placement, rotation, drag-and-drop at a 390px viewport, line clears, rack refill, saved-game restoration, profile renames leaving published entry names unchanged, final-score publication, rank notification, and no publication before game over.

Endless runs use rules v2 and a separate device save key. Score verification advances a server-owned checkpoint in bounded batches of at most 4,000 placements, so long runs do not hit a lifetime upload limit. Retries and reloads reconcile the verified prefix; divergent tabs fail safely. The server replays every placement, never trusting a submitted board or score. Rules v1 replay remains server-only for already open clients during rollout. The existing Block Flux leaderboard is retained.

## Midnight Circuit · phase-two gameplay review

Neon Dodger is the third game in the deck and opens at `#tunnel`. Online flights receive a server seed and rules version 3. Steering is replayed on the server in bounded checkpoints; score, pickups, hull and survival time come from that replay. Each game has a separate public top ten, with one entry per finished flight. Qualifying final scores publish after verified hull loss, then announce rank. The player can correct the name for that score once. New offline flights are practice runs. Existing competitive flights save their run ID and steering on the device and retry score sync after reconnecting. Replacing a competitive flight waits for successful sync. Rules-v3 review saves without a server ID remain practice runs.

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

The card uses `public/neon-dodger-preview.webp`, a transparent, softly beveled illustration of the Neon Glider with lavender wings, mint exhaust ribbons, offset rounded-square portals, an amber obstacle and energy crystals. The rounded forms and purple/teal palette match the 2048 and Block Flux card art. The committed 750×1025 WebP is copied by both builds and included in the offline cache; the hub runs no Three.js scene for this card. CSS uses `object-fit: contain` without edge masks to preserve the illustration's silhouette. The older preview scripts remain available for gameplay-reference renders, but do not generate the current stylized card artwork.

## Maple Merge · Phases 1–4 gameplay review

Review at `#maple`. This isolated, lazy-loaded route adds no card to the live game deck and makes no Maple Merge API/leaderboard writes. Existing games, profiles and score contracts are unchanged. The approved Phase 1 gravity, radii, friction, impulses and merge movement are retained; the only physics-event addition is parent IDs to trace linked reactions. Gameplay is layered in `lib/maple-game.ts` above `lib/maple-physics.ts`.

The eleven illustrated pieces run from Maple Seed through Moose. Only the first five drop directly with seeded weights 30/25/20/15/10 percent. The HUD shows the current and one next piece. The preview advances only on a successful drop; rejected releases do not change the queue or clear chain eligibility. Fresh runs use fresh seeds. Touch, mouse, keyboard and the explicit Drop button remain supported.

A merge into numbered tier n earns n × (n + 1) / 2 base points: Acorn 3, Pinecone 6, Chipmunk 10, Squirrel 15, Hare 21, Goose 28, Beaver 36, Fox 45, Bear 55 and Moose 66. Linked descendant merges within the reaction earn ×2, ×3, then a capped ×4. Unrelated merges get base points. Each successful new drop starts fresh reaction lineages; no points for placing or waiting. The HUD shows the current reaction bonus and highest chain.

The danger line is logical y=145. A released piece becomes eligible once its top has entered below the line or after a maximum one-second entry grace, whichever happens first. The held aiming piece is not a physics body and never counts. An eligible protruding piece starts one shared 360-tick / three-second timer. The warning resets only when every eligible piece clears the line. Replacing the offending piece or merging above the line cannot renew grace: merged bodies inherit the earliest entry time and eligibility of either parent. Pause and backgrounding freeze physics and the warning. Game over freezes the bowl and score, prevents new drops and displays final score, highest piece, best chain, Play Again and Back to Games.

Creating a Moose awards its merge points and shows a nonblocking milestone while play continues. Two Moose collide without merging or awarding points. The expandable practice test bench can replace the bowl with any matching pair or a stacked-Moose danger scenario. These display TEST SCORE and do not represent normal seeded runs. Start a new run to return to normal play.

Phase 3 automatically saves the normal bowl to `harharhar.maple.save.v1` in localStorage every second while playing, after successful drops, on pause/background/pagehide and on route unmount. The versioned, bounded snapshot preserves all solver positions and velocities, interpolation state, RNG/current/next queue, scores, ancestry, entry eligibility, danger timer, milestones and final results. Returning restores an independent paused bowl, with an explicit Resume saved game action; wall-clock time away never advances play. Finished runs reopen at their results. Starting a fresh run confirms replacement and retains the device personal best. Practice never overwrites normal progress or personal best and offers Return to my saved bowl. Another tab’s storage update pauses the stale view and blocks writes until Load latest bowl or a confirmed fresh run, preventing stale tabs from overwriting progress. Invalid/incompatible saves are rejected safely; storage denial/quota failures display an honest warning while allowing play. Progress is limited to the same browser and origin; it does not sync between devices, Sites review and GitHub Pages, and clearing browser data removes it. Phase 4 adds the original character art, matching bins and audio described below; backend/profile/leaderboard integration is Phase 5. No leaderboard rows are created. Fixed-tick replay reconstructs the weighted queue, physics, score, chains and danger from seed and timestamped drops. Same-runtime equality passes; cross-browser/server determinism remains a required future verification before competitive launch.

Validation includes the original ten physics tests and thirteen gameplay tests: weighted distribution, preview stability, base/linked/capped/unrelated scores, grace expiry, exact danger duration and clearance, switching offenders, inherited merge eligibility, pause/game-over freeze, continued Moose play, practice/reset state and full-game replay. Seven snapshot/storage tests cover complete round-trip and continued-simulation equality, timer/ancestry preservation, frozen final results, practice isolation and retained personal best, unavailable storage, invalid/version-mismatched/unbounded data and independent paused restoration. The full suite has 109 passing tests. Browser checks cover drops and preview, scoring, Moose creation, danger/pause/results, reset and responsive phone widths. Phase 3 browser checks include reload/paused recovery, practice-to-normal recovery, personal best and stale-tab protection. Regenerate Pages/PWA artifacts with frontend source and await explicit approval before merging.


### Maple Merge Phase 4 · selected Velvet Pals design

Velvet Pals is the selected game artwork, paired with the original Woodland Soft honey-maple bin. The eleven tiers are Maple Seed, Acorn, Pinecone, Chipmunk, Otter, Snowshoe Hare, Canada Goose, Beaver, Red Panda, Black Bear and Moose. Otter replaces Squirrel at tier 5 and Red Panda replaces Red Fox at tier 9. Their radii, merge points, drop weights, solver behaviour and saved tier IDs are unchanged, so existing bowls remain compatible.

`public/maple-art/velvet-v2.webp` is the production atlas. It was edited using the built-in image generator: preserve the existing four-column/three-row Velvet Pals atlas, replace only row 2 column 1 with a chestnut otter with a cream whiskered muzzle and small round ears, and row 3 column 1 with a rust-red panda with white eyebrow/cheek markings, round cream-edged ears and a ringed tail. Preserve the other nine characters, plush fur, top-left lighting, circular bodies and exact cell positions. The original PNG output was encoded to alpha WebP for web delivery. A versioned asset path prevents an existing offline cache from showing the earlier animals. The PWA build includes the atlas content in its cache revision.

The original material comparisons remain in source but are no longer exposed as selectable looks. All new and existing appearance preferences resolve to Velvet Pals while preserving music/effects/mute preferences. Earlier `?look=` review URLs normalize to Velvet Pals. The appearance panel shows Otter, Red Panda and Moose, the same art used in the bowl, HUD and merge ladder. The practice-only sample bowl uses those three characters and keeps normal progress and best score separate. Frame centres/radii for the two new portraits were calibrated to the revised art; decoration never affects collisions or the danger line. Canvas textures are prepared once per mount, with matching alpha transfer in SVG previews; no per-frame pixel processing is needed.

Merge squash, rings, seven leaf-like sparkles and floating score/chain feedback follow simulation ticks; pause freezes them and reduced motion removes them. The Moose milestone remains nonblocking. On phones the game stays first, with a link to the woodland/audio panel below it.

`lib/maple-audio.ts` synthesizes an original 76 BPM eight-bar chill electronic loop with soft seventh/ninth chords, sparse plucks, mellow bass and a quiet beat. Drop, merge, chain, danger, Moose and game-over cues are distinct. Independent music/effects volumes and mute persist under `harharhar.maple.preferences.v1`. Audio is gesture-created, restored bowls stay silent, old awards do not replay, pause/background/stale-tab handling stops sound immediately, and navigation closes the context. Game over keeps only a short effect tail. Denied audio never interrupts gameplay; voices are bounded and no external art/audio requests are needed.

Validation: 119 tests cover the physics/game/save contracts, exact sprite body calibration, WebP dimensions/alpha, selected-look preference migration, normal/practice isolation, sample settling, unchanged replacement tier/radius/points, reduced motion and audio lifecycle. TypeScript and Pages/Worker builds pass. Browser review verifies the new art and names, sample-bowl play and preserved normal progress. Shared rankings and the main-deck launch remain Phase 5; await explicit approval before merging.


### Alpine Morning background

The selected sunny-green reference is a full-bleed plush mountain/forest/stream scene in `public/maple-art/alpine-morning-v1.webp`, created with the built-in image generator from the approved Alpine Morning concept. The production prompt removed all bin/frame, animals and guides while preserving blue-white snowy mountains, fresh sage/mint evergreen forest, green mossy banks, cream flowers and a winding turquoise stream under a pale blue morning sky. The source PNG was encoded to optimized WebP for web delivery.

The scene sits behind the existing sprites and transparent honey-maple bin frame. It is centre-cropped to cover the fixed bowl, with no influence on collisions or scoring. The previous gradient bin remains the loading/error fallback. Dark teal guides and deep amber/coral warnings maintain contrast over the light sky; a narrow dark footer preserves the control hint. Images are cached per mount and loaded from the same relative asset directory on both hosts. Both builds include the scenery in the existing PWA precache/content revision. Game state, controls and save versions are unchanged.


## Maple Merge · Phase 5 family leaderboard

Maple Merge is the fourth game in the fanned deck, including favourites and both leaderboard selectors. The selected art is Velvet Pals with Otter and Red Panda, Woodland Soft bin and the simplified Misty Mint Valley scenery (`misty-mint-v1.webp`). The existing device profile, editable icon/name and top-ten notification are shared across games. Published names remain the original score-entry snapshot; profile edits apply to new entries. Rankings keep one entry per finished bowl, including multiple bowls by the same player, with score descending, fewer drops, then earlier publication as tie breaks.

New online bowls receive a server seed/run ID. Only successful drops enter a compact timestamp/position history; aim positions are recorded to 0.001 bowl units before physics runs. Browser and server use the same elementary square-root distance operations. The API replays at most 1,200 fixed ticks per request, validates drop bounds/cooldown, RNG, chains, danger and elapsed-time allowance, and persists a compare-and-swap checkpoint before considering a score for publication. The server calculates points; client scores and saved physical positions are never trusted. Hashes identify a matching history prefix, rather than authenticating scores. Batches catch up after offline play, retries and pause/resume, including zero-point progress. No database migration is needed: existing text game IDs and checkpoint columns support Maple Merge. Other games retain their scoring paths.

Normal saves now optionally include online run identity and drop history. Older bowls remain playable local bowls, with a prompt to start a new bowl online to compete. Offline-created and sample bowls do not publish. Existing online bowls can reconnect and retry their history. Scores require a player name and an internet connection; leaderboard errors show a retry action without interrupting play. Physics and audio stop when the profile dialog opens. Shared scores use the same API origin on GitHub Pages as the other games; merging remains a separate explicit approval.

Validation includes incremental replay equality through chains/game over and save/resume, malformed input, time/batch limits, conflict protection and checkpoint isolation. Browser review checks the game card, online bowl creation, automatic rank-one publication, leaderboard navigation, shared profile editing and immutable published names in the local test database. Safari/iPhone hardware verification remains part of family playtesting.

## Final-score publication

All four leaderboards rank finished runs rather than one best per profile. Active checkpoints sync for verification but never create a score row. After verified game over, a qualifying run publishes automatically using the current player name. The end screen shows that the score is already published and offers a one-time name correction. Done, closing the prompt, navigating away, or starting another game leaves the score standing. There is no Skip publishing option.

An authenticated PATCH changes only that score's name. It never edits the device profile, score, ranking timestamps, or other entries. A conditional database update consumes the correction exactly once, even with concurrent requests; retries of the same saved name are idempotent. New finished entries explicitly set name_edited=0. Migration 0003 defaults existing rows to 1, preserving historical names. Restarting waits only for score synchronization, never for a name decision.

## Threes · complete game

Threes is the fifth game in the fanned deck, favourites and both Top 10 selectors. Open `#threes` directly. Its Midnight Arcade design shares navy surfaces, violet and aqua accents, light text and Space Grotesk headings with the rest of HarHarHar.

Tiles move one square per swipe. 1+2 makes 3; identical values from 3 onward double, with at most one merge per tile per move. The incoming tile enters the opposite edge in a lane that changed. Only valid moves consume the next tile and RNG. Shuffled twelve-tile bags contain four each of 1, 2 and 3; nine tiles start a board. No larger bonus tiles spawn. Live score is the sum of tile point values: 1/2 contribute zero; 3/6/12/24 contribute 3/9/27/81. The game continues until no legal move remains.

`lib/threes-session.ts` wraps the engine with a deterministic 32-bit RNG, seeded opening, compact direction history and replay verification. A server-issued run receives its own identity. The API verifies bounded batches of at most 4,000 moves, committing an offset/hash/state checkpoint with compare-and-swap. It calculates score, highest tile, move count and game over itself; client boards, scores and final flags are ignored. Replay rejects invalid directions, no-op moves and moves after game over. Checkpoints reuse the existing runs column; no new database migration is required. Active runs never create score rows. Qualifying finished games publish automatically under the shared device profile, one entry per run. The existing one-time entry-only name correction, rank notification, all-time and seven-day Top 10 apply to Threes. PATCH preflights now support that name correction from GitHub Pages.

Versioned local saves under `harharhar.threes.save.v1` retain board, bag, next tile, RNG, move history and online run identity after each move. High score is separately retained under `harharhar.threes.best.v1`. Restarting an active game asks for confirmation and preserves the high score. Restoring a completed run shows its final score and retries publication idempotently. Other-tab saves pause stale views until Load latest board or an explicitly confirmed fresh game. Malformed, incompatible and oversized saves are rejected; unavailable storage shows an honest warning while allowing play. Local progress belongs to the same browser/origin and is not shared between the review Site and GitHub Pages. Clearing browser data removes it. New offline games remain practice runs; online-created runs may resume offline and publish after reconnection. Restarting or leaving a finished online run waits for its final score to sync so an error cannot silently discard it. Runs expire server-side after 30 days.

Validation includes directional movement/merge/bag tests, independent seeded replay across bounded checkpoints, invalid/after-death/conflicting histories, complete saved-state and continued-simulation equality, corrupted saves, profile ownership, final-only publication, multiple runs per player and one-time immutable name edits. All 165 repository tests, TypeScript, and both Pages and Worker builds pass. Local browser QA verifies saved board/preview recovery, shared profile editing, no publication while active, a complete online game, automatic final publication, a score-only name correction, completed-run recovery, retained high score, stale-tab handling, keyboard input and game-over navigation. Responsive checks include 320px/390px phone widths and a 600×390 landscape viewport with the full board and controls visible. The private hosted API smoke check is blocked by its sign-in gate; authenticated hosted play remains for owner review. Regenerate tracked Pages/PWA assets with `pnpm build:pages`. Physical iPhone Safari playtesting remains a final device check.

The private review Site uses its own database. Its scores and device saves are separate from the live arcade. Publishing the production Worker and merging the GitHub Pages branch remain the release steps after Cory's approval.

### Threes sound effects

Short original Web Audio cues accompany valid swipes, merges and blocked moves. Merge chimes rise gently with tile value; simultaneous merges add one soft upper note. A sound toggle beside New game remembers its preference under `harharhar.threes.sound.v1`. Sound is enabled by default and starts only after a move or toggle gesture. No music, downloaded audio or autoplay is used. Muting, profile/restart dialogs, stale-tab state, backgrounding and route cleanup stop active voices; returning to play resumes audio on the next gesture. Voices are bounded at twelve and unsupported/denied audio leaves gameplay available. Six audio tests cover lazy creation, mute, merge pitch and envelopes, blocked feedback, voice limits and lifecycle cleanup.

### Shared mobile game controls

All five games use the same in-page Leaderboard / New game action row and fixed Games / Scores / Profile navigation at widths up to 900px. Only the bottom navigation stays fixed; game actions scroll beneath the board. Safe-area padding and reserved page space keep the last controls reachable. Scores opens the current game's leaderboard; navigation pauses and saves standalone games and waits for finished competitive score synchronization. Restart confirmations retain each game's existing rules. Maple Merge uses arcade title/score cards and sizes its bowl to the remaining portrait viewport. Desktop actions remain in the page.

Validation: 165 game/replay/save/audio tests, TypeScript, Worker build and Pages build. Browser checks cover phone widths of 320 and 390px, landscape controls, leaderboard selection, profile access, and restart flows. The QA browser lacks WebGL 2, so Neon Dodger flight rendering still needs a device check. Localhost previews unregister only this app's development service worker to avoid stale development CSS; production offline caching is unchanged.

## Block Flux · progressive endless racks (rules v3)

Fresh games progress by completed racks: Finding flow for racks 1–4, Building for 5–10, Planning for 11–18, then Expert. Every sixth completed rack deals a Breather using the gentle shape mix. Difficulty stops increasing at Expert. Rotations remain unlimited and scoring is unchanged. The rack counter and phase appear beside Rotate.

Weighted shape selection shifts toward larger and awkward pieces, with early/breather candidates favoring more available placements and later candidates favoring fewer. A bounded, occupancy-mask solver checks all piece orders and unique rotations, clearing rows and columns between placements. Only proven candidates are accepted. If random candidates fail validation, a constructive fallback places three feasible pieces on a private board and shuffles their order. The player receives the pieces, not the witness. Placement choices can still block the solution and end a run; racks are guaranteed only at the moment they are dealt.

Rules v2 remain frozen in `lib/blocks-v2.ts`. Old saves without a rules marker restore as v2. New saves record v3, and server run creation/checkpoint verification dispatch by the run's stored rules. The completed-rack count lives in checkpoint state, so stripping verified move history cannot reset progression. Existing leaderboard entries and personal bests remain in place; no database migration or score reset is required.

Validation includes 1,200 solved refills across all stages, larger-piece distribution and breather checks, a clear-before-fit fixture, losing placement choices, deterministic v2 restoration and v3 batched replay, plus final-score publication for v1/v2/v3. Browser QA checks new-game placement, unrestricted rotations, updated rules and reload recovery. Physical iPhone playtesting remains useful for tuning the pacing.
