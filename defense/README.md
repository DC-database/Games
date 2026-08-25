# IRWFLIX PLAY — Defense Premium Edition

This build keeps the existing Defense gameplay and Firebase leaderboard flow while upgrading the presentation and fixing the runtime asset errors.

## Fixes in this build
- Fixed the missing `e4.png` enemy crash by providing a valid fallback asset and safe image loading.
- Fixed the missing `assets/audio/ui.wav` error; the game now uses the supplied `ui_click.wav` and includes a compatibility copy.
- Prevented broken images from stopping the animation/update loop.
- Enemy movement speed is restored to a clearly visible 105–130 px/sec range.
- Removed the dense repeating green Kenney tile grid that made the battlefield look cluttered.
- Reworked the battlefield into a cleaner premium terrain presentation with subtle Kenney decorations.
- Added a layered, shaded road with a restrained center guide.
- Kept the Kenney tower pieces, weapons, boss walking animations and boss attack animations.
- Bosses stop at the keep and attack instead of instantly leaking through the base.
- Boss variants rotate on waves 5, 10, 15 and 20.

## Asset attribution
Kenney Tower Defense Kit is included under the license supplied with the original asset pack. See `assets/kenney/License.txt`.

The boss PNG animation files were supplied separately for this game build.


## Common enemy animation
- The supplied common enemy is now the standard non-boss enemy.
- Walk uses 8 normalized frames.
- Attack uses 8 normalized frames.
- The frame numbers from the source PNGs were removed.
- Dark source backgrounds were removed and frames were converted to clean transparent PNGs.
- All frames use a consistent 256×256 sprite canvas and a common ground anchor so the enemy does not jump in size or position during animation.
- Common enemies stop at the keep and play their attack animation before damaging the base.

## Login / leaderboard integration
- Defense uses the shared `../firebase-rtdb.js` player session from the IRWFLIX PLAY main dashboard.
- Opening Defense without a valid player session returns to the main dashboard.
- Defense submits to `/leaderboard/defense` and updates the player's personal best at `/players/<idName>/scores/defense`.
