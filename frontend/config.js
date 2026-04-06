/* ─────────────────────────────────────────────
   SONIX — Spotify API Configuration
   Paste your Spotify credentials below.
   ──────────────────────────────────────────── */

const SPOTIFY_CONFIG = {
  // ✅ Paste your Spotify Client ID here:
  CLIENT_ID: 'c8d9585cebdc4077ad2b92de944c865b',

  // ✅ Paste your Spotify Client Secret here:
  CLIENT_SECRET: '5af5d05b0e63431bacbfc9372448c6fc',

  // ✅ This is the redirect URI — must match EXACTLY what you set in your
  //    Spotify Developer Dashboard under "Redirect URIs"
  REDIRECT_URI: "http://127.0.0.1:5500/callback.html",

  // Scopes: what permissions your app requests from Spotify
  SCOPES: [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'playlist-read-private',
    'user-library-read',
    'user-top-read',
  ].join(' '),
};
