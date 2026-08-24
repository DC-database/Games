# IRWFLIX Memory Match v4

This version fixes the missing card-face problem.

The cards are fully self-contained vector artwork inside `memory.js`; no external card image pack is required.

Features:
- Visible card backs and actual illustrated card faces
- 12 different card designs
- 4–12 pairs depending on level
- Mobile-friendly tap controls
- Match animation, wrong-match shake and confetti
- Score animation
- 2× speed bonus window
- Levels 1–10
- Submit Run / New Game finalization
- Firebase Firestore leaderboard submission
- Global Top 10
- 8-second leaderboard timeout
- Player name stored locally as `irwflixPlayer`

Files:
- index.html
- style.css
- memory.js

## Important local testing fix
`memory.js` is now a normal script, not an ES module, so opening `index.html` directly with `file://` no longer triggers the browser's module CORS error. Firebase leaderboard uses the Firestore REST endpoint instead of browser module imports.

For the live GitHub Pages site, use HTTPS as usual. If Firestore security rules deny unauthenticated reads/writes, the game will still play locally but score upload will report that the leaderboard is unavailable until the rules allow it.
