# IRWFLIX PLAY — Blocks v30

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
