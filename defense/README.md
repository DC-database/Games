# IRWFLIX Defense v2.0 — Clean Asset Integration

## GitHub structure
```text
defense/
├── index.html
├── game.js
├── style.css
├── firebase-config.js
└── assets/
    ├── towers/
    ├── characters/
    ├── terrain/
    ├── effects/
    └── ui/
```

No old `buildings/`, `deco/`, `fx/`, `terrain/`, or `units/` folders are required by this build.

## New defense systems
- Drag-and-drop tower placement on glowing build pads.
- Tap placed tower to open upgrade/sell controls.
- Tower levels 1–5 use the provided visual level assets.
- Hero uses provided Level 1/3/5/7/10 art and can be dragged around the battlefield.
- Boss appears on every wave.
- Normal, elite and boss enemies use the supplied character assets.
- 60-second 2× Battle Rush at the start of each wave; normal scoring resumes after it expires.
- Wave rewards, kill combo, boss bonuses and score progression.
- Game Over and Wave 20 victory finalize and submit the score.
- Manual Submit Score is available during a run.
- Firebase leaderboard uses the `leaderboard` Firestore collection and `game: "defense"`.
