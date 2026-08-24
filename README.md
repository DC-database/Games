# IRWFLIX PLAY — Blocks + Memory v4 Fix

This package fixes two issues seen on mobile:

1. Memory cards were missing because the page waited for Firebase/player setup BEFORE building the board. The game now builds immediately and Firebase runs in the background.
2. Memory and Blocks leaderboard reads now time out instead of remaining on Loading forever.
3. Blocks automatically submits a Game Over score once per run.
4. Memory keeps separate leaderboard entries for completed runs and New Game runs.
5. Use FIREBASE-RULES.txt in Firebase Console → Firestore Database → Rules. No authentication is required for this casual-game leaderboard.

Folders:
- blocks/
- memory/
