# IRWFLIX PLAY Top-10 Leaderboard System v1

Root `index.html` is Dashboard v5.

Leaderboard rule:
- Every completed game run is saved as its own Firestore `leaderboard` document.
- Leaderboards sort by numeric `score` descending.
- Only the top 10 entries are displayed.
- No player deduplication: the same name may occupy multiple positions.
- Old scores are not deleted when they fall below top 10; they simply stop appearing in the top-10 query/view.
- Blocks and Memory included in this package.
- Defense dashboard support reads existing `game: "defense"` score submissions. The Defense game itself must use the same submission schema (`game:"defense", name, score`) for its submissions to appear.
