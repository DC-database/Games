# IRWFLIX Defense v15

Fixes the v14 runtime asset errors that stopped the animation loop:
- No reference to missing `assets/enemies/e4.png` can crash rendering.
- Missing/failed images are skipped safely and use a valid fallback enemy sprite.
- UI sound now correctly points to `assets/audio/ui_click.wav`.
- `drawImage` validates `naturalWidth` and catches broken-image draw errors.
- Enemy movement continues using elapsed-time path distance.

The local-file CORS/`file://` warning shown by Chrome is a browser restriction; the game is intended to be tested through a local web server or GitHub Pages.
