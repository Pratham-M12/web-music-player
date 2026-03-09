/* app.js — SONIX Cinematic Music Site */
'use strict';

// ─────────────────────────────────────────────
//  Wait for GSAP + Lenis to load
// ─────────────────────────────────────────────
window.addEventListener('load', async () => {
  initCursor();
  initLenis();
  initGSAP();
  initNav();
  initArtistsDrag();
  initTracks();
  initPlayer();
  initCounters();
  initMobileNav();
  initSearch();

  // ── Spotify: check for OAuth callback code in URL
  const urlParams   = new URLSearchParams(window.location.search);
  const spotifyCode = urlParams.get('spotify_code');

  if (spotifyCode) {
    const ok = await SpotifyAPI.handleCallback(spotifyCode);
    if (ok) await onSpotifyLogin();
  } else if (SpotifyAPI.loadToken()) {
    await onSpotifyLogin();
  }
});

async function onSpotifyLogin() {
  SpotifyAPI.updateLoginUI(true);
  SpotifyAPI.initSDK();

  // ── Switch to app layout ──────────────────────────────────────
  const landing = document.getElementById('landing') ||
    document.querySelector('.hero')?.closest('body > *:not(#sonixApp):not(.navbar):not(.search-overlay):not(#cursorOuter):not(#cursorDot):not(.player-bar):not(script)');
  const appEl   = document.getElementById('sonixApp');
  const navbar  = document.getElementById('navbar');

  // Hide the landing page sections — wrap check
  document.querySelectorAll(
    '.hero, .ticker-bar, .artists-section, .trending-section, .albums-section, .genres-section, .events-section, .cta-section, footer'
  ).forEach(el => el.style.display = 'none');

  // Show app
  if (appEl) {
    appEl.style.cssText = 'display:flex;position:fixed;inset:0;bottom:80px;z-index:100;';
  }
  if (navbar) navbar.style.display = 'none';

  // ── Sidebar nav binding ───────────────────────────────────────
  document.querySelectorAll('.snx-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      SonixRouter.navigate(btn.dataset.view);
    });
  });

  // ── Initialize router with main content el ───────────────────
  const mainEl = document.getElementById('snxMain');
  if (mainEl) SonixRouter.init(mainEl);

  // ── Populate sidebar library ──────────────────────────────────
  _populateSidebar();
}

async function _populateSidebar() {
  const container = document.getElementById('snxSidebarItems');
  if (!container) return;

  const [playlists, artists] = await Promise.all([
    SpotifyAPI.getUserPlaylists(),
    SpotifyAPI.getFollowedArtists(),
  ]);

  const pls  = playlists?.items || [];
  const arts = artists?.artists?.items || [];

  let html = `
    <div class="snx-sidebar-liked" data-action="navigate" data-view="library">
      <div class="snx-liked-icon">
        <svg viewBox="0 0 24 24" fill="#fff" width="18" height="18"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div class="snx-sidebar-item-info">
        <span class="snx-si-name">Liked Songs</span>
        <span class="snx-si-sub">Playlist</span>
      </div>
    </div>`;

  pls.slice(0, 10).forEach(pl => {
    const img = pl.images?.[0]?.url;
    html += `
      <div class="snx-sidebar-item" data-action="play" data-uri="${pl.uri}">
        <div class="snx-si-img" style="${img ? `background:url(${img}) center/cover` : 'background:linear-gradient(135deg,#1a0533,#ff6b9d)'}"></div>
        <div class="snx-sidebar-item-info">
          <span class="snx-si-name">${pl.name}</span>
          <span class="snx-si-sub">Playlist · ${pl.owner?.display_name || ''}</span>
        </div>
      </div>`;
  });

  arts.slice(0, 8).forEach(a => {
    const img = a.images?.[1]?.url || a.images?.[0]?.url;
    html += `
      <div class="snx-sidebar-item" data-action="artist" data-id="${a.id}">
        <div class="snx-si-img snx-si-img-circle" style="${img ? `background:url(${img}) center/cover` : 'background:linear-gradient(135deg,#1a0533,#c77dff)'}"></div>
        <div class="snx-sidebar-item-info">
          <span class="snx-si-name">${a.name}</span>
          <span class="snx-si-sub">Artist</span>
        </div>
      </div>`;
  });

  container.innerHTML = html;

  // Bind clicks
  container.querySelectorAll('[data-action="play"]').forEach(el => {
    el.addEventListener('click', () => SpotifyAPI.playContext(el.dataset.uri));
  });
  container.querySelectorAll('[data-action="artist"]').forEach(el => {
    el.addEventListener('click', () => SonixRouter.navigate('artist', el.dataset.id));
  });
  container.querySelectorAll('[data-action="navigate"]').forEach(el => {
    el.addEventListener('click', () => SonixRouter.navigate(el.dataset.view));
  });
}


