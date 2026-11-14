# Gridlock

A personal, untimed sliding traffic puzzle in HarHarHar's midnight arcade theme. Open it with `#gridlock` or the game card.

- Collection 3: 200 selectable levels: 50 Easy, 50 Intermediate, 50 Advanced, 50 Expert.
- Horizontal and vertical vehicles, lengths 2 and 3. Vehicle lettering is hidden during play; accessible labels retain vehicle identities. The red target exits right from row 3.
- A whole slide is one move, regardless of distance. Target reaching column 5 (zero-based position 4) completes the puzzle; the exit animation does not add a move.
- Completion check marks, personal minimum move records, and stars for optimal solutions. No shared leaderboard or API/database changes.
- Undo and restart; best records survive replay. One current unfinished puzzle resumes after reload. Selecting a different level starts that level and replaces the unfinished puzzle.
- Local device storage, separate from the editable arcade profile. Clearing browser data clears progress. Other tabs receive storage updates.
- Drag with touch or mouse. Tab to vehicles and use their axis arrows; Shift + arrow slides to the furthest allowed square.

## Puzzle generation and validation

`node --experimental-strip-types scripts/generate-gridlock.ts`

The deterministic development generator explores the complete reachable graph of randomly constructed layouts. Multi-source BFS from every solved state computes exact distances for whole slides. Puzzles have distinct layouts, legal solution certificates and target counts spanning 4–7 moves for Easy, 8–12 for Intermediate, and 13–17 for Advanced and 18+ for Expert. Before accepting a puzzle, the generator removes cars unused by a solution, recomputes its shortest solution, and tries solving with each remaining car frozen. If any frozen car allows a solution, it removes unused cars from that route and repeats. Every remaining car must move in every solution. Difficulty is assigned after pruning. Generating happens during development, never on a player's device.

Collection 3 keeps `harharhar.gridlock.v2` and preserves layout identities and records for unchanged puzzles. New boards receive IDs derived from their exact layout; display numbers come from their position in the resequenced tier. A session on a retired layout is cleared while valid records for other puzzles remain. Original collection 1 records remain untouched under `harharhar.gridlock.v1`.

Variety is checked after filler removal. Each of the 200 boards has a unique vehicle layout (orientation, length and lane, ignoring starting positions, IDs and colours). Near-duplicates that change only one starting vehicle or truck length while preserving the same solution pattern are rejected. Easy allows at most two copies of a normalized move pattern, at most three direct-column clearing puzzles, and no more than two trucks per board; at least 30 Easy boards use zero or one truck. Its move distribution is 6 four-move, 14 five-move, 16 six-move and 14 seven-move puzzles. Sequencing alternates challenge types within a small difficulty band.

`scripts/data/gridlock-seeds.json` contains frozen collection 2 starting boards, not generated output. They are solved, pruned and filtered again before reuse. New candidates alternate mixed car/truck layouts with short-car layouts. Long development searches can resume with `--checkpoint /path/to/checkpoint.json`; the checkpoint is an additional generation input.

**Do not regenerate shipped levels without versioning the collection and progress key.** Level IDs are persistent save identities. Reordering must retain identities for unchanged boards; replacements must receive new identities.

`node --experimental-strip-types --test tests/gridlock.test.ts`

Tests independently solve all 200 starting states with forward BFS and compare their shortest solutions to the stored minima. They also replay every solution, check unique layouts and tier counts, exercise collision rejection, validate saved move histories, independently confirm that freezing any non-target car makes every puzzle unsolvable, and enforce structural diversity, Easy variety quotas and preservation of existing layout identities.

## Review

The initial integration was checked at a 393 × 852 CSS pixel phone viewport and on desktop. Browser checks cover dragging, undo, reload/resume, solving, personal-best updates, level selection, and the fixed Scores navigation opening Gridlock's device records. Human difficulty and variety review remains useful; solve length alone cannot capture perceived difficulty.
