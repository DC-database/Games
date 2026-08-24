# IRWFLIX Defense - Firebase Leaderboard Updated

The existing Defense gameplay/assets are preserved.

Leaderboard behavior:
- Game Over or victory saves the final score to Firestore.
- Every completed run is a separate score entry.
- `game: "defense"` identifies Defense scores.
- Same player may appear multiple times in Top 10.
- Dashboard sorts all Defense entries by score descending and displays the top 10.
