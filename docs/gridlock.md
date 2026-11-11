# Gridlock

A personal, untimed sliding traffic puzzle in HarHarHar's midnight arcade theme. Open it with `#gridlock` or the game card.

- 200 permanently numbered, selectable levels: 50 Easy, 50 Intermediate, 50 Advanced, 50 Expert.
- Horizontal and vertical vehicles, lengths 2 and 3. Vehicle lettering is hidden during play; accessible labels retain vehicle identities. The red target exits right from row 3.
- A whole slide is one move, regardless of distance. Target reaching column 5 (zero-based position 4) completes the puzzle; the exit animation does not add a move.
- Completion check marks, personal minimum move records, and stars for optimal solutions. No shared leaderboard or API/database changes.
- Undo and restart; best records survive replay. One current unfinished puzzle resumes after reload. Selecting a different level starts that level and replaces the unfinished puzzle.
- Local device storage, separate from the editable arcade profile. Clearing browser data clears progress. Other tabs receive storage updates.
- Drag with touch or mouse. Tab to vehicles and use their axis arrows; Shift + arrow slides to the furthest allowed square.

## Puzzle generation and validation

`node --experimental-strip-types scripts/generate-gridlock.ts`

The deterministic development generator explores the complete reachable graph of randomly constructed layouts. Multi-source BFS from every solved state computes exact distances for whole slides. Puzzles have distinct layouts, legal solution certificates and target counts spanning 4–7 moves for Easy, 8–12 for Intermediate, and 13–17 for Advanced and 18+ for Expert. Generating happens during development, never on a player's device.

**Do not regenerate shipped levels without versioning the collection and progress key.** Level IDs are persistent save identities. Future edits should preserve existing IDs and layouts.

`node --experimental-strip-types --test tests/gridlock.test.ts`

Tests independently solve all 200 starting states with forward BFS and compare their shortest solutions to the stored minima. They also replay every solution, check unique layouts and tier counts, exercise collision rejection, and validate saved move histories.

## Review

The initial integration was checked at a 393 × 852 CSS pixel phone viewport and on desktop. Browser checks cover dragging, undo, reload/resume, solving, personal-best updates, level selection, and the fixed Scores navigation opening Gridlock's device records. Human difficulty and variety review remains useful; solve length alone cannot capture perceived difficulty.
