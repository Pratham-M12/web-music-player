/* ─────────────────────────────────────────────
   SONIX App Router
   Handles: home | search | artist/:id | album/:id | library | profile
   ──────────────────────────────────────────── */
'use strict';

const SonixRouter = (() => {
  let _currentView = 'home';
  let _mainEl = null;
  let _sidebarItems = [];

  function init(mainEl) {
    _mainEl = mainEl;
    navigate('home');
  }

  function navigate(view, id = null) {
    _currentView = view;
    _updateSidebarActive(view);

    switch (view) {
      case 'home':    renderHome();         break;
      case 'search':  renderSearch();       break;
      case 'library': renderLibrary();      break;
      case 'artist':  renderArtist(id);     break;
      case 'album':   renderAlbum(id);      break;
      case 'liked':   renderLikedSongs();   break;
      case 'profile': renderProfile();      break;
      default:        renderHome();
    }
    if (_mainEl) _mainEl.scrollTop = 0;
  }

  function _updateSidebarActive(view) {
    document.querySelectorAll('.snx-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────
  function _msToTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }
  function _fmtFollowers(n) {
    if (!n) return '';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
    return String(n);
  }
  function _playIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4L20 12L7 20V4Z"/></svg>`;
  }
  function _img(url, fallback = 'linear-gradient(135deg,#1a0533,#ff6b9d)') {
    return url ? `background:url(${escapeHTML(url)}) center/cover no-repeat` : `background:${fallback}`;
  }

  function _loading() {
    return `<div class="snx-loading"><div class="snx-spinner"></div></div>`;
  }

  function _extractBgUrl(el) {
    const style = el?.getAttribute('style') || '';
    const match = style.match(/url\(["']?([^"')]+)["']?\)/);
    return match?.[1] || '';
  }

  function _rememberRecent(track) {
    if (!track?.uri || !track.uri.includes(':track:')) return;
    if (typeof addToRecent !== 'function') return;

    addToRecent({
      uri: track.uri,
      name: track.name || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      coverImage: track.coverImage || '',
    });
  }

  function _rememberRecentFromElement(el) {
    if (!el?.dataset?.uri || !el.dataset.uri.includes(':track:')) return;

    const name =
      el.dataset.trackName ||
      el.querySelector('.snx-card-name, .snx-trow-name, .snx-tl-name, .snx-top-name')?.textContent ||
      'Unknown Track';

    const artist =
      el.dataset.trackArtist ||
      el.querySelector('.snx-card-sub, .snx-trow-sub, .snx-tl-sub, .snx-top-sub')?.textContent ||
      'Unknown Artist';

    const artEl = el.querySelector('.snx-card-img, .snx-trow-art, .snx-tl-art, .snx-top-img, .snx-quick-img');

    _rememberRecent({
      uri: el.dataset.uri,
      name: name.trim(),
      artist: artist.trim(),
      coverImage: el.dataset.trackCover || _extractBgUrl(artEl),
    });
  }

  // ─── HOME VIEW ──────────────────────────────────────────────────────────
  async function renderHome() {
    _mainEl.innerHTML = _loading();

    const user = await SpotifyAPI.getCurrentUser();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = user?.display_name?.split(' ')[0] || 'Listener';

    const [topTracksData, topArtistsData, newReleasesData, featuredData] = await Promise.all([
      SpotifyAPI.getTopTracks(8),
      SpotifyAPI.getTopArtists(8),
      SpotifyAPI.getNewReleases(),
      SpotifyAPI.getFeaturedPlaylists(),
    ]);

    const quickItems = [
      ...(topTracksData?.items || []).slice(0, 3).map(t => ({
        img: t.album?.images?.[0]?.url, name: t.name, uri: t.uri,
        artist: t.artists?.map(a => a.name).join(', '), type: 'track', id: t.id
      })),
      ...(topArtistsData?.items || []).slice(0, 3).map(a => ({
        img: a.images?.[0]?.url, name: a.name, uri: a.uri,
        type: 'artist', id: a.id
      })),
    ].slice(0, 6);

    let html = `
      <div class="snx-home">
        <div class="snx-greeting">
          <h1>${escapeHTML(greeting)}, ${escapeHTML(name)}</h1>
        </div>

        <!-- Quick picks grid -->
        <div class="snx-quick-grid">
          ${quickItems.map(item => `
            <div class="snx-quick-card" data-type="${escapeHTML(item.type)}" data-id="${escapeHTML(item.id)}" data-uri="${escapeHTML(item.uri)}" data-track-name="${escapeHTML(item.name || '')}" data-track-artist="${escapeHTML(item.artist || '')}" data-track-cover="${escapeHTML(item.img || '')}">
              <div class="snx-quick-img" style="${_img(item.img)}"></div>
              <span>${escapeHTML(item.name)}</span>
              <button class="snx-quick-play">${_playIcon()}</button>
            </div>`).join('')}
        </div>
        <div class="snx-view">
          <h2 class="section-title">Recently Played</h2>
          <div id="recentTracks" class="tracks-container"></div>
        </div>
        `;

    // Made For You — Top Tracks
    const tracks = topTracksData?.items || [];
    if (tracks.length) {
      html += `
        <div class="snx-row">
          <div class="snx-row-header">
            <h2>Your Top Songs</h2>
            <button class="snx-row-more" data-view="library">Show all</button>
          </div>
          <div class="snx-cards-scroll">
            ${tracks.map(t => `
              <div class="snx-card" data-uri="${escapeHTML(t.uri)}" data-type="track" data-track-name="${escapeHTML(t.name)}" data-track-artist="${escapeHTML(t.artists?.map(a => a.name).join(', '))}" data-track-cover="${escapeHTML(t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '')}">
                <div class="snx-card-img" style="${_img(t.album?.images?.[1]?.url || t.album?.images?.[0]?.url)}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(t.name)}</div>
                <div class="snx-card-sub">${escapeHTML(t.artists?.map(a => a.name).join(', '))}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    // Top Artists
    const artists = topArtistsData?.items || [];
    if (artists.length) {
      html += `
        <div class="snx-row">
          <div class="snx-row-header">
            <h2>Your Top Artists</h2>
          </div>
          <div class="snx-cards-scroll">
            ${artists.map(a => `
              <div class="snx-card snx-card-artist" data-id="${escapeHTML(a.id)}" data-type="artist">
                <div class="snx-card-img snx-card-img-circle" style="${_img(a.images?.[1]?.url || a.images?.[0]?.url)}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(a.name)}</div>
                <div class="snx-card-sub">Artist</div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    // New Releases
    const releases = newReleasesData?.albums?.items || [];
    if (releases.length) {
      html += `
        <div class="snx-row">
          <div class="snx-row-header"><h2>New Releases</h2></div>
          <div class="snx-cards-scroll">
            ${releases.map(al => `
              <div class="snx-card" data-id="${escapeHTML(al.id)}" data-type="album">
                <div class="snx-card-img" style="${_img(al.images?.[1]?.url || al.images?.[0]?.url)}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(al.name)}</div>
                <div class="snx-card-sub">${escapeHTML(al.artists?.map(a => a.name).join(', '))}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    // Featured Playlists
    const featured = featuredData?.playlists?.items || [];
    if (featured.length) {
      html += `
        <div class="snx-row">
          <div class="snx-row-header"><h2>${featuredData?.message || 'Featured'}</h2></div>
          <div class="snx-cards-scroll">
            ${featured.map(pl => `
              <div class="snx-card" data-uri="${escapeHTML(pl.uri)}" data-type="playlist">
                <div class="snx-card-img" style="${_img(pl.images?.[0]?.url)}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(pl.name)}</div>
                <div class="snx-card-sub">${escapeHTML(pl.description || pl.owner?.display_name || '')}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    html += `</div>`;
    _mainEl.innerHTML = html;
    _bindCards();
    if (typeof renderRecentSongs === 'function') renderRecentSongs();
  }

  // ─── SEARCH VIEW ────────────────────────────────────────────────────────
  async function renderSearch(query = '') {
    const cats = await SpotifyAPI.getCategories();
    const categories = cats?.categories?.items || [];

    const catColors = ['#1e3a5f','#2d1b4e','#1a3a1a','#4a1a00','#1a1a4a','#3a0d12',
      '#0d3a3a','#2e1b00','#1a2e00','#2e002e','#003a2e','#1a0a3a'];

    _mainEl.innerHTML = `
      <div class="snx-search-page">
        <div class="snx-search-bar-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="snxSearchInput" placeholder="What do you want to listen to?" 
            autocomplete="off" value="${query}"/>
        </div>

        <div id="snxSearchResults">
          ${query ? '' : `
            <div class="snx-search-section-title">Browse all</div>
            <div class="snx-categories-grid">
              ${categories.map((c, i) => `
                <div class="snx-cat-card" style="background:${catColors[i % catColors.length]}"
                  data-type="category" data-id="${c.id}">
                  <span>${c.name}</span>
                  ${c.icons?.[0]?.url ? `<img src="${c.icons[0].url}" alt="">` : ''}
                </div>`).join('')}
            </div>`}
        </div>
      </div>`;

    const inp = document.getElementById('snxSearchInput');
    if (inp) {
      inp.focus();
      let timer;
      inp.addEventListener('input', () => {
        clearTimeout(timer);
        const q = inp.value.trim();
        if (!q) {
          document.getElementById('snxSearchResults').innerHTML = `
            <div class="snx-search-section-title">Browse all</div>
            <div class="snx-categories-grid">
              ${categories.map((c, i) => `
                <div class="snx-cat-card" style="background:${catColors[i % catColors.length]}" data-type="category" data-id="${c.id}">
                  <span>${c.name}</span>${c.icons?.[0]?.url ? `<img src="${c.icons[0].url}" alt="">` : ''}
                </div>`).join('')}
            </div>`;
          return;
        }
        document.getElementById('snxSearchResults').innerHTML = `<div class="snx-loading"><div class="snx-spinner"></div></div>`;
        timer = setTimeout(() => _doSearch(q), 350);
      });
    }
    if (query) _doSearch(query);
  }

  async function _doSearch(q) {
    const el = document.getElementById('snxSearchResults');
    if (!el) return;
    const data = await SpotifyAPI.search(q, 'track,artist,album', 8);
    if (!data) { el.innerHTML = '<p class="snx-no-results">No results found.</p>'; return; }

    const tracks  = data.tracks?.items  || [];
    const artists = data.artists?.items || [];
    const albums  = data.albums?.items  || [];
    let html = '';

    // Top result (first artist or first track)
    const top = artists[0] || tracks[0];
    if (top) {
      const isArtist = !!artists[0];
      const img = isArtist ? (top.images?.[1]?.url || top.images?.[0]?.url) : (top.album?.images?.[0]?.url);
      html += `
        <div class="snx-search-top">
          <div class="snx-search-top-left">
            <h2>Top result</h2>
            <div class="snx-top-card" data-type="${isArtist ? 'artist' : 'track'}" data-id="${top.id}" data-uri="${top.uri || ''}" data-track-name="${!isArtist ? escapeHTML(top.name) : ''}" data-track-artist="${!isArtist ? escapeHTML(top.artists?.map(a => a.name).join(', ')) : ''}" data-track-cover="${!isArtist ? escapeHTML(img || '') : ''}">
              <div class="snx-top-img ${isArtist ? 'snx-top-img-circle' : ''}" style="${_img(img)}"></div>
              <div class="snx-top-name">${top.name}</div>
              <div class="snx-top-sub">${isArtist ? 'Artist' : top.artists?.map(a => a.name).join(', ')}</div>
              <button class="snx-top-play">${_playIcon()}</button>
            </div>
          </div>
          <div class="snx-search-top-right">
            <h2>Songs</h2>
            <div class="snx-track-list">
              ${tracks.slice(0, 4).map(t => `
                <div class="snx-track-row" data-uri="${escapeHTML(t.uri)}" data-track-name="${escapeHTML(t.name)}" data-track-artist="${escapeHTML(t.artists?.map(a => a.name).join(', '))}" data-track-cover="${escapeHTML(t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || '')}">
                  <div class="snx-trow-art" style="${_img(t.album?.images?.[2]?.url || t.album?.images?.[0]?.url)}">
                    <div class="snx-trow-overlay">${_playIcon()}</div>
                  </div>
                  <div class="snx-trow-info">
                    <div class="snx-trow-name">${escapeHTML(t.name)}</div>
                    <div class="snx-trow-sub">${escapeHTML(t.artists?.map(a => a.name).join(', '))}</div>
                  </div>
                  <div class="snx-trow-dur">${_msToTime(t.duration_ms)}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>`;
    }

    // Artists row
    if (artists.length) {
      html += `
        <div class="snx-row">
          <div class="snx-row-header"><h2>Artists</h2></div>
          <div class="snx-cards-scroll">
            ${artists.map(a => `
              <div class="snx-card snx-card-artist" data-id="${escapeHTML(a.id)}" data-type="artist">
                <div class="snx-card-img snx-card-img-circle" style="${_img(a.images?.[1]?.url || a.images?.[0]?.url, 'linear-gradient(135deg,#1a0533,#c77dff)')}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(a.name)}</div>
                <div class="snx-card-sub">Artist · ${_fmtFollowers(a.followers?.total)} followers</div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    // Albums row
    if (albums.length) {
      html += `
        <div class="snx-row">
          <div class="snx-row-header"><h2>Albums</h2></div>
          <div class="snx-cards-scroll">
            ${albums.map(al => `
              <div class="snx-card" data-id="${escapeHTML(al.id)}" data-type="album">
                <div class="snx-card-img" style="${_img(al.images?.[1]?.url || al.images?.[0]?.url)}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(al.name)}</div>
                <div class="snx-card-sub">${al.release_date?.slice(0, 4)} · ${escapeHTML(al.artists?.map(a => a.name).join(', '))}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    el.innerHTML = html || '<p class="snx-no-results">No results found.</p>';
    _bindCards();
  }

  // ─── ARTIST VIEW ────────────────────────────────────────────────────────
  async function renderArtist(id) {
    _mainEl.innerHTML = _loading();
    const [artist, topTracksData, albumsData, relatedData] = await Promise.all([
      SpotifyAPI.getArtist(id),
      SpotifyAPI.getArtistTopTracks(id),
      SpotifyAPI.getArtistAlbums(id),
      SpotifyAPI.getRelatedArtists(id),
    ]);

    if (!artist) { _mainEl.innerHTML = '<p class="snx-no-results">Artist not found.</p>'; return; }

    const img        = artist.images?.[0]?.url || '';
    const followers  = _fmtFollowers(artist.followers?.total);
    const genre      = artist.genres?.[0] || '';
    const tracks     = topTracksData?.tracks || [];
    const albums     = albumsData?.items || [];
    const related    = relatedData?.artists?.slice(0, 8) || [];

    let html = `
      <div class="snx-artist-page">
        <!-- Hero -->
        <div class="snx-artist-hero" style="${img ? `--hero-img:url(${img})` : ''}">
          <div class="snx-artist-hero-bg"></div>
          <div class="snx-artist-hero-content">
            <div class="snx-artist-avatar ${!img ? 'snx-artist-avatar-placeholder' : ''}" style="${_img(img, 'linear-gradient(135deg,#1a0533,#c77dff)')}"></div>
            <div class="snx-artist-hero-info">
              <span class="snx-verified">✓ Verified Artist</span>
              <h1 class="snx-artist-name">${escapeHTML(artist.name)}</h1>
              <p class="snx-artist-followers">${followers ? `${escapeHTML(followers)} followers` : ''}${genre ? ` · ${escapeHTML(genre)}` : ''}</p>
            </div>
          </div>
          <div class="snx-artist-hero-actions">
            <button class="snx-play-big" id="artistPlayBtn">▶ Play</button>
            <button class="snx-follow-btn" id="artistFollowBtn">Follow</button>
          </div>
        </div>

        <!-- Popular tracks -->
        <div class="snx-artist-section">
          <h2>Popular</h2>
          <div class="snx-tracklist">
            ${tracks.slice(0, 10).map((t, i) => `
              <div class="snx-tl-row" data-uri="${escapeHTML(t.uri)}" data-track-name="${escapeHTML(t.name)}" data-track-artist="${escapeHTML(artist.name)}" data-track-cover="${escapeHTML(t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || '')}">
                <div class="snx-tl-num">${i + 1}</div>
                <div class="snx-tl-art" style="${_img(t.album?.images?.[2]?.url || t.album?.images?.[0]?.url)}">
                  <div class="snx-tl-overlay">${_playIcon()}</div>
                </div>
                <div class="snx-tl-info">
                  <div class="snx-tl-name">${escapeHTML(t.name)}</div>
                </div>
                <div class="snx-tl-album">${escapeHTML(t.album?.name || '')}</div>
                <div class="snx-tl-dur">${_msToTime(t.duration_ms)}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Discography -->
        ${albums.length ? `
        <div class="snx-row">
          <div class="snx-row-header">
            <h2>Discography</h2>
          </div>
          <div class="snx-cards-scroll">
            ${albums.map(al => `
              <div class="snx-card" data-id="${al.id}" data-type="album">
                <div class="snx-card-img" style="${_img(al.images?.[1]?.url || al.images?.[0]?.url)}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(al.name)}</div>
                <div class="snx-card-sub">${al.release_date?.slice(0, 4)} · ${escapeHTML(al.album_type)}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Related artists -->
        ${related.length ? `
        <div class="snx-row">
          <div class="snx-row-header"><h2>Fans also like</h2></div>
          <div class="snx-cards-scroll">
            ${related.map(a => `
              <div class="snx-card snx-card-artist" data-id="${a.id}" data-type="artist">
                <div class="snx-card-img snx-card-img-circle" style="${_img(a.images?.[1]?.url || a.images?.[0]?.url, 'linear-gradient(135deg,#1a0533,#c77dff)')}">
                  <button class="snx-card-play">${_playIcon()}</button>
                </div>
                <div class="snx-card-name">${escapeHTML(a.name)}</div>
                <div class="snx-card-sub">Artist</div>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;

    _mainEl.innerHTML = html;
    _bindCards();

    // Hero play button
    document.getElementById('artistPlayBtn')?.addEventListener('click', () => {
      if (tracks[0]) {
        _rememberRecent({
          uri: tracks[0].uri,
          name: tracks[0].name,
          artist: artist.name,
          coverImage: tracks[0].album?.images?.[0]?.url || '',
        });
        SpotifyAPI.playTrack(tracks[0].uri);
      }
    });
  }

  // ─── ALBUM VIEW ─────────────────────────────────────────────────────────
  async function renderAlbum(id) {
    _mainEl.innerHTML = _loading();
    const album = await SpotifyAPI.getAlbum(id);
    if (!album) { _mainEl.innerHTML = '<p class="snx-no-results">Album not found.</p>'; return; }

    const img      = album.images?.[0]?.url || '';
    const artist   = album.artists?.map(a => a.name).join(', ');
    const year     = album.release_date?.slice(0, 4);
    const total    = album.tracks?.total || album.total_tracks;
    const tracks   = album.tracks?.items || [];
    const duration = tracks.reduce((s, t) => s + (t.duration_ms || 0), 0);

    _mainEl.innerHTML = `
      <div class="snx-album-page">
        <div class="snx-album-hero">
          <div class="snx-album-hero-bg" style="${img ? `--hero-img:url(${img})` : ''}"></div>
          <div class="snx-album-cover" style="${_img(img)}"></div>
          <div class="snx-album-info">
            <span class="snx-album-type">${album.album_type?.toUpperCase() || 'ALBUM'}</span>
            <h1 class="snx-album-title">${escapeHTML(album.name)}</h1>
            <div class="snx-album-meta">
              ${img ? `<img src="${img}" class="snx-album-artist-img" alt="">` : ''}
              <span class="snx-album-artist" data-type="artist" data-id="${escapeHTML(album.artists?.[0]?.id)}">${escapeHTML(artist)}</span>
              <span>·</span><span>${year}</span>
              <span>·</span><span>${total} songs</span>
              <span>·</span><span>${_msToTime(duration)}</span>
            </div>
          </div>
        </div>

        <div class="snx-album-actions">
          <button class="snx-play-big" id="albumPlayBtn">▶ Play</button>
        </div>

        <div class="snx-tracklist snx-tracklist-album">
          <div class="snx-tl-header">
            <span class="snx-tl-num">#</span>
            <span>Title</span>
            <span class="snx-tl-dur-head">⏱</span>
          </div>
          ${tracks.map((t, i) => `
            <div class="snx-tl-row" data-uri="${escapeHTML(t.uri)}" data-track-name="${escapeHTML(t.name)}" data-track-artist="${escapeHTML(t.artists?.map(a => a.name).join(', '))}" data-track-cover="${escapeHTML(img)}">
              <div class="snx-tl-num">${i + 1}</div>
              <div class="snx-tl-info">
                <div class="snx-tl-name">${escapeHTML(t.name)}</div>
                <div class="snx-tl-sub">${escapeHTML(t.artists?.map(a => a.name).join(', '))}</div>
              </div>
              <div class="snx-tl-dur">${_msToTime(t.duration_ms)}</div>
            </div>`).join('')}
        </div>
      </div>`;

    _bindCards();
    document.getElementById('albumPlayBtn')?.addEventListener('click', () => {
      SpotifyAPI.playContext(album.uri);
    });
    document.querySelector('.snx-album-artist')?.addEventListener('click', e => {
      const id = e.target.dataset.id;
      if (id) navigate('artist', id);
    });
  }

  // ─── LIBRARY VIEW ───────────────────────────────────────────────────────
  async function renderLibrary() {
    _mainEl.innerHTML = _loading();

    const [playlists, savedAlbums, followedArtists, likedData] = await Promise.all([
      SpotifyAPI.getUserPlaylists(),
      SpotifyAPI.getSavedAlbums(),
      SpotifyAPI.getFollowedArtists(),
      SpotifyAPI.getLikedSongs(),
    ]);

    const likedCount = likedData?.total || 0;
    const pls   = playlists?.items || [];
    const albs  = savedAlbums?.items?.map(i => i.album) || [];
    const arts  = followedArtists?.artists?.items || [];

    let html = `<div class="snx-library-page">
      <div class="snx-lib-header">
        <h1>Your Library</h1>
        <div class="snx-lib-tabs">
          <button class="snx-lib-tab active" data-filter="all">All</button>
          <button class="snx-lib-tab" data-filter="playlist">Playlists</button>
          <button class="snx-lib-tab" data-filter="album">Albums</button>
          <button class="snx-lib-tab" data-filter="artist">Artists</button>
        </div>
      </div>

      <div class="snx-lib-list" id="snxLibList">`;

    // Liked Songs card
    html += `
      <div class="snx-lib-item" data-filter="playlist">
        <div class="snx-lib-img snx-lib-liked">
          <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div class="snx-lib-info">
          <div class="snx-lib-name">Liked Songs</div>
          <div class="snx-lib-sub">Playlist · ${likedCount} songs</div>
        </div>
      </div>`;

    // Playlists
    pls.forEach(pl => {
      html += `
        <div class="snx-lib-item" data-filter="playlist" data-uri="${pl.uri}">
          <div class="snx-lib-img" style="${_img(pl.images?.[0]?.url)}"></div>
          <div class="snx-lib-info">
            <div class="snx-lib-name">${pl.name}</div>
            <div class="snx-lib-sub">Playlist · ${pl.owner?.display_name || ''}</div>
          </div>
        </div>`;
    });

    // Saved albums
    albs.forEach(al => {
      html += `
        <div class="snx-lib-item" data-filter="album" data-id="${al.id}" data-type="album">
          <div class="snx-lib-img" style="${_img(al.images?.[1]?.url || al.images?.[0]?.url)}"></div>
          <div class="snx-lib-info">
            <div class="snx-lib-name">${al.name}</div>
            <div class="snx-lib-sub">Album · ${al.artists?.map(a => a.name).join(', ')}</div>
          </div>
        </div>`;
    });

    // Followed artists
    arts.forEach(a => {
      html += `
        <div class="snx-lib-item" data-filter="artist" data-id="${a.id}" data-type="artist">
          <div class="snx-lib-img snx-lib-img-circle" style="${_img(a.images?.[1]?.url || a.images?.[0]?.url, 'linear-gradient(135deg,#1a0533,#c77dff)')}"></div>
          <div class="snx-lib-info">
            <div class="snx-lib-name">${a.name}</div>
            <div class="snx-lib-sub">Artist</div>
          </div>
        </div>`;
    });

    html += `</div></div>`;
    _mainEl.innerHTML = html;

    // Tab filtering
    document.querySelectorAll('.snx-lib-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.snx-lib-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        document.querySelectorAll('.snx-lib-item').forEach(item => {
          item.style.display = (filter === 'all' || item.dataset.filter === filter) ? '' : 'none';
        });
      });
    });

    // Click to navigate
    document.querySelectorAll('.snx-lib-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        navigate(item.dataset.type, item.dataset.id);
      });
    });
    document.querySelectorAll('.snx-lib-item[data-uri]').forEach(item => {
      item.addEventListener('click', () => {
        SpotifyAPI.playContext(item.dataset.uri);
      });
    });
  }

  // PROFILE / SETTINGS VIEW
  async function renderProfile() {
    _mainEl.innerHTML = _loading();

    const token = localStorage.getItem('token');
    const spotifyUser = SpotifyAPI.isLoggedIn() ? await SpotifyAPI.getCurrentUser() : null;

    if (!token && spotifyUser) {
      const displayName = spotifyUser.display_name || 'Spotify Listener';
      const avatarUrl = spotifyUser.images?.[0]?.url || '';
      const initials = displayName.trim().slice(0, 1).toUpperCase();
      const followers = spotifyUser.followers?.total;
      const followersText = Number.isFinite(followers) ? `${_fmtFollowers(followers)} followers` : 'Spotify connected';

      _mainEl.innerHTML = `
        <div class="snx-profile-page">
          <div class="snx-profile-hero">
            <div class="snx-profile-hero-bg" style="${avatarUrl ? `--profile-img:url(${escapeHTML(avatarUrl)})` : ''}"></div>
            <div class="snx-profile-avatar ${avatarUrl ? '' : 'snx-profile-avatar-empty'}" style="${avatarUrl ? `background:url(${escapeHTML(avatarUrl)}) center/cover` : ''}">
              ${avatarUrl ? '' : `<span>${escapeHTML(initials)}</span>`}
            </div>
            <div class="snx-profile-hero-info">
              <span class="snx-verified">SPOTIFY CONNECTED</span>
              <h1 class="snx-artist-name">${escapeHTML(displayName)}</h1>
              <p class="snx-artist-followers">${escapeHTML(spotifyUser.email || followersText)}</p>
            </div>
          </div>

          <div class="snx-profile-form">
            <div class="snx-profile-grid">
              <section class="snx-profile-panel">
                <div class="snx-profile-panel-head">
                  <h2>Spotify Account</h2>
                  <p>Your Spotify login is active. Playback, search, library, artists, and albums can use this account.</p>
                </div>
                <div class="snx-profile-stat-list">
                  <div><span>Country</span><strong>${escapeHTML(spotifyUser.country || 'Not shared')}</strong></div>
                  <div><span>Product</span><strong>${escapeHTML(spotifyUser.product || 'Not shared')}</strong></div>
                  <div><span>Profile</span><strong>${escapeHTML(spotifyUser.type || 'User')}</strong></div>
                </div>
              </section>

              <section class="snx-profile-panel">
                <div class="snx-profile-panel-head">
                  <h2>SONIX Preferences</h2>
                  <p>Create or sign in to a SONIX account to save bio, avatar, favorite genres, autoplay, explicit-content settings, liked songs, and playlists.</p>
                </div>
                <button class="snx-play-big" id="profileSigninBtn" type="button">Sign in to SONIX</button>
              </section>
            </div>
          </div>
        </div>`;

      document.getElementById('profileSigninBtn')?.addEventListener('click', () => SonixAuth.open());
      return;
    }

    if (!token) {
      _mainEl.innerHTML = `
        <div class="snx-profile-page">
          <div class="snx-profile-hero">
            <div class="snx-profile-hero-bg"></div>
            <div class="snx-profile-avatar snx-profile-avatar-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="snx-profile-hero-info">
              <span class="snx-verified">SONIX PROFILE</span>
              <h1 class="snx-artist-name">Make it yours.</h1>
              <p class="snx-artist-followers">Sign in to save your profile, preferences, playlists, liked songs, and listening history.</p>
            </div>
          </div>
          <div class="snx-profile-actions">
            <button class="snx-play-big" id="profileSigninBtn">Sign in to SONIX</button>
            <button class="snx-follow-btn" id="profileSpotifyBtn">Continue with Spotify</button>
          </div>
        </div>`;

      document.getElementById('profileSigninBtn')?.addEventListener('click', () => SonixAuth.open());
      document.getElementById('profileSpotifyBtn')?.addEventListener('click', () => SpotifyAPI.login());
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not load profile');

      const profile = payload.data || {};
      const preferences = profile.preferences || {};
      const selectedGenres = Array.isArray(preferences.genres) ? preferences.genres : [];
      const displayName = profile.displayName || profile.username || spotifyUser?.display_name || 'Listener';
      const avatarUrl = profile.avatarUrl || spotifyUser?.images?.[0]?.url || '';
      const initials = (displayName || 'S').trim().slice(0, 1).toUpperCase();
      const validGenres = [
        'pop', 'rock', 'hip-hop', 'electronic', 'jazz',
        'classical', 'r&b', 'metal', 'indie', 'folk',
        'latin', 'country', 'blues', 'reggae', 'soul',
      ];

      _mainEl.innerHTML = `
        <div class="snx-profile-page">
          <div class="snx-profile-hero">
            <div class="snx-profile-hero-bg" style="${avatarUrl ? `--profile-img:url(${escapeHTML(avatarUrl)})` : ''}"></div>
            <div class="snx-profile-avatar ${avatarUrl ? '' : 'snx-profile-avatar-empty'}" id="profileAvatarPreview" style="${avatarUrl ? `background:url(${escapeHTML(avatarUrl)}) center/cover` : ''}">
              ${avatarUrl ? '' : `<span>${escapeHTML(initials)}</span>`}
            </div>
            <div class="snx-profile-hero-info">
              <span class="snx-verified">SONIX PROFILE</span>
              <h1 class="snx-artist-name" id="profileHeroName">${escapeHTML(displayName)}</h1>
              <p class="snx-artist-followers">${escapeHTML(profile.email || '')}${spotifyUser?.display_name ? ` &middot; Spotify: ${escapeHTML(spotifyUser.display_name)}` : ''}</p>
            </div>
          </div>

          <form class="snx-profile-form" id="profileForm">
            <div class="snx-profile-grid">
              <section class="snx-profile-panel">
                <div class="snx-profile-panel-head">
                  <h2>Public Profile</h2>
                  <p>Your name, avatar, and short note across SONIX.</p>
                </div>

                <div class="snx-input-group">
                  <label for="profileDisplayName">Display Name</label>
                  <input type="text" id="profileDisplayName" maxlength="40" value="${escapeHTML(profile.displayName || '')}" placeholder="${escapeHTML(profile.username || 'Your name')}" />
                </div>

                <div class="snx-input-group">
                  <label for="profileBio">Bio</label>
                  <textarea id="profileBio" maxlength="200" placeholder="A line about your sound.">${escapeHTML(profile.bio || '')}</textarea>
                  <div class="snx-profile-count"><span id="profileBioCount">${String((profile.bio || '').length)}</span>/200</div>
                </div>

                <div class="snx-input-group">
                  <label for="profileAvatarUrl">Avatar URL</label>
                  <input type="url" id="profileAvatarUrl" value="${escapeHTML(profile.avatarUrl || '')}" placeholder="https://example.com/avatar.jpg" />
                </div>
              </section>

              <section class="snx-profile-panel">
                <div class="snx-profile-panel-head">
                  <h2>Listening</h2>
                  <p>Tune recommendations and playback behavior.</p>
                </div>

                <div class="snx-input-group">
                  <label>Favorite Genres</label>
                  <div class="snx-genre-pills" id="profileGenrePills">
                    ${validGenres.map(genre => `
                      <label class="snx-genre-pill ${selectedGenres.includes(genre) ? 'active' : ''}">
                        <input type="checkbox" value="${escapeHTML(genre)}" ${selectedGenres.includes(genre) ? 'checked' : ''} />
                        <span>${escapeHTML(genre)}</span>
                      </label>`).join('')}
                  </div>
                  <p class="snx-profile-hint">Choose up to 5 genres.</p>
                </div>

                <div class="snx-input-group">
                  <label for="profileLanguage">Language</label>
                  <select id="profileLanguage">
                    ${['en', 'hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'gu'].map(lang => `
                      <option value="${lang}" ${(preferences.language || 'en') === lang ? 'selected' : ''}>${lang.toUpperCase()}</option>`).join('')}
                  </select>
                </div>

                <label class="snx-switch-row">
                  <span>
                    <strong>Explicit Content</strong>
                    <small>Allow explicit songs in recommendations.</small>
                  </span>
                  <input type="checkbox" id="profileExplicit" ${preferences.explicitContent !== false ? 'checked' : ''} />
                </label>

                <label class="snx-switch-row">
                  <span>
                    <strong>Autoplay</strong>
                    <small>Keep music going when your queue ends.</small>
                  </span>
                  <input type="checkbox" id="profileAutoplay" ${preferences.autoplay !== false ? 'checked' : ''} />
                </label>
              </section>
            </div>

            <div class="snx-profile-footer">
              <div>
                <div class="snx-auth-error" id="profileError"></div>
                <p class="snx-profile-hint">Saved to your SONIX account.</p>
              </div>
              <div class="snx-profile-footer-actions">
                <button type="button" class="snx-follow-btn" id="profileResetBtn">Reset</button>
                <button type="submit" class="snx-play-big" id="profileSaveBtn">Save Profile</button>
              </div>
            </div>
          </form>
        </div>`;

      _bindProfileForm(token, profile, spotifyUser, initials);
    } catch (err) {
      _mainEl.innerHTML = `
        <div class="snx-profile-page">
          <div class="snx-no-results">${escapeHTML(err.message || 'Could not load profile.')}</div>
        </div>`;
    }
  }

  function _bindProfileForm(token, profile, spotifyUser, fallbackInitial) {
    const form = document.getElementById('profileForm');
    const errorEl = document.getElementById('profileError');
    const bio = document.getElementById('profileBio');
    const bioCount = document.getElementById('profileBioCount');
    const displayName = document.getElementById('profileDisplayName');
    const avatarUrl = document.getElementById('profileAvatarUrl');
    const avatarPreview = document.getElementById('profileAvatarPreview');
    const heroName = document.getElementById('profileHeroName');
    const genrePills = document.getElementById('profileGenrePills');

    bio?.addEventListener('input', () => {
      if (bioCount) bioCount.textContent = String(bio.value.length);
    });

    displayName?.addEventListener('input', () => {
      const nextName = displayName.value.trim() || profile.username || spotifyUser?.display_name || 'Listener';
      if (heroName) heroName.textContent = nextName;
      if (avatarPreview && !avatarUrl.value.trim()) {
        avatarPreview.innerHTML = `<span>${escapeHTML(nextName.slice(0, 1).toUpperCase() || fallbackInitial)}</span>`;
      }
    });

    avatarUrl?.addEventListener('input', () => {
      const url = avatarUrl.value.trim();
      if (!avatarPreview) return;
      if (url) {
        avatarPreview.classList.remove('snx-profile-avatar-empty');
        avatarPreview.style.background = `url(${url}) center/cover`;
        avatarPreview.innerHTML = '';
      } else {
        const nextName = displayName.value.trim() || profile.username || spotifyUser?.display_name || 'Listener';
        avatarPreview.classList.add('snx-profile-avatar-empty');
        avatarPreview.style.background = '';
        avatarPreview.innerHTML = `<span>${escapeHTML(nextName.slice(0, 1).toUpperCase() || fallbackInitial)}</span>`;
      }
    });

    genrePills?.addEventListener('change', e => {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      const checked = [...genrePills.querySelectorAll('input:checked')];
      if (checked.length > 5) {
        input.checked = false;
        SonixToast.show('Choose up to 5 genres', 'info');
      }
      genrePills.querySelectorAll('.snx-genre-pill').forEach(label => {
        const cb = label.querySelector('input');
        label.classList.toggle('active', cb.checked);
      });
    });

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      if (errorEl) errorEl.textContent = '';

      const genres = [...document.querySelectorAll('#profileGenrePills input:checked')].map(input => input.value);
      const body = {
        displayName: displayName.value.trim(),
        bio: bio.value.trim(),
        avatarUrl: avatarUrl.value.trim(),
        preferences: {
          genres,
          explicitContent: document.getElementById('profileExplicit').checked,
          autoplay: document.getElementById('profileAutoplay').checked,
          language: document.getElementById('profileLanguage').value,
        },
      };

      try {
        const res = await fetch(`${BACKEND_URL}/profile/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          const details = Array.isArray(data.details) ? data.details.map(d => d.message).join(', ') : '';
          throw new Error(details || data.error || 'Could not save profile');
        }

        SonixToast.show('Profile saved', 'success');
        renderProfile();
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
        SonixToast.show('Could not save profile', 'error');
      }
    });

    document.getElementById('profileResetBtn')?.addEventListener('click', async () => {
      if (!confirm('Reset profile details and preferences?')) return;
      try {
        const res = await fetch(`${BACKEND_URL}/profile/me`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Could not reset profile');
        SonixToast.show('Profile reset', 'success');
        renderProfile();
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
        SonixToast.show('Could not reset profile', 'error');
      }
    });
  }

  // CARD BINDING
  function _bindCards() {
    // Navigate on card click (artist/album)
    _mainEl.querySelectorAll('.snx-card[data-type="artist"], .snx-track-row[data-type="artist"], .snx-top-card[data-type="artist"]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.snx-card-play, .snx-top-play')) return;
        navigate('artist', el.dataset.id);
      });
    });
    _mainEl.querySelectorAll('.snx-card[data-type="album"]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.snx-card-play')) return;
        navigate('album', el.dataset.id);
      });
    });

    // Play buttons on cards
    _mainEl.querySelectorAll('.snx-card-play').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('[data-uri],[data-id]');
        if (!card) return;
        if (card.dataset.uri) {
          const type = card.dataset.type;
          if (type === 'track') {
            _rememberRecentFromElement(card);
            SpotifyAPI.playTrack(card.dataset.uri);
          } else {
            SpotifyAPI.playContext(card.dataset.uri);
          }
        } else if (card.dataset.type === 'artist') {
          navigate('artist', card.dataset.id);
        } else if (card.dataset.type === 'album') {
          navigate('album', card.dataset.id);
        }
      });
    });

    // Quick grid
    _mainEl.querySelectorAll('.snx-quick-card').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.snx-quick-play')) {
          if (el.dataset.type === 'track' && el.dataset.uri) {
            _rememberRecentFromElement(el);
            SpotifyAPI.playTrack(el.dataset.uri);
          } else if (el.dataset.uri) {
            SpotifyAPI.playContext(el.dataset.uri);
          } else {
            navigate(el.dataset.type, el.dataset.id);
          }
          return;
        }
        if (el.dataset.type === 'artist') navigate('artist', el.dataset.id);
        else if (el.dataset.type === 'track' && el.dataset.uri) {
          _rememberRecentFromElement(el);
          SpotifyAPI.playTrack(el.dataset.uri);
        }
      });
    });

    // Track rows (search results & artist page)
    _mainEl.querySelectorAll('.snx-tl-row, .snx-track-row').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.uri) {
          _rememberRecentFromElement(el);
          SpotifyAPI.playTrack(el.dataset.uri);
        }
      });
    });

    // Top result card
    _mainEl.querySelectorAll('.snx-top-card').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.snx-top-play')) {
          if (el.dataset.uri) {
            _rememberRecentFromElement(el);
            SpotifyAPI.playTrack(el.dataset.uri);
          }
          return;
        }
        if (el.dataset.type === 'artist') navigate('artist', el.dataset.id);
        else if (el.dataset.type === 'track' && el.dataset.uri) {
          _rememberRecentFromElement(el);
          SpotifyAPI.playTrack(el.dataset.uri);
        }
      });
    });

    // "Show all" buttons
    _mainEl.querySelectorAll('.snx-row-more').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view || 'library'));
    });
  }

  return { init, navigate };
})();
