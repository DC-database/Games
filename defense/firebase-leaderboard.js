// Defense Firebase leaderboard integration.
// The main index.html includes the Firebase SDK module and exposes:
// window.saveDefenseScoreToFirebase(score, wave, reason)
// window.loadDefenseTop10()
//
// Each Game Over / victory is intended to create a NEW leaderboard document.
// The dashboard ranks all defense entries by score; player names are not deduplicated.
