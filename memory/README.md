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
`memory.js` is a normal script, not an ES module. The card layout also uses an explicit absolute card surface so the cards render correctly in Chromium/Chrome. For reliable local testing, open the folder through a small HTTP server (for example VS Code Live Server) instead of double-clicking `index.html`. Firebase leaderboard uses the Firestore REST endpoint instead of browser module imports.

For the live GitHub Pages site, use HTTPS as usual. If Firestore security rules deny unauthenticated reads/writes, the game will still play locally but score upload will report that the leaderboard is unavailable until the rules allow it.


## Animal Sets
Each level now uses a different animal-themed pool. The cards are shuffled every run, while levels progress through Farm, Jungle, Ocean, Forest, Safari, Pets & Farm, Ocean Deep, Wild Animals, Birds & Reptiles, and Animal Kingdom.
