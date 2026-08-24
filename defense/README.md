# IRWFLIX Defense v5 — 2D Kenney

This version returns Defense to 2D and uses the uploaded Kenney Tower Defense 2D asset pack.

Clean GitHub structure:
```text
defense/
├── index.html
├── game.js
├── style.css
└── assets/
    ├── towers/
    ├── terrain/
    ├── deco/
    └── characters/
```

- `towers/`: Kenney red/brown/grey tower sprites, flattened
- `terrain/`: Kenney landscape tiles, flattened
- `deco/`: Kenney trees/rocks/crystals
- `characters/`: selected Tiny Swords 2D character animations retained for enemies/hero because the uploaded Kenney 2D tower pack does not contain enemy/hero sprites

Gameplay:
- 2D canvas, mobile-first
- Drag/tap tower placement on clear build pads
- Tower upgrade Lv1–5 with visible asset changes
- Sell tower
- Hero deploy + drag, level 1 foundation
- Normal + elite enemies
- Boss every wave
- Boss health bar
- 45-second 2x/periodic rush scoring
- Wave progression to 20
- Game Over / Victory
- Firebase Firestore REST score submission
- Top 10 defense leaderboard
