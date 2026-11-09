// ═══════════════════════════════════════════════════════════════
//  HANDHELD — the "Pocket Play" console shell on touch devices.
//  The whole game (#stage: canvas + every overlay) is placed over the console's
//  screen; #stage gets a transform, so the overlays' position:fixed is relative
//  to the screen instead of the phone. Also: the pause menu, Exit, auto-pause.
//  Desktop never runs any of this (Touch.enabled is false there).
// ═══════════════════════════════════════════════════════════════
const Handheld = {
  on: false,
  paused: false,
  haptics: true,

  init() {
    if (!Touch.enabled) return;
    this.on = true;
    try { this.haptics = localStorage.getItem('fij-haptics') !== 'off'; } catch (e) {}
    this.stage = document.getElementById('stage');
    this.screen = document.getElementById('sh-screen');
    const fit = () => this.fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 250));
    if (window.ResizeObserver) new ResizeObserver(fit).observe(this.screen);
    fit();

    document.getElementById('sh-pause').addEventListener('click', () => { Snd.start(); this.togglePause(); });
    document.getElementById('sh-exit').addEventListener('click', () => this.toTitle());
    document.querySelectorAll('#pause [data-p]').forEach(b => b.addEventListener('click', () => this.choose(b.dataset.p)));
    // a phone call, the home button, another app: pause
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.inGame()) this.openPause(); });
    this.labels();
  },

  // put #stage exactly over the console screen
  fit() {
    const r = this.screen.getBoundingClientRect();
    const s = this.stage.style;
    s.left = r.left + 'px'; s.top = r.top + 'px';
    s.width = r.width + 'px'; s.height = r.height + 'px';
    s.setProperty('--sw', r.width + 'px'); s.setProperty('--sh', r.height + 'px');
    if (window.game && window.game.canvas) window.game.scale.refresh();
  },

  // the area the game uses (the screen on the handheld, the window on desktop)
  view() {
    if (!this.on) return { w: window.innerWidth, h: window.innerHeight };
    const r = this.stage.getBoundingClientRect();
    return { w: r.width, h: r.height };
  },
  // screen-relative position for elements placed with position:fixed inside #stage
  offset() {
    if (!this.on) return { x: 0, y: 0 };
    const r = this.stage.getBoundingClientRect();
    return { x: r.left, y: r.top };
  },

  inGame() {
    const sm = window.game && window.game.scene;
    return !!(sm && (sm.isActive('World') || sm.isPaused('World')) && document.getElementById('title').classList.contains('hidden'));
  },

  // ── pause menu ────────────────────────────────────────────────
  togglePause() { if (this.paused) this.closePause(); else this.openPause(); },

  openPause() {
    if (this.paused || !this.inGame()) return;
    this.paused = true;
    Input.clearHeld();
    const sm = window.game.scene;
    this.frozen = sm.getScenes(true).filter(s => !['Boot', 'Audio'].includes(s.sys.settings.key));
    this.frozen.forEach(s => s.scene.pause());
    this.sel = 0;
    this.showList();
    document.getElementById('pause').classList.remove('hidden');
    this.render();
    this.pop = Input.push({ onKey: name => this.key(name) });
  },

  closePause() {
    if (!this.paused) return;
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    (this.frozen || []).forEach(s => { if (s.scene.isPaused()) s.scene.resume(); });
    this.frozen = null;
    if (this.pop) { this.pop(); this.pop = null; }
  },

  items() { return Array.from(document.querySelectorAll(this.inControls ? '#pause-controls [data-p]' : '#pause-list [data-p]')); },
  render() { this.items().forEach((b, i) => b.classList.toggle('sel', i === this.sel)); },
  key(name) {
    const n = this.items().length;
    if (name === 'up') this.sel = (this.sel + n - 1) % n;
    else if (name === 'down') this.sel = (this.sel + 1) % n;
    else if (name === 'act') return this.choose(this.items()[this.sel].dataset.p);
    else if (name === 'back' || name === 'inv') return this.inControls ? this.showList() : this.closePause();
    else return;
    Snd.tick();
    this.render();
  },
  showList(controls = false) {
    this.inControls = controls;
    document.getElementById('pause-list').classList.toggle('hidden', controls);
    document.getElementById('pause-controls').classList.toggle('hidden', !controls);
    this.sel = 0;
    this.render();
  },

  choose(p) {
    Snd.tick();
    if (p === 'resume') this.closePause();
    else if (p === 'restart') this.restartFromSave();
    else if (p === 'sound') { Snd.toggleMusic(); this.labels(); }
    else if (p === 'haptics') {
      this.haptics = !this.haptics;
      try { localStorage.setItem('fij-haptics', this.haptics ? 'on' : 'off'); } catch (e) {}
      this.labels();
      Touch.buzz();
    }
    else if (p === 'controls') this.showList(true);
    else if (p === 'back') this.showList(false);
    else if (p === 'quit') this.toTitle();
  },

  labels() {
    const set = (k, on) => { const b = document.querySelector('#pause [data-p="' + k + '"] b'); if (b) b.textContent = on ? 'ON' : 'OFF'; };
    set('sound', Snd.musicOn);
    set('haptics', this.haptics);
  },

  // Restart = back to the last autosave (what's there now isn't saved on the way out)
  restartFromSave() {
    Game.noSaveOnExit = true;
    G.beforeSave = null;
    try { sessionStorage.setItem('fij-continue', '1'); } catch (e) {}
    location.reload();
  },
  // Exit / Quit Game = the title screen (progress is already autosaved)
  toTitle() {
    if (G.beforeSave) G.save();
    Game.noSaveOnExit = true;
    location.reload();
  },
  // after a Restart, skip the title and continue from the save
  takeContinue() {
    try {
      if (sessionStorage.getItem('fij-continue') !== '1') return false;
      sessionStorage.removeItem('fij-continue');
      return G.hasSave();
    } catch (e) { return false; }
  },
};
