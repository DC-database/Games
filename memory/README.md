# IRWFLIX Memory Match v3

- Fixed mobile card rendering from v2.
- Player name is stored in Firestore `players` as well as localStorage.
- The same name can be recovered on another browser by entering the same name.
- A run is automatically saved when NEW GAME is pressed after play.
- A completed final run is automatically saved.
- Levels 1-6 work, including final completion.
- Firebase leaderboard uses the shared `leaderboard` collection with `game: "memory"`.
- Version shown as MEMORY v3.

No authentication is used; without authentication, a player name is not a secure identity.
