IRWFLIX MEMORY v19 — LEADERBOARD FIX

This version keeps the requested no-authentication design.

Important leaderboard fix:
- Firestore REST requests now include the Firebase Web API key from the existing firebaseConfig.
- No Firebase Authentication is used.
- Firestore Security Rules remain the authority for read/write permission.
- The score write and leaderboard read use the same project/database and API key.

Why:
The previous direct REST calls omitted the Web API key. Adding the key is required for the browser REST request path used here and removes that configuration-related 403 cause.

If the deployed rules are:
match /leaderboard/{document} {
  allow read, write: if true;
}
then the game should be able to read and create leaderboard documents without user authentication.

No changes were made to the timer, +3s/-1s time logic, score, sounds, or clean card assets.