// ─────────────────────────────────────────────
//  CUSTOM CURSOR
// ─────────────────────────────────────────────
function initCursor() {
  const outer = document.getElementById('cursorOuter');
  const dot   = document.getElementById('cursorDot');
  if (!outer || !dot) return;

  let mx = 0, my = 0, ox = 0, oy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  // Lerp for outer ring
  (function raf() {
    ox += (mx - ox) * 0.12;
    oy += (my - oy) * 0.12;
    outer.style.left = ox + 'px';
    outer.style.top  = oy + 'px';
    requestAnimationFrame(raf);
  })();

  // Hover enlargement
  document.querySelectorAll('a, button, .artist-card, .genre-card, .track-item, .event-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

// ─────────────────────────────────────────────
//  LENIS SMOOTH SCROLL
// ─────────────────────────────────────────────
let lenis;
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // Hook into GSAP ScrollTrigger if available
  if (typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
  }
}

// ─────────────────────────────────────────────
//  GSAP ANIMATIONS
// ─────────────────────────────────────────────
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // Fallback: use IntersectionObserver
    initIntersectionFallback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ── Section titles reveal
  document.querySelectorAll('.section-title').forEach(el => {
    gsap.fromTo(el,
      { clipPath: 'inset(0 0 100% 0)', y: 20 },
      {
        clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      }
    );
  });

  // ── Section tags + subs
  document.querySelectorAll('.section-tag, .section-sub').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.7, delay: i * 0.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }
    );
  });

  // ── Artist cards staggered
  gsap.fromTo('.artist-card',
    { opacity: 0, y: 60 },
    {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '.artists-section', start: 'top 75%', once: true }
    }
  );

  // ── Track items staggered slide-in
  gsap.fromTo('.track-item',
    { opacity: 0, x: -40 },
    {
      opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.trending-section', start: 'top 70%', once: true }
    }
  );

  // ── Album panels cinematic reveal
  gsap.fromTo('.album-panel-left .album-panel-info',
    { opacity: 0, x: -60 },
    {
      opacity: 1, x: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.album-panel-left', start: 'top 70%', once: true }
    }
  );
  gsap.fromTo('.album-panel-left .album-panel-visual',
    { opacity: 0, x: 60 },
    {
      opacity: 1, x: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.album-panel-left', start: 'top 70%', once: true }
    }
  );
  gsap.fromTo('.album-panel-right .album-panel-info',
    { opacity: 0, x: 60 },
    {
      opacity: 1, x: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.album-panel-right', start: 'top 70%', once: true }
    }
  );
  gsap.fromTo('.album-panel-right .album-panel-visual',
    { opacity: 0, x: -60 },
    {
      opacity: 1, x: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.album-panel-right', start: 'top 70%', once: true }
    }
  );

  // ── Genre cards stagger
  gsap.fromTo('.genre-card',
    { opacity: 0, y: 40, scale: 0.95 },
    {
      opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.genres-section', start: 'top 70%', once: true }
    }
  );

  // ── Event cards stagger
  gsap.fromTo('.event-card',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.events-section', start: 'top 75%', once: true }
    }
  );

  // ── Plan cards
  gsap.fromTo('.plan-card',
    { opacity: 0, y: 60, scale: 0.95 },
    {
      opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out',
      scrollTrigger: { trigger: '.cta-section', start: 'top 70%', once: true }
    }
  );

  // ── CTA title
  gsap.fromTo('.cta-title',
    { clipPath: 'inset(0 0 100% 0)' },
    {
      clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power4.out',
      scrollTrigger: { trigger: '.cta-section', start: 'top 80%', once: true }
    }
  );

  // ── Vinyl parallax
  gsap.to('.vinyl-container', {
    y: -80,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 }
  });

  // ── Hero badge parallax
  gsap.to('.hero-badge', {
    y: -40,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
  });

  // ── Big background text parallax
  gsap.to('.trending-bg-text', {
    x: -80,
    scrollTrigger: { trigger: '.trending-section', start: 'top bottom', end: 'bottom top', scrub: 2 }
  });

  // ── Counters
  initCountersGSAP();
}

