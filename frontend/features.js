/* ─────────────────────────────────────────────
   SONIX Features Module
   Toast · Auth Modal · Context Menu · Playlist Modal
   ──────────────────────────────────────────── */
'use strict';

// ═══════════════════════════════════════════════
//  1. TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════
const SonixToast = (() => {
  let _container = null;

  function _ensureContainer() {
    if (_container) return;
    _container = document.createElement('div');
    _container.className = 'snx-toast-container';
    document.body.appendChild(_container);
  }

  function show(message, type = 'success', duration = 3000) {
    _ensureContainer();

    const toast = document.createElement('div');
    toast.className = `snx-toast snx-toast-${type}`;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    };

    toast.innerHTML = `
      <div class="snx-toast-icon">${icons[type] || icons.info}</div>
      <span class="snx-toast-msg">${escapeHTML(message)}</span>
      <div class="snx-toast-progress"><div class="snx-toast-bar"></div></div>
    `;

    _container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto progress bar
    const bar = toast.querySelector('.snx-toast-bar');
    bar.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => bar.style.width = '0%');

    // Auto dismiss
    const timer = setTimeout(() => _dismiss(toast), duration);

    // Click to dismiss early
    toast.addEventListener('click', () => {
      clearTimeout(timer);
      _dismiss(toast);
    });
  }

  function _dismiss(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }

  return { show };
})();


