/* ─────────────────────────────────────────────
   SONIX — Spotify API Configuration
   ──────────────────────────────────────────── */

const SPOTIFY_REDIRECT_URI = (() => {
  const origin = window.location.origin;
  const path = window.location.pathname;
  const isServedFromFrontendFolder = path.startsWith('/frontend/');
  return `${origin}${isServedFromFrontendFolder ? '/frontend' : ''}/callback.html`;
})();

const SPOTIFY_CONFIG = {
  // ✅ Spotify Client ID (safe to expose in frontend — it's a public identifier)
  CLIENT_ID: 'c8d9585cebdc4077ad2b92de944c865b',

  // 🔒 CLIENT_SECRET has been moved to the backend (.env)
  //    The frontend never needs it — token exchange happens server-side.

  // ✅ Redirect URI — must match exactly what's in your Spotify Dashboard
  REDIRECT_URI: SPOTIFY_REDIRECT_URI,

  // Scopes: what permissions your app requests from Spotify
  SCOPES: [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'playlist-read-private',
    'user-library-read',
    'user-top-read',
    'user-follow-read',
  ].join(' '),
};

// ✅ Centralized backend URL — change this when deploying to production
const BACKEND_URL = 'http://localhost:5000';

// ✅ HTML escape helper — prevents XSS when inserting API data into the DOM
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