// ─────────────────────────────────────────────
//  COUNTER ANIMATION (GSAP)
// ─────────────────────────────────────────────
function initCountersGSAP() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate() { el.textContent = Math.round(obj.val); }
    });
  });
}

// ─────────────────────────────────────────────
//  FALLBACK: IntersectionObserver (no GSAP)
// ─────────────────────────────────────────────
function initIntersectionFallback() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        e.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(
    '.artist-card, .track-item, .genre-card, .event-card, .reveal-text'
  ).forEach(el => obs.observe(el));
  initCounters();
}

// ─────────────────────────────────────────────
//  COUNTER FALLBACK (IntersectionObserver)
// ─────────────────────────────────────────────
function initCounters() {
  if (typeof gsap !== 'undefined') return; // handled by GSAP
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.target, 10);
      let start = 0;
      const dur = 2000;
      const startTime = performance.now();
      function step(now) {
        const p = Math.min((now - startTime) / dur, 1);
        el.textContent = Math.round(p * target);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(el => obs.observe(el));
}

// ─────────────────────────────────────────────
//  NAVBAR
// ─────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ─────────────────────────────────────────────
//  MOBILE NAV
// ─────────────────────────────────────────────
function initMobileNav() {
  const hamburger   = document.getElementById('hamburger');
  const mobileNav   = document.getElementById('mobileNav');
  const closeBtn    = document.getElementById('mobileNavClose');
  const links       = document.querySelectorAll('.mobile-nav-link');
  if (!hamburger || !mobileNav) return;

  const open  = () => {
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  links.forEach(l => l.addEventListener('click', close));
}

// ─────────────────────────────────────────────
//  ARTISTS DRAG SCROLL
// ─────────────────────────────────────────────
function initArtistsDrag() {
  const track = document.getElementById('artistsTrack');
  if (!track) return;
  let isDragging = false, startX = 0, scrollLeft = 0;

  track.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.parentElement.scrollLeft;
    track.style.cursor = 'grabbing';
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    track.style.cursor = 'grab';
  });
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    track.parentElement.scrollLeft = scrollLeft - walk;
  });
}

// ─────────────────────────────────────────────
//  TRACK LIKE BUTTONS
// ─────────────────────────────────────────────
function initTracks() {
  document.querySelectorAll('.track-like').forEach(btn => {
    btn.addEventListener('click', () => {
      const liked = btn.dataset.liked === 'true';
      btn.dataset.liked = String(!liked);
      btn.classList.toggle('liked', !liked);
    });
  });
}

// ─────────────────────────────────────────────
//  MUSIC PLAYER
// ─────────────────────────────────────────────
const TRACKS = [
  { name: 'Blinding Lights',      artist: 'The Weeknd',          duration: 202, artClass: 'player-art-1' },
  { name: 'As It Was',            artist: 'Harry Styles',         duration: 157, artClass: 'player-art-2' },
  { name: 'Flowers',              artist: 'Miley Cyrus',          duration: 200, artClass: 'player-art-3' },
  { name: 'Espresso',             artist: 'Sabrina Carpenter',    duration: 175, artClass: 'player-art-4' },
  { name: 'Die With A Smile',     artist: 'Lady Gaga & Bruno Mars', duration: 251, artClass: 'player-art-5' },
];

// Extra album art styles in CSS would be needed for 2–5 but use gradients inline
const ART_GRADIENTS = [
  'linear-gradient(135deg,#1a0533,#ff6b9d)',
  'linear-gradient(135deg,#0d1f3c,#7ec8e3)',
  'linear-gradient(135deg,#0a1f0a,#00ff7f)',
  'linear-gradient(135deg,#1a0000,#ff4500)',
  'linear-gradient(135deg,#1a001a,#bd00ff)',
];

let currentTrack = 0;
let isPlaying    = false;
let progress     = 0; // seconds
let intervalId   = null;
let volume       = 0.75;
let isShuffle    = false;
let isRepeat     = false;