// ═══════════════════════════════════════════════
//  2. AUTH MODAL (Sign Up / Sign In)
// ═══════════════════════════════════════════════
const SonixAuth = (() => {
  let _modal = null;

  function _createModal() {
    if (_modal) return;

    const overlay = document.createElement('div');
    overlay.className = 'snx-modal-overlay';
    overlay.id = 'authModal';
    overlay.innerHTML = `
      <div class="snx-modal snx-auth-modal">
        <button class="snx-modal-close" id="authModalClose">&times;</button>
        <div class="snx-auth-header">
          <div class="snx-auth-logo">
            <svg viewBox="0 0 60 60" fill="none" width="40" height="40">
              <circle cx="30" cy="30" r="28" stroke="url(#aGrad)" stroke-width="2.5"/>
              <path d="M38 16C38 16 22 20 22 28C22 34 34 33 34 39C34 45 18 48 18 48" stroke="url(#aGrad)" stroke-width="3" stroke-linecap="round"/>
              <defs><linearGradient id="aGrad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ff6b9d"/><stop offset="100%" stop-color="#ff9a3c"/></linearGradient></defs>
            </svg>
          </div>
          <h2>Welcome to <span class="gradient-text">SONIX</span></h2>
          <p class="snx-auth-subtitle">Create an account to save your playlists, likes, and history</p>
        </div>

        <div class="snx-auth-tabs">
          <button class="snx-auth-tab active" data-tab="login">Sign In</button>
          <button class="snx-auth-tab" data-tab="register">Sign Up</button>
        </div>

        <!-- Login Form -->
        <form class="snx-auth-form" id="loginForm">
          <div class="snx-input-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div class="snx-input-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div class="snx-auth-error" id="loginError"></div>
          <button type="submit" class="snx-auth-submit">Sign In</button>
        </form>

        <!-- Register Form -->
        <form class="snx-auth-form" id="registerForm" style="display:none">
          <div class="snx-input-group">
            <label for="regUsername">Username</label>
            <input type="text" id="regUsername" placeholder="Your name" required minlength="2" maxlength="30" autocomplete="username" />
          </div>
          <div class="snx-input-group">
            <label for="regEmail">Email</label>
            <input type="email" id="regEmail" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div class="snx-input-group">
            <label for="regPassword">Password</label>
            <input type="password" id="regPassword" placeholder="Min 6 characters" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="snx-auth-error" id="registerError"></div>
          <button type="submit" class="snx-auth-submit">Create Account</button>
        </form>

        <div class="snx-auth-divider"><span>or</span></div>
        <button class="snx-auth-spotify" onclick="SonixAuth.close(); SpotifyAPI.login();">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          Continue with Spotify
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    _modal = overlay;

    // Tab switching
    overlay.querySelectorAll('.snx-auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.snx-auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('loginForm').style.display = tab.dataset.tab === 'login' ? '' : 'none';
        document.getElementById('registerForm').style.display = tab.dataset.tab === 'register' ? '' : 'none';
        overlay.querySelectorAll('.snx-auth-error').forEach(e => e.textContent = '');
      });
    });

    // Close
    overlay.querySelector('#authModalClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Login submit
    document.getElementById('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      errEl.textContent = '';

      try {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('sonixUser', JSON.stringify(data.user));
        SonixToast.show(`Welcome back, ${data.user.username}!`, 'success');
        close();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });

    // Register submit
    document.getElementById('registerForm').addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const errEl = document.getElementById('registerError');
      errEl.textContent = '';

      try {
        const res = await fetch(`${BACKEND_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.details?.map(d => d.message).join(', ') || 'Registration failed');

        SonixToast.show('Account created! Signing you in...', 'success');

        // Auto login after register
        const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem('token', loginData.token);
          localStorage.setItem('sonixUser', JSON.stringify(loginData.user));
        }
        close();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  function open() {
    _createModal();
    _modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (_modal) {
      _modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  return { open, close };
})();


// ═══════════════════════════════════════════════
//  3. CONTEXT MENU (Right-click on tracks)
// ═══════════════════════════════════════════════
const SonixContextMenu = (() => {
  let _menu = null;
  let _currentTrack = null; // { uri, name, artist, img, albumId, artistId }

  function _createMenu() {
    if (_menu) return;

    _menu = document.createElement('div');
    _menu.className = 'snx-ctx-menu';
    _menu.innerHTML = `
      <button class="snx-ctx-item" data-action="play">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7 4L20 12L7 20V4Z"/></svg>
        <span>Play</span>
      </button>
      <button class="snx-ctx-item" data-action="queue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
        <span>Add to Queue</span>
      </button>
      <div class="snx-ctx-divider"></div>
      <button class="snx-ctx-item" data-action="like">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        <span>Like</span>
      </button>
      <button class="snx-ctx-item snx-ctx-has-sub" data-action="playlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <span>Add to Playlist</span>
        <svg class="snx-ctx-arrow" viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <div class="snx-ctx-submenu" id="ctxPlaylistSub"></div>
      <div class="snx-ctx-divider"></div>
      <button class="snx-ctx-item" data-action="artist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Go to Artist</span>
      </button>
      <button class="snx-ctx-item" data-action="share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        <span>Share</span>
      </button>
    `;
    document.body.appendChild(_menu);

    // Action handlers
    _menu.querySelectorAll('.snx-ctx-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (action === 'playlist') {
          _togglePlaylistSub();
          return;
        }
        _handleAction(action);
        hide();
      });
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!_menu.contains(e.target)) hide();
    });
    document.addEventListener('scroll', hide, true);
  }

  function _handleAction(action) {
    if (!_currentTrack) return;

    switch (action) {
      case 'play':
        if (_currentTrack.uri) SpotifyAPI.playTrack(_currentTrack.uri);
        break;

      case 'queue':
        if (_currentTrack.uri && SpotifyAPI.isLoggedIn()) {
          const spotifyToken = localStorage.getItem('sonix_spotify_token');
          fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(_currentTrack.uri)}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${spotifyToken}` },
          }).then(r => {
            if (r.ok) SonixToast.show('Added to queue', 'success');
            else SonixToast.show('Could not add to queue', 'error');
          }).catch(() => SonixToast.show('Could not add to queue', 'error'));
        }
        break;

      case 'like':
        _likeTrack();
        break;

      case 'artist':
        if (_currentTrack.artistId) {
          SonixRouter.navigate('artist', _currentTrack.artistId);
        }
        break;

      case 'share':
        _shareTrack();
        break;
    }
  }

  async function _likeTrack() {
    const token = localStorage.getItem('token');
    if (!token) {
      SonixToast.show('Sign in to SONIX to like songs', 'info');
      SonixAuth.open();
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/songs/like-by-uri`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          spotifyUrl: _currentTrack.uri,
          title: _currentTrack.name,
          artist: _currentTrack.artist,
          coverImage: _currentTrack.img || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        SonixToast.show(data.liked ? '♥ Added to Liked Songs' : 'Removed from Liked Songs', 'success');
      }
    } catch {
      SonixToast.show('Could not update like', 'error');
    }
  }

  function _shareTrack() {
    const url = _currentTrack.uri
      ? `https://open.spotify.com/track/${_currentTrack.uri.split(':').pop()}`
      : window.location.href;

    if (navigator.share) {
      navigator.share({
        title: _currentTrack.name || 'SONIX',
        text: `Listen to ${_currentTrack.name} by ${_currentTrack.artist} on SONIX`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        SonixToast.show('Link copied to clipboard ✓', 'success');
      });
    }
  }

  async function _togglePlaylistSub() {
    const sub = document.getElementById('ctxPlaylistSub');
    if (!sub) return;

    if (sub.classList.contains('show')) {
      sub.classList.remove('show');
      return;
    }

    // Fetch SONIX playlists
    const token = localStorage.getItem('token');
    if (!token) {
      SonixToast.show('Sign in to SONIX to manage playlists', 'info');
      hide();
      SonixAuth.open();
      return;
    }

    sub.innerHTML = '<div class="snx-ctx-loading">Loading...</div>';
    sub.classList.add('show');

    try {
      const res = await fetch(`${BACKEND_URL}/playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const playlists = data.data || data || [];

      let html = `
        <button class="snx-ctx-item snx-ctx-create" data-action="create-playlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>
          <span>New Playlist</span>
        </button>`;

      if (Array.isArray(playlists)) {
        playlists.forEach(pl => {
          html += `
            <button class="snx-ctx-item" data-playlist-id="${escapeHTML(pl._id)}">
              <span>${escapeHTML(pl.name)}</span>
            </button>`;
        });
      }

      sub.innerHTML = html;

      // Bind create
      sub.querySelector('[data-action="create-playlist"]')?.addEventListener('click', e => {
        e.stopPropagation();
        hide();
        SonixPlaylist.openCreate(_currentTrack);
      });

      // Bind add to existing
      sub.querySelectorAll('[data-playlist-id]').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          await _addToPlaylist(btn.dataset.playlistId);
          hide();
        });
      });
    } catch {
      sub.innerHTML = '<div class="snx-ctx-loading">Failed to load</div>';
    }
  }

  async function _addToPlaylist(playlistId) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${BACKEND_URL}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          spotifyUrl: _currentTrack.uri,
          title: _currentTrack.name,
          artist: _currentTrack.artist,
          coverImage: _currentTrack.img || '',
        }),
      });
      if (res.ok) SonixToast.show('Added to playlist ✓', 'success');
      else SonixToast.show('Failed to add', 'error');
    } catch {
      SonixToast.show('Failed to add', 'error');
    }
  }

  function show(x, y, trackData) {
    _createMenu();
    _currentTrack = trackData;

    // Position menu
    const mw = 220, mh = 350;
    const vw = window.innerWidth, vh = window.innerHeight;
    _menu.style.left = (x + mw > vw ? x - mw : x) + 'px';
    _menu.style.top = (y + mh > vh ? y - mh : y) + 'px';

    // Hide submenu
    const sub = document.getElementById('ctxPlaylistSub');
    if (sub) sub.classList.remove('show');

    _menu.classList.add('show');
  }

  function hide() {
    if (_menu) _menu.classList.remove('show');
  }

  // Bind to all track elements in a container
  function bindToContainer(container) {
    if (!container) return;

    container.addEventListener('contextmenu', e => {
      const trackEl = e.target.closest('[data-uri], [data-spotify-uri]');
      if (!trackEl) return;

      e.preventDefault();

      const uri = trackEl.dataset.uri || trackEl.dataset.spotifyUri;
      const nameEl = trackEl.querySelector('.snx-tl-name, .snx-trow-name, .snx-card-name, .track-title, .track-name');
      const artistEl = trackEl.querySelector('.snx-tl-sub, .snx-trow-sub, .snx-card-sub, .track-artist');
      const imgEl = trackEl.querySelector('[style*="background:url"]');
      const imgMatch = imgEl?.getAttribute('style')?.match(/url\(([^)]+)\)/);

      show(e.clientX, e.clientY, {
        uri,
        name: nameEl?.textContent || '',
        artist: artistEl?.textContent || '',
        img: imgMatch?.[1] || '',
        artistId: trackEl.dataset.artistId || null,
      });
    });
  }

  return { show, hide, bindToContainer };
})();


// ═══════════════════════════════════════════════
//  4. PLAYLIST MANAGEMENT (Create / View)
// ═══════════════════════════════════════════════
const SonixPlaylist = (() => {
  let _modal = null;

  function _createModal() {
    if (_modal) return;

    const overlay = document.createElement('div');
    overlay.className = 'snx-modal-overlay';
    overlay.id = 'playlistModal';
    overlay.innerHTML = `
      <div class="snx-modal snx-playlist-modal">
        <button class="snx-modal-close" id="plModalClose">&times;</button>
        <h2>Create Playlist</h2>
        <form id="createPlaylistForm" class="snx-auth-form">
          <div class="snx-input-group">
            <label for="plName">Playlist Name</label>
            <input type="text" id="plName" placeholder="My awesome mix..." required maxlength="100" />
          </div>
          <div class="snx-auth-error" id="plError"></div>
          <button type="submit" class="snx-auth-submit">Create</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    _modal = overlay;

    overlay.querySelector('#plModalClose').addEventListener('click', _close);
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });

    document.getElementById('createPlaylistForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('plName').value.trim();
      const errEl = document.getElementById('plError');
      errEl.textContent = '';

      const token = localStorage.getItem('token');
      if (!token) {
        SonixToast.show('Sign in to SONIX first', 'info');
        _close();
        SonixAuth.open();
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/playlists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create');

        SonixToast.show(`Playlist "${name}" created ✓`, 'success');
        _close();

        // If there was a pending track to add, add it now
        if (_pendingTrack && data.data?._id) {
          await fetch(`${BACKEND_URL}/playlists/${data.data._id}/songs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              spotifyUrl: _pendingTrack.uri,
              title: _pendingTrack.name,
              artist: _pendingTrack.artist,
              coverImage: _pendingTrack.img || '',
            }),
          });
          SonixToast.show('Track added to the new playlist ✓', 'success');
          _pendingTrack = null;
        }
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  let _pendingTrack = null;

  function openCreate(trackToAdd = null) {
    _createModal();
    _pendingTrack = trackToAdd;
    document.getElementById('plName').value = '';
    document.getElementById('plError').textContent = '';
    _modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('plName').focus(), 100);
  }

  function _close() {
    if (_modal) {
      _modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  return { openCreate };
})();
