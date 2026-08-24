# IRWFLIX PLAY Dashboard v1
Main dashboard reads the shared Firestore `leaderboard` collection and shows top scores for Defense, Blocks and Memory.
It also shows each player's best submitted score per game and a simple total of those three best scores.

# Memory Match v1
Ready-to-play files are in `Games/memory/`:
- index.html
- style.css
- memory.js

The Memory game uses the supplied Firebase project and writes `game: "memory"` to the shared `leaderboard` collection.

Deploy the dashboard at the main site root and keep game folders at `/Games/defense/`, `/Games/blocks/`, and `/Games/memory/`.