function initPlayer() {
  const playBtn    = document.getElementById('playBtn');
  const prevBtn    = document.getElementById('prevBtn');
  const nextBtn    = document.getElementById('nextBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const repeatBtn  = document.getElementById('repeatBtn');
  const progressEl = document.getElementById('playerProgress');
  const vol        = document.getElementById('volumeBar');
  const playerLike = document.getElementById('playerLikeBtn');

  if (!playBtn) return;

  loadTrack(0);

  playBtn.addEventListener('click', () => {
    if (SpotifyAPI.isLoggedIn()) {
      if (SpotifyAPI.isSdkPaused()) { SpotifyAPI.resumePlayback(); play(); }
      else                          { SpotifyAPI.pausePlayback();  pause(); }
    } else {
      togglePlay();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (SpotifyAPI.isLoggedIn()) SpotifyAPI.prevTrackSDK();
    else prevTrack();
  });

  nextBtn.addEventListener('click', () => {
    if (SpotifyAPI.isLoggedIn()) SpotifyAPI.nextTrackSDK();
    else nextTrack();
  });

  shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
    if (SpotifyAPI.isLoggedIn()) SpotifyAPI.setShuffle(isShuffle);
  });

  repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
    if (SpotifyAPI.isLoggedIn()) SpotifyAPI.setRepeat(isRepeat ? 'track' : 'off');
  });

  // Progress seek
  progressEl?.addEventListener('click', e => {
    const rect = progressEl.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    if (SpotifyAPI.isLoggedIn()) {
      const dur = TRACKS[currentTrack]?.duration || 200;
      SpotifyAPI.seekTo(Math.round(frac * dur * 1000));
    }
    progress = frac * TRACKS[currentTrack].duration;
    updateProgressUI();
  });

  // Volume
  vol?.addEventListener('click', e => {
    const rect = vol.getBoundingClientRect();
    volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    document.getElementById('volumeFill').style.width = (volume * 100) + '%';
    if (SpotifyAPI.isLoggedIn()) SpotifyAPI.setVolumeSDK(volume);
  });

  // Player like
  playerLike?.addEventListener('click', () => {
    const liked = playerLike.dataset.liked === 'true';
    playerLike.dataset.liked = String(!liked);
    playerLike.classList.toggle('liked', !liked);
  });

  // Click on any track item to load it
  document.querySelectorAll('.track-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      if (SpotifyAPI.isLoggedIn()) {
        const uri = item.dataset.spotifyUri;
        if (uri) SpotifyAPI.playTrack(uri);
      } else {
        loadTrack(i);
        play();
      }
    });
  });

  // Artist play buttons
  document.querySelectorAll('.artist-play-btn').forEach((btn, i) => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (SpotifyAPI.isLoggedIn()) {
        const card = btn.closest('.artist-card');
        const uri  = card?.dataset.spotifyUri;
        if (uri) SpotifyAPI.playContext(uri);
      } else {
        loadTrack(i % TRACKS.length);
        play();
      }
    });
  });

  // Hero play btn
  document.getElementById('heroPlayBtn')?.addEventListener('click', () => {
    if (SpotifyAPI.isLoggedIn()) {
      SpotifyAPI.resumePlayback();
    } else {
      loadTrack(0);
      play();
    }
    document.getElementById('playerBar')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function loadTrack(idx) {
  currentTrack = idx;
  progress = 0;
  const t = TRACKS[idx];
  document.getElementById('playerTrackName').textContent  = t.name;
  document.getElementById('playerTrackArtist').textContent = t.artist;
  document.getElementById('playerDuration').textContent    = formatTime(t.duration);
  document.getElementById('playerCurrentTime').textContent = '0:00';
  document.getElementById('playerProgressFill').style.width = '0%';
  const art = document.getElementById('playerArt');
  art.style.background = ART_GRADIENTS[idx] || ART_GRADIENTS[0];
  document.querySelectorAll('.track-item').forEach((item, i) => {
    item.style.background = i === idx ? 'rgba(255,107,157,0.07)' : '';
    item.style.borderColor = i === idx ? 'rgba(255,107,157,0.25)' : '';
  });
}

function play() {
  isPlaying = true;
  document.getElementById('playIcon').style.display  = 'none';
  document.getElementById('pauseIcon').style.display = 'block';
  document.querySelector('.vinyl')?.classList.add('playing');
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    progress++;
    if (progress >= TRACKS[currentTrack].duration) {
      if (isRepeat) { progress = 0; }
      else { nextTrack(); }
    }
    updateProgressUI();
  }, 1000);
}

