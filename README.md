# Har Har Har

A mobile-first puzzle arcade for adults. Midnight Arcade pairs deep navy with violet and aqua, rounded tiles, and a restrained glow.

## First release

- Game hub with 2048 and Block Flux, favourites, and separate top-five previews.
- 2048 with swipe, keyboard, and on-screen controls; sound is optional and muted by default.
- Automatic device-local game recovery, editable player nickname, eight selectable profile icons, and personal bests. A random device token authorizes profile edits; only its hash is stored on the server. Names and icons update on existing leaderboard entries; score snapshots cannot overwrite a newer profile edit.
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

28 automated tests cover random starting layouts across 50 seeds, whole-rack playability, row/column intersections, rotation, collisions, score streaks, continuous play beyond the former line targets and placement cap, game over, deterministic replay, top-five grouping by game and profile, current profile names/icons, qualification tie rules, API URL selection and CORS. TypeScript and both static and Worker builds are checked. Browser QA covers tap placement, rotation, drag-and-drop at a 390px viewport, line clears, rack refill, saved-game restoration, profile edits reflected on existing scores, automatic publication, rank notification, and continued play after qualifying.

Endless runs use rules v2 and a separate device save key. Score verification advances a server-owned checkpoint in bounded batches of at most 4,000 placements, so long runs do not hit a lifetime upload limit. Retries and reloads reconcile the verified prefix; divergent tabs fail safely. The server replays every placement, never trusting a submitted board or score. Rules v1 replay remains server-only for already open clients during rollout. The existing Block Flux leaderboard is retained.
