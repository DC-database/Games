# IRWFLIX PLAY — Blocks v31

## Score save fix
- Firestore REST requests now include the Firebase Web API key for correct Firebase project routing.
- POST score creation returns the actual Firestore error details to the browser console if it fails.
- Leaderboard reads use the same Firebase API key.
- No Firebase Authentication is added; access continues to be controlled by Firestore Security Rules.
- Game Over still auto-submits the score.

## Important Firebase Console check
The API key used by the game must allow the Cloud Firestore API (`firestore.googleapis.com`). Firebase documents that direct REST access may require the Firebase API key to have the relevant Firebase/Google API enabled/restricted correctly.

The expected Firestore collection is:
`leaderboard`

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
