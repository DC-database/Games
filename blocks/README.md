# IRWFLIX PLAY — Blocks v31

## Score save fix
- Score saving now uses Firebase Realtime Database directly.
- Scores are written under `/leaderboard/blocks`.
- Leaderboard reads use RTDB.
- No Firebase Authentication is added; access is controlled by Realtime Database Rules.
- Game Over still auto-submits the score.

## Important Firebase Console check
Configure Realtime Database Rules, not Firestore Rules. The expected RTDB path is `/leaderboard/blocks`.

The game sends: `game`, `name`, `score`, `timeSeconds`, `stage`, `stageName`, `createdAt`.


## v31 — Progressive difficulty
- Stages 1-3 use only 4 familiar shapes.
- Every 3 stages, one additional shape is unlocked.
- New shapes are introduced gradually instead of putting the full pool into early gameplay.
- The stage label shows the number of currently available shapes.
- All existing time-attack, stage progression, sound, Game Over, and Firebase scoring behavior is retained.


### v32 shape progression
- Stages 1–3: 4 basic shapes.
- Every 3 stages, one additional shape is introduced.
- Stage 19 introduces a 6-box rectangle. Because pieces can rotate, it can appear in both 3×2 landscape and 2×3 portrait orientations.
- Stage 22 introduces a 9-box 3×3 square.
- The full shape pool is reached gradually rather than appearing all at once.
