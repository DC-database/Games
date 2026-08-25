IRWFLIX MEMORY v20

This is the corrected integrated deployment package.

Fixes from the previous deployment:
- Uses memory-v20.js, not the old memory-v16.js.
- Includes the complete assets/cards/front folder and assets/cards/back folder.
- Includes all external sound WAV files.
- Animal artwork is transparent artwork only; the game supplies the card shell.
- No Firebase Authentication is used.
- Scores use Firebase Realtime Database under `/leaderboard/memory`.
- Timer: 60 seconds; correct pair +3 seconds; wrong pair -1 second.
- Score remains separate from time.
- Game Over automatically submits the run.

IMPORTANT: Upload the ENTIRE contents of this ZIP to the memory/ folder, including the assets folder. Do not upload only index.html or only the JS file.

After deployment, confirm the browser displays MEMORY v20. If it still says MEMORY v16, the old deployment/cache is still being served.
