# Realm Defense — Tower Defense Prototype

A browser-based tower defense game designed for Cloudflare Pages and ready for Firebase integration.

## Run locally
Open `index.html` in a modern browser, or use any static server.

## Deploy to Cloudflare Pages
1. Upload this folder to a GitHub repository.
2. In Cloudflare Pages, create a project from that repository.
3. Framework preset: None.
4. Build command: leave empty.
5. Output directory: `/`.
6. Deploy.

## Firebase
The prototype currently stores leaderboard scores in browser localStorage so it works immediately.
`firebase-config.js` contains the Firebase configuration placeholder.

For a production global leaderboard:
- Enable Firebase Realtime Database.
- Use the included `firebase-rules.json` as a starting point.
- Add Firebase SDK calls in `game.js`.
- Add Firebase Authentication before allowing persistent player profiles.

## Current gameplay
- 3 tower types: Archer, Cannon, Mage
- 3 enemy types: Grunt, Tank, Runner
- 20 waves
- Tower upgrades and selling
- Gold economy
- Base lives
- Score
- Local leaderboard
- Responsive layout

## Next upgrades
- Multiple maps
- Boss waves
- More tower types
- Tower skill trees
- Enemy armor/resistances
- Sound/music
- Player accounts
- Global Firebase leaderboard
- Mobile touch controls
