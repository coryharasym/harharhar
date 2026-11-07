# Har Har Har

A mobile-first puzzle arcade for adults. Midnight Arcade pairs deep navy with violet and aqua, rounded tiles, and a restrained glow.

## First release

- Game hub with a featured 2048 game, favourites, and a live leaderboard preview.
- 2048 with swipe, keyboard, and on-screen controls; sound is optional and muted by default.
- Automatic device-local game recovery, player nickname, and personal best.
- Shared all-time and rolling seven-day leaderboards. Scores are replayed on the server from a registered seed; one submission per run. Submitting finishes that run.
- Continued play after reaching 2048, game-over handling, and confirmation before replacing a run.
- Clearly labelled future games: Word Hunt and Pipes. These are placeholders, not playable games.

## Development

Requires Node 22.13+ and pnpm (the exact version is in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The interface uses HTML/CSS, React, and TypeScript, rendered by Vinext. The shared leaderboard runs on a Cloudflare Worker with D1. GitHub holds the source; GitHub Pages alone cannot run the leaderboard API.

```sh
pnpm test
pnpm typecheck
pnpm build
```

After the first local build, apply the local database schema once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_perfect_magneto.sql
```

Production migrations are applied by Sites during publication. The hosting identity is retained in `.openai/hosting.json`; no credentials are stored in source. Browser preferences and in-progress games stay on each device. Submitted scores persist in the shared database. Nicknames are not authenticated or reserved accounts, and the leaderboard is intended for friendly competition, not prizes. Replay verification checks scoring consistency; it does not prevent bots from playing valid games.

Online runs can be submitted within 30 days. If the API is unavailable, the player can start an explicitly labelled practice run; practice scores cannot be submitted. The UI includes loading, error, empty, and retry states.

## Review process

`main` was initialized separately. This implementation is on `feat/midnight-arcade-2048`. Merging requires Cory's explicit approval. Hosting a private review build does not merge this branch or make the site public.

## Validation

Seven game-engine tests cover one-merge-per-tile rules, all directions, invalid moves, spawning, deterministic replay, game over, and initial board generation. Browser QA covers moving and merging, saved-game recovery, score submission, mobile layout, and swipe input at a 390px viewport.
