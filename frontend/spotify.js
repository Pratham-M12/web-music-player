/* ─────────────────────────────────────────────
   SONIX — Spotify API Integration (PKCE Flow)
   Module name: SpotifyAPI  (NOT "Spotify" —
   that name is reserved by the Web Playback SDK)
   ──────────────────────────────────────────── */
'use strict';

const SpotifyAPI = (() => {
  // ── Token storage keys
  const KEY_TOKEN    = 'sonix_spotify_token';
  const KEY_EXPIRY   = 'sonix_spotify_expiry';
  const KEY_VERIFIER = 'sonix_pkce_verifier';

  let _accessToken = null;
  let _sdkPlayer   = null;   // Spotify Web Playback SDK instance
  let _deviceId    = null;
  let _sdkPaused   = true;

  // ── PKCE helpers ──────────────────────────────
  function _randomStr(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function _sha256(plain) {
    const enc  = new TextEncoder().encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // ── Auth ──────────────────────────────────────
  async function login() {
    const verifier  = _randomStr(64);
    const challenge = await _sha256(verifier);
    sessionStorage.setItem(KEY_VERIFIER, verifier);

    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             SPOTIFY_CONFIG.CLIENT_ID,
      scope:                 SPOTIFY_CONFIG.SCOPES,
      redirect_uri:          SPOTIFY_CONFIG.REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge:        challenge,
    });

    window.location.href = 'https://accounts.spotify.com/authorize?' + params;
  }

  async function handleCallback(code) {
    const verifier = sessionStorage.getItem(KEY_VERIFIER);
    if (!verifier) { console.error('SONIX: no PKCE verifier found'); return false; }

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'authorization_code',
          code,
          redirect_uri:  SPOTIFY_CONFIG.REDIRECT_URI,
          client_id:     SPOTIFY_CONFIG.CLIENT_ID,
          code_verifier: verifier,
        }),
      });

      const data = await res.json();
      console.log('Token response:', data);

      if (data.access_token) {
        _setToken(data.access_token, data.expires_in);
        sessionStorage.removeItem(KEY_VERIFIER);
        window.history.replaceState({}, '', window.location.pathname);
        return true;
      } else {
        console.error('SONIX: token error', data);
      }
    } catch (e) {
      console.error('SONIX: token exchange failed', e);
    }
    return false;
  }

  function _setToken(token, expiresIn) {
    _accessToken = token;
    const expiry = Date.now() + (expiresIn || 3600) * 1000;
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_EXPIRY, String(expiry));
  }

  function loadToken() {
    const token  = localStorage.getItem(KEY_TOKEN);
    const expiry = parseInt(localStorage.getItem(KEY_EXPIRY) || '0', 10);
    if (token && Date.now() < expiry) {
      _accessToken = token;
      return true;
    }
    return false;
  }

  function logout() {
    _accessToken = null;
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_EXPIRY);
    if (_sdkPlayer) { _sdkPlayer.disconnect(); _sdkPlayer = null; }
    _deviceId = null;
    updateLoginUI(false);
  }

  function isLoggedIn() { return !!_accessToken; }

  // ── API requests ──────────────────────────────
  async function _api(endpoint, opts = {}) {
    if (!_accessToken) { console.warn('SONIX: no access token'); return null; }
    try {
      const res = await fetch('https://api.spotify.com/v1' + endpoint, {
        ...opts,
        headers: {
          Authorization: 'Bearer ' + _accessToken,
          'Content-Type': 'application/json',
          ...(opts.headers || {}),
        },
      });
      if (res.status === 204) return {};
      if (res.status === 401) { logout(); return null; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('SONIX API error', res.status, endpoint, err);
        return null;
      }
      return res.json();
    } catch (e) {
      console.error('SONIX API fetch failed', endpoint, e);
      return null;
    }
  }

  // ── Data fetchers ─────────────────────────────
  async function getTopTracks(limit=5)  { return _api(`/me/top/tracks?limit=${limit}&time_range=short_term`); }
  async function getTopArtists(limit=6) { return _api(`/me/top/artists?limit=${limit}&time_range=short_term`); }
  async function getNewReleases()       { return _api('/browse/new-releases?limit=8&country=IN'); }
  async function getCurrentUser()       { return _api('/me'); }
  async function getFeaturedPlaylists() { return _api('/browse/featured-playlists?limit=8&country=IN'); }
  async function getCategories()        { return _api('/browse/categories?limit=20&country=IN'); }

  // Artist detail
  async function getArtist(id)           { return _api(`/artists/${id}`); }
  async function getArtistTopTracks(id)  { return _api(`/artists/${id}/top-tracks?market=IN`); }
  async function getArtistAlbums(id)     { return _api(`/artists/${id}/albums?include_groups=album,single&market=IN&limit=10`); }
  async function getRelatedArtists(id)   { return _api(`/artists/${id}/related-artists`); }

  // Album detail
  async function getAlbum(id)            { return _api(`/albums/${id}?market=IN`); }

  // Library
  async function getUserPlaylists()      { return _api('/me/playlists?limit=20'); }
  async function getSavedAlbums()        { return _api('/me/albums?limit=20&market=IN'); }
  async function getFollowedArtists()    { return _api('/me/following?type=artist&limit=20'); }
  async function getLikedSongs()         { return _api('/me/tracks?limit=1'); }

  async function search(query, types = 'track,artist,album', limit = 8) {
    if (!query || !query.trim()) return null;
    const q = encodeURIComponent(query.trim());
    return _api(`/search?q=${q}&type=${types}&limit=${limit}&market=IN`);
  }

  // ── Web Playback SDK ──────────────────────────
  // IMPORTANT: The SDK sets window.Spotify — we must NOT use that name for our module.
  // Our module is SpotifyAPI. The SDK's constructor is accessed via window.Spotify.Player.
  function initSDK() {
    if (!isLoggedIn()) return;

    // If SDK already loaded
    if (window.Spotify && window.Spotify.Player) {
      _createPlayer();
      return;
    }

    const script = document.createElement('script');
    script.src   = 'https://sdk.scdn.co/spotify-player.js';
    document.head.appendChild(script);

    // SDK calls this global callback when ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      _createPlayer();
    };
  }

  function _createPlayer() {
    if (_sdkPlayer) return; // already created

    _sdkPlayer = new window.Spotify.Player({
      name:          'SONIX Web Player',
      getOAuthToken: cb => cb(_accessToken),
      volume:        0.75,
    });

    _sdkPlayer.addListener('ready', ({ device_id }) => {
      _deviceId = device_id;
      console.log('SONIX SDK ready, device:', device_id);
      _transferPlayback();
    });

    _sdkPlayer.addListener('not_ready', ({ device_id }) => {
      console.warn('SONIX SDK not ready', device_id);
    });

    _sdkPlayer.addListener('player_state_changed', state => {
      if (!state) return;
      _sdkPaused = state.paused;
      _updatePlayerFromSDK(state);
    });

    _sdkPlayer.addListener('initialization_error', ({ message }) => {
      console.error('SDK init error:', message);
    });
    _sdkPlayer.addListener('authentication_error', ({ message }) => {
      console.error('SDK auth error:', message);
    });
    _sdkPlayer.addListener('account_error', ({ message }) => {
      console.error('SDK account error (Premium needed):', message);
    });

    _sdkPlayer.connect().then(success => {
      console.log('SDK connect:', success ? 'OK' : 'FAILED');
    });
  }

  async function _transferPlayback() {
    if (!_deviceId) return;
    await _api('/me/player', {
      method: 'PUT',
      body:   JSON.stringify({ device_ids: [_deviceId], play: false }),
    });
  }

  // ── Playback controls ─────────────────────────
  async function playTrack(uri) {
    if (!_deviceId) { console.warn('SDK not ready yet'); return; }
    await _api(`/me/player/play?device_id=${_deviceId}`, {
      method: 'PUT',
      body:   JSON.stringify({ uris: [uri] }),
    });
  }

  async function playContext(contextUri, offset = 0) {
    if (!_deviceId) { console.warn('SDK not ready yet'); return; }
    await _api(`/me/player/play?device_id=${_deviceId}`, {
      method: 'PUT',
      body:   JSON.stringify({ context_uri: contextUri, offset: { position: offset } }),
    });
  }

  function isSdkPaused()   { return _sdkPaused; }
  async function pausePlayback()  { await _api('/me/player/pause',    { method: 'PUT' }); _sdkPaused = true; }
  async function resumePlayback() { await _api('/me/player/play',     { method: 'PUT' }); _sdkPaused = false; }
  async function nextTrackSDK()   { await _api('/me/player/next',     { method: 'POST' }); }
  async function prevTrackSDK()   { await _api('/me/player/previous', { method: 'POST' }); }
  async function seekTo(ms)       { await _api(`/me/player/seek?position_ms=${ms}`, { method: 'PUT' }); }
  async function setVolumeSDK(pct){ await _api(`/me/player/volume?volume_percent=${Math.round(pct * 100)}`, { method: 'PUT' }); }
  async function setShuffle(state){ await _api(`/me/player/shuffle?state=${state}`, { method: 'PUT' }); }
  async function setRepeat(mode)  { await _api(`/me/player/repeat?state=${mode}`,  { method: 'PUT' }); }

  // ── UI updaters ───────────────────────────────
  function updateLoginUI(loggedIn) {
    const loginBtn  = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userMenu  = document.getElementById('userMenu');

    if (loggedIn) {
      if (loginBtn)  loginBtn.style.display  = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (userMenu)  userMenu.style.display  = 'flex';
    } else {
      if (loginBtn)  loginBtn.style.display  = '';
      if (signupBtn) signupBtn.style.display = '';
      if (userMenu)  userMenu.style.display  = 'none';
    }
  }

  function _msToTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  function _updatePlayerFromSDK(state) {
    const track    = state.track_window?.current_track;
    if (!track) return;

    const albumArt = track.album?.images?.[0]?.url;
    const name     = track.name;
    const artist   = track.artists?.map(a => a.name).join(', ');
    const duration = track.duration_ms;
    const pos      = state.position;

    const nameEl   = document.getElementById('playerTrackName');
    const artistEl = document.getElementById('playerTrackArtist');
    const artEl    = document.getElementById('playerArt');
    if (nameEl)   nameEl.textContent   = name;
    if (artistEl) artistEl.textContent = artist;
    if (artEl && albumArt) {
      artEl.style.cssText = `background:url(${albumArt}) center/cover no-repeat; border-radius:inherit;`;
    }

    const playIcon  = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    if (playIcon)  playIcon.style.display  = state.paused ? 'block' : 'none';
    if (pauseIcon) pauseIcon.style.display = state.paused ? 'none'  : 'block';

    if (duration > 0) {
      const pct  = (pos / duration) * 100;
      const fill  = document.getElementById('playerProgressFill');
      const thumb = document.getElementById('playerProgressThumb');
      const curr  = document.getElementById('playerCurrentTime');
      const dur   = document.getElementById('playerDuration');
      if (fill)  fill.style.width  = pct + '%';
      if (thumb) thumb.style.left  = pct + '%';
      if (curr)  curr.textContent  = _msToTime(pos);
      if (dur)   dur.textContent   = _msToTime(duration);
    }
  }

  // ── Populate UI with real data ─────────────────
  async function populateTracks() {
    const data = await getTopTracks();
    if (!data?.items?.length) { console.warn('SONIX: no top tracks'); return; }

    const list = document.querySelector('.tracks-list');
    if (!list) return;

    list.innerHTML = '';
    data.items.forEach((track, i) => {
      const img = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '';
      const artistNames = track.artists?.map(a => a.name).join(', ');
      const duration    = _msToTime(track.duration_ms);
      const pop         = track.popularity || 70;

      list.insertAdjacentHTML('beforeend', `
        <div class="track-item" data-spotify-uri="${track.uri}" data-track="${i}" style="cursor:pointer">
          <div class="track-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="track-cover" style="${img ? `background:url(${img}) center/cover` : 'background:linear-gradient(135deg,#1a0533,#ff6b9d)'}">
            <div class="track-play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4L20 12L7 20V4Z"/></svg>
            </div>
          </div>
          <div class="track-info">
            <span class="track-title">${track.name}</span>
            <span class="track-artist">${artistNames}</span>
          </div>
          <div class="track-album">${track.album?.name || ''}</div>
          <div class="track-bar"><div class="track-bar-fill" style="width:${pop}%"></div></div>
          <div class="track-plays">${pop}% pop.</div>
          <div class="track-duration">${duration}</div>
          <button class="track-like" data-liked="false">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>`);
    });

    // Re-bind events on newly created elements
    _bindTrackClicks();
    _bindLikeButtons();
  }

  async function populateArtists() {
    const data = await getTopArtists();
    if (!data?.items?.length) { console.warn('SONIX: no top artists'); return; }

    const track = document.getElementById('artistsTrack');
    if (!track) return;

    track.innerHTML = '';
    data.items.slice(0, 6).forEach((artist, i) => {
      const img       = artist.images?.[1]?.url || artist.images?.[0]?.url || '';
      const listeners = artist.followers?.total
        ? (artist.followers.total / 1_000_000).toFixed(1) + 'M monthly listeners'
        : '';
      const genre = (artist.genres?.[0] || 'music');
      const genreLabel = genre.charAt(0).toUpperCase() + genre.slice(1);

      track.insertAdjacentHTML('beforeend', `
        <div class="artist-card" data-index="${i}" data-spotify-uri="${artist.uri}">
          <div class="artist-img-wrap">
            <div class="artist-img" style="${img ? `background:url(${img}) center/cover` : 'background:linear-gradient(135deg,#1a0533,#ff6b9d)'}"></div>
            <div class="artist-overlay">
              <button class="artist-play-btn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4L20 12L7 20V4Z"/></svg>
              </button>
            </div>
          </div>
          <div class="artist-info">
            <span class="artist-genre">${genreLabel}</span>
            <h3 class="artist-name">${artist.name}</h3>
            <span class="artist-listeners">${listeners}</span>
          </div>
          <div class="artist-rank">#${i + 1}</div>
        </div>`);
    });

    _bindArtistButtons();
  }

  async function populateNewReleases() {
    const data = await getNewReleases();
    const albums = data?.albums?.items;
    if (!albums?.length) { console.warn('SONIX: no new releases'); return; }

    albums.slice(0, 2).forEach((album, i) => {
      const img        = album.images?.[0]?.url;
      const panelArt   = document.querySelectorAll('.album-art')[i];
      const panelTitle = document.querySelectorAll('.album-panel-title')[i];
      const panelArtistEl = document.querySelectorAll('.album-panel-artist')[i];
      const panelMeta  = document.querySelectorAll('.album-panel-meta')[i];
      const panelBtn   = document.querySelectorAll('.album-panel-actions .btn-primary')[i];

      if (panelArt && img) { panelArt.style.cssText = `background:url(${img}) center/cover; background-size:cover;`; }
      if (panelTitle)  panelTitle.textContent  = album.name;
      if (panelArtistEl) panelArtistEl.textContent = album.artists?.map(a => a.name).join(', ');
      if (panelMeta)   panelMeta.innerHTML = `<span>${album.total_tracks} Tracks</span><span>—</span><span>${album.release_date?.slice(0, 4) || ''}</span>`;
      if (panelBtn)    panelBtn.addEventListener('click', () => playContext(album.uri));
    });
  }

  async function populateUserProfile() {
    const user = await getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById('userDisplayName');
    const imgEl  = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = user.display_name || 'Listener';
    if (imgEl && user.images?.[0]?.url) {
      imgEl.src   = user.images[0].url;
      imgEl.style.display = 'block';
    }
  }

  // ── Internal event binders ────────────────────
  function _bindTrackClicks() {
    document.querySelectorAll('.track-item[data-spotify-uri]').forEach(item => {
      item.addEventListener('click', () => {
        const uri = item.dataset.spotifyUri;
        if (uri && isLoggedIn()) playTrack(uri);
      });
    });
  }

  function _bindLikeButtons() {
  document.querySelectorAll('.track-like').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      const trackItem = btn.closest('.track-item');
      const uri = trackItem.dataset.spotifyUri;

      try {
        const res = await fetch("http://localhost:5000/songs/like-by-uri", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ spotifyUrl: uri })
        });

        const data = await res.json();
        console.log("LIKE RESPONSE:", data);

        // Toggle UI
        const liked = btn.dataset.liked === 'true';
        btn.dataset.liked = String(!liked);
        btn.classList.toggle('liked', !liked);

      } catch (err) {
        console.error("LIKE ERROR:", err);
      }
    });
  });
}

  function _bindArtistButtons() {
    document.querySelectorAll('.artist-play-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.artist-card');
        const uri  = card?.dataset.spotifyUri;
        if (uri && isLoggedIn()) playContext(uri);
      });
    });
  }

  // ── Public API ────────────────────────────────
  return {
    login, logout, handleCallback, loadToken, isLoggedIn, isSdkPaused,
    initSDK,
    search,
    // Playback
    playTrack, playContext,
    pausePlayback, resumePlayback,
    nextTrackSDK, prevTrackSDK,
    seekTo, setVolumeSDK, setShuffle, setRepeat,
    // Data fetchers
    getTopTracks, getTopArtists, getNewReleases, getCurrentUser,
    getFeaturedPlaylists, getCategories,
    getArtist, getArtistTopTracks, getArtistAlbums, getRelatedArtists,
    getAlbum,
    getUserPlaylists, getSavedAlbums, getFollowedArtists, getLikedSongs,
    // Landing page UI populates
    populateTracks, populateArtists, populateNewReleases, populateUserProfile,
    updateLoginUI,
    getDeviceId: () => _deviceId,
  };
})();

