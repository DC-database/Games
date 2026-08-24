// Optional Firebase configuration.
// The game works without Firebase using localStorage.
// To enable a global leaderboard, add your Firebase config below and
// replace the local saveScore/renderScores logic with Firestore/Realtime DB calls.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};