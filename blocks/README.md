# IRWFLIX PLAY — Blocks v25

This is the mobile/game-system update for Blocks.

## Fixes
- Game Over overlay is now inside the main game card, so it is visible on mobile.
- No-move detection checks every unused piece against every board position.
- If the final remaining piece cannot be placed, the run immediately ends.
- New Game no longer silently destroys an active score; it first offers the run-finalization screen.
- Game Over / Run End screen asks for **SUBMIT SCORE** or **NEW GAME**.
- Score is explicitly registered only when **SUBMIT SCORE** is pressed.
- Top 10 is calculated from all submitted runs; the same player may appear multiple times.
- 60-second 2× Speed Rush: score earned during the first 60 seconds is doubled. The run continues normally after the rush expires.
- Combo bonus for consecutive line clears within 5 seconds.
- Run time is recorded and categorized as under 2 minutes, under 5 minutes, or 5+ minutes.
- Firebase uses the Firestore REST endpoint, avoiding browser ES-module `file://` CORS errors during local testing.
- Version shown in the header: **v25**.

## GitHub structure
```text
blocks/
├── index.html
├── style.css
├── game.js
├── firebase-firestore-rules.txt
└── README.md
```
