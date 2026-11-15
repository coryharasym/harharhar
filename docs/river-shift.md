# River Shift — 36-puzzle collection

36 untimed rotation-only puzzles at `#river`. Tap a river tile for one clockwise quarter-turn and one move. Scenery has no channel and cannot affect the route; tapping scenery or a fixed endpoint does nothing. No tile swapping.

The source is always flowing. Only channels reachable from the spring fill turquoise. The light cap marks the first broken connection. Reach the ocean through every river tile to finish; early ocean arrival keeps play active and displays “Use every river tile”.

## Original introductory puzzles

| Puzzle | River tiles | Scenery | Verified minimum |
| --- | ---: | ---: | ---: |
| First turn | 2 | 12 | 1 |
| Follow the flow | 5 | 9 | 4 |
| Around the forest | 6 | 8 | 5 |
| Every river tile | 12 | 2 | 9 |

Puzzle 4 initially feeds six of twelve river tiles and reaches the ocean early. All layouts have independently enumerated full solutions. Minimums count clockwise turns, not free orientation changes.

Full collection: see [river-shift-puzzles.md](river-shift-puzzles.md).

## Rendering and interaction

Cobalt ceramic bodies share the same finish. Source outlet, ocean inlet, straight and elbow openings use one channel width of 24 SVG units in a 100-unit tile. Banks are centered at 38 and 62. The ocean widens only inside its tile. Geometric channels are separate from decorative artwork so generated artwork cannot introduce seam errors. Artwork: sculpted pines, boulders, fixed grass patches, snowy mountains and wave crests. Endpoint lock icons are omitted; accessible labels still identify the fixed spring and ocean.

Undo restores board and move count; restart/replay restores initial orientations and keeps bests. Each puzzle's history and personal best save on this browser under `harharhar.river-shift.v1`. Saved history is validated on load. Records are local, with no River Shift leaderboard API calls.

Keyboard: Tab or arrow keys to navigate the board; Enter/Space rotates river tiles. Endpoints/scenery identify themselves in accessible labels. Sound follows the shared arcade mute setting; reduced motion suppresses transitions and moving current marks. The fixed Games / Scores / Profile bar stays intact, with Scores opening River Shift records. Compact portrait screens use a shorter header and a height-limited square board above the fixed navigation.

## Verification

- `node --experimental-strip-types --test tests/river-shift.test.ts`
- Full repository tests and TypeScript check.
- Production static build and browser playthroughs of all four solutions, undo, replay, early ocean arrival, local records and profile dialog.
- Responsive iframe checks at 393×852 and 375×667 CSS pixels. These verify layout, not physical iOS Safari behavior.

## Art provenance

`public/river-art/ceramic-relief-atlas.png` was generated with the built-in image generation tool from the approved sculpted and endpoint references. Prompt: transparent 2×2 orthographic ceramic relief atlas, snowy mountains without water, three blue-green pines, slate boulders with restrained moss, two white wave crests; no tile bodies, labels or channel geometry. CSS selects each quadrant without destructive image edits.

## Release scope

River Shift includes nine puzzles in each of Easy, Medium, Hard, and Expert. Easy and Medium use 4×4 boards; Hard and Expert use 5×5 boards. Fixed endpoints and all three scenery types retain the approved artwork. Existing saves keep the same key and original four layouts. The game is available from its arcade card or the #river route. Records are local to each browser origin; the private playtest, GitHub Pages and hosted HarHarHar do not share local progress automatically.

Grass artwork: `public/river-art/ceramic-grass.png`, generated with the built-in image tool. Prompt: one transparent, low broad patch of sculpted sage-and-moss glazed ceramic grass; no tile body, no river, no rocks, no text. Grass is a scenery variant on existing blocked cells, not a new river shape. It cannot rotate and adds no moves. Spring and ocean lock icons are removed while their fixed behavior and accessible labels stay intact.

## Collection verification

All 36 solutions and minimum clockwise costs are checked by independently enumerating shape-compatible source-to-ocean routes. The collection avoids duplicated route layouts even after rotation/reflection. Difficulty is provisional until human playtesting; a longer route or a higher move count does not by itself guarantee a harder puzzle. Original puzzle snapshots and 5×5 save/resume are covered by regression tests.

## Level selector

A compact five-column numbered grid follows Gridlock’s selection pattern. Difficulty buttons show completed/total counts. Completed levels show a check and personal best; the current level has a clear outline. The Levels button beside Undo and Restart also makes selection reachable on compact screens with the top tabs hidden. Existing progress and all 36 puzzle layouts are unchanged.

## Midnight ceramic finish

Flatter tile faces use a low-contrast fired-glaze surface texture, thin square ceramic bevels and recessed charcoal grout. A subdued shared static reflection crosses the board. Dry channels keep shallow inner shadows, and flowing water remains bright turquoise with a crisp leading edge. Existing scenery, channel widths, puzzles, controls and saves stay intact.

Surface asset: `public/river-art/midnight-ceramic-glaze.png`, generated with the built-in image tool from the approved midnight ceramic material study. Prompt: seamless flat dark cobalt fired-ceramic glaze, fine pigment variation and very sparse pinholes/hairline fissures; no tile edges, scenery, channels, reflections or text. Code adds physical edges and shared low-intensity lighting above this surface.
