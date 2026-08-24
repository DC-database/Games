# IRWFLIX Memory Match v1

Self-contained mobile/desktop memory matching game.

Features:
- 6 progression levels
- Animated card flips
- Match animations
- Combo scoring
- Confetti/fireworks on matches and level completion
- Timer and move counter
- Level targets/progress
- Game completion screen
- Player name remembered locally
- Firestore leaderboard using the provided leaderboard-90b9b Firebase project

Place `index.html` in `Games/memory/index.html`.

Firestore collection used: `leaderboard`
Game key: `memory`

If Firestore rules do not allow public reads/writes, publish rules appropriate for this casual game before submitting scores.
