# IRWFLIX Defense 3D v3.0

This version is a clean 3D rebuild using the uploaded Kenney Tower Defense Kit (CC0).

## GitHub structure

```text
defense/
├── index.html
├── game.js
├── style.css
├── README.md
└── assets/
    ├── terrain/
    ├── towers/
    ├── enemies/
    ├── effects/
    └── weapons/
```

No nested asset-pack folders are required.

## 3D features
- Three.js 3D scene and GLB models
- Mobile pointer/touch controls
- Drag-to-place towers
- Tap tower to upgrade/sell
- Tower levels 1–5
- Hero is a native 3D procedural character, levels 1–10
- Normal enemies + boss every wave
- Wave progression to Wave 20
- Boss health/scaling
- Battle Rush multiplier windows
- Combo and speed scoring
- Game Over / Victory
- Manual End Run
- Firebase Firestore score submission
- Same player can submit multiple scores

## Asset license
The included Kenney Tower Defense Kit files are from the user's uploaded pack and are covered by its included CC0 license. Keep the original License.txt from the source pack if you redistribute the asset collection.

## Notes
The game uses Three.js from jsDelivr at runtime. The GLB files are local to the repository.