function pause() {
  isPlaying = false;
  document.getElementById('playIcon').style.display  = 'block';
  document.getElementById('pauseIcon').style.display = 'none';
  document.querySelector('.vinyl')?.classList.remove('playing');
  clearInterval(intervalId);
}

function togglePlay() {
  isPlaying ? pause() : play();
}

function nextTrack() {
  let next;
  if (isShuffle) {
    do { next = Math.floor(Math.random() * TRACKS.length); } while (next === currentTrack && TRACKS.length > 1);
  } else {
    next = (currentTrack + 1) % TRACKS.length;
  }
  loadTrack(next);
  play();
}

function prevTrack() {
  if (progress > 3) { progress = 0; updateProgressUI(); return; }
  const prev = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
  loadTrack(prev);
  play();
}

function updateProgressUI() {
  const dur  = TRACKS[currentTrack].duration;
  const pct  = (progress / dur) * 100;
  document.getElementById('playerProgressFill').style.width   = pct + '%';
  document.getElementById('playerCurrentTime').textContent     = formatTime(progress);
  document.getElementById('playerProgressThumb').style.right   = 'auto';
  document.getElementById('playerProgressThumb').style.left    = pct + '%';
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// ─────────────────────────────────────────────
//  WAVEFORM BARS ANIMATION (decorative)
// ─────────────────────────────────────────────
(function createWaveformBars() {
  // Add animated waveform bars to playing track indicators
  document.querySelectorAll('.atp-item.playing .atp-num').forEach(el => {
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="0" y="4" width="2" height="10" rx="1" fill="url(#wg)" style="animation:waveBar 0.8s ease-in-out infinite alternate;"/>
        <rect x="4" y="1" width="2" height="13" rx="1" fill="url(#wg)" style="animation:waveBar 0.8s ease-in-out 0.2s infinite alternate;"/>
        <rect x="8" y="5" width="2" height="9" rx="1" fill="url(#wg)" style="animation:waveBar 0.8s ease-in-out 0.4s infinite alternate;"/>
        <rect x="12" y="3" width="2" height="11" rx="1" fill="url(#wg)" style="animation:waveBar 0.8s ease-in-out 0.1s infinite alternate;"/>
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="14" gradientUnits="userSpaceOnUse"><stop stop-color="#ff6b9d"/><stop offset="1" stop-color="#ff9a3c"/></linearGradient></defs>
      </svg>`;
  });
})();

// ─────────────────────────────────────────────
//  Add waveBar keyframe dynamically
// ─────────────────────────────────────────────
(function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes waveBar {
      from { transform: scaleY(0.3); }
      to   { transform: scaleY(1); }
    }
  `;
  document.head.appendChild(style);
})();

// ─────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────
function initSearch() {
  const overlay    = document.getElementById('searchOverlay');
  const overlayBg  = document.getElementById('searchOverlayBg');
  const closeBtn   = document.getElementById('searchCloseBtn');
  const navBtn     = document.getElementById('navSearchBtn');
  const input      = document.getElementById('searchInput');
  const results    = document.getElementById('searchResults');
  const tabs       = document.querySelectorAll('.search-tab');

  if (!overlay || !input) return;

  let debounceTimer = null;
  let activeType    = 'all';   // all | track | artist | album
  let lastQuery     = '';

  // ── Open / close
  const openSearch = () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 80);
  };
  const closeSearch = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    input.value = '';
    lastQuery = '';
    showEmpty();
  };

  navBtn?.addEventListener('click', openSearch);
  closeBtn?.addEventListener('click', closeSearch);
  overlayBg?.addEventListener('click', closeSearch);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || e.key === '/') {
      e.preventDefault();
      overlay.classList.contains('open') ? closeSearch() : openSearch();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch();
  });

  // ── Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeType = tab.dataset.type;
      if (lastQuery.trim()) doSearch(lastQuery);
    });
  });

  // ── Input with debounce
  input.addEventListener('input', () => {
    const q = input.value.trim();
    lastQuery = q;
    clearTimeout(debounceTimer);
    if (!q) { showEmpty(); return; }
    showLoading();
    debounceTimer = setTimeout(() => doSearch(q), 350);
  });

  // ── Search execution
  async function doSearch(query) {
    if (!SpotifyAPI.isLoggedIn()) {
      results.innerHTML = `<div class="search-no-results"><strong>Sign in to search</strong>Click "Sign In with Spotify" to search the full library.</div>`;
      return;
    }

    const types = activeType === 'all' ? 'track,artist,album'
                : activeType === 'track'  ? 'track'
                : activeType === 'artist' ? 'artist'
                : 'album';

    const data = await SpotifyAPI.search(query, types, 8);
    if (!data) { showEmpty(); return; }
    renderResults(data, query);
  }

  // ── Render
  function renderResults(data, query) {
    const tracks  = data.tracks?.items  || [];
    const artists = data.artists?.items || [];
    const albums  = data.albums?.items  || [];

    if (!tracks.length && !artists.length && !albums.length) {
      results.innerHTML = `<div class="search-no-results"><strong>No results for "${query}"</strong>Try a different spelling or search term.</div>`;
      return;
    }

    let html = '';

    if (tracks.length) {
      html += `<div class="search-section-label">Songs</div>`;
      tracks.forEach(t => {
        const img      = t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || '';
        const artists  = t.artists?.map(a => a.name).join(', ');
        const duration = _msToTimeSearch(t.duration_ms);
        html += `
          <div class="sr-track" data-uri="${t.uri}">
            <div class="sr-track-art" style="${img ? `background-image:url(${img})` : ''}">
              <div class="sr-track-art-overlay">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4L20 12L7 20V4Z"/></svg>
              </div>
            </div>
            <div class="sr-track-info">
              <div class="sr-track-name">${t.name}</div>
              <div class="sr-track-meta">${artists} · ${t.album?.name || ''}</div>
            </div>
            <div class="sr-track-duration">${duration}</div>
          </div>`;
      });
    }

    if (artists.length) {
      html += `<div class="search-section-label">Artists</div>`;
      artists.forEach(a => {
        const img       = a.images?.[2]?.url || a.images?.[0]?.url || '';
        const followers = a.followers?.total ? (a.followers.total / 1_000_000).toFixed(1) + 'M followers' : '';
        const genre     = a.genres?.[0] || 'Artist';
        html += `
          <div class="sr-artist" data-uri="${a.uri}">
            <div class="sr-artist-img" style="${img ? `background-image:url(${img})` : ''}"></div>
            <div class="sr-artist-info">
              <div class="sr-artist-name">${a.name}</div>
              <div class="sr-artist-followers">${followers}</div>
            </div>
            <span class="sr-artist-tag">${genre}</span>
          </div>`;
      });
    }

    if (albums.length) {
      html += `<div class="search-section-label">Albums</div>`;
      albums.forEach(al => {
        const img     = al.images?.[2]?.url || al.images?.[0]?.url || '';
        const artist  = al.artists?.map(a => a.name).join(', ');
        const year    = al.release_date?.slice(0, 4) || '';
        html += `
          <div class="sr-album" data-uri="${al.uri}">
            <div class="sr-album-art" style="${img ? `background-image:url(${img})` : ''}"></div>
            <div class="sr-album-info">
              <div class="sr-album-name">${al.name}</div>
              <div class="sr-album-meta">${artist} · ${year} · ${al.total_tracks} tracks</div>
            </div>
            <button class="sr-album-play" title="Play album">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4L20 12L7 20V4Z"/></svg>
            </button>
          </div>`;
      });
    }

    results.innerHTML = html;

    // Bind play events
    results.querySelectorAll('.sr-track').forEach(el => {
      el.addEventListener('click', () => {
        const uri = el.dataset.uri;
        if (uri && SpotifyAPI.isLoggedIn()) SpotifyAPI.playTrack(uri);
      });
    });

    results.querySelectorAll('.sr-artist').forEach(el => {
      el.addEventListener('click', () => {
        const uri = el.dataset.uri;
        if (uri && SpotifyAPI.isLoggedIn()) SpotifyAPI.playContext(uri);
      });
    });

    results.querySelectorAll('.sr-album').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.sr-album-play') || e.currentTarget === el) {
          const uri = el.dataset.uri;
          if (uri && SpotifyAPI.isLoggedIn()) SpotifyAPI.playContext(uri);
        }
      });
    });
  }

  function showEmpty() {
    results.innerHTML = `
      <div class="search-empty" id="searchEmpty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>Search Spotify's entire library</p>
        <span>Songs · Artists · Albums</span>
      </div>`;
  }

  function showLoading() {
    results.innerHTML = `<div class="search-loading"><div class="search-spinner"></div>Searching…</div>`;
  }

  function _msToTimeSearch(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }
}

