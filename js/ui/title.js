// ═══════════════════════════════════════════════════════════════
//  TITLE + INTRO — "Press any key", Continue / New game, the original intro
// ═══════════════════════════════════════════════════════════════
const Title = {
  // loading bar on the title screen (Boot progress, 0–1)
  progress(p) {
    const bar = document.querySelector('#title-load div');
    if (bar) bar.style.width = Math.round(p * 100) + '%';
    if (p >= 1) document.getElementById('title-load').classList.add('done');
  },

  start() {
    const title = document.getElementById('title');
    const press = document.getElementById('title-press');
    title.classList.remove('hidden', 'out');
    const onPress = () => {
      Snd.start();
      press.classList.add('hidden');
      if (G.hasSave()) this.menu();
      else this.newGame();
    };
    // any key, or a tap anywhere
    Input.onAnyKey(() => { title.removeEventListener('pointerdown', tap); onPress(); });
    const tap = () => { Input.anyKeyHooks.length = 0; title.removeEventListener('pointerdown', tap); onPress(); };
    title.addEventListener('pointerdown', tap);
  },

  menu() {
    const m = document.getElementById('title-menu');
    m.classList.remove('hidden');
    const btns = Array.from(m.querySelectorAll('.menu-btn'));
    let sel = 0;
    const render = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
    render();
    const choose = act => { pop(); m.classList.add('hidden'); if (act === 'continue') this.cont(); else this.newGame(); };
    const pop = Input.push({ onKey: name => {
      if (name === 'up' || name === 'down') { sel = 1 - sel; render(); Snd.tick(); }
      else if (name === 'act') choose(btns[sel].dataset.act);
    } });
    btns.forEach(b => b.onclick = () => choose(b.dataset.act));
  },

  hide() {
    const t = document.getElementById('title');
    t.classList.add('out');
    setTimeout(() => t.classList.add('hidden'), 800);
  },

  cont() {
    G.load();
    this.hide();
    window.bootReady.then(() => Game.startSaved());
  },

  newGame() {
    G.reset();
    this.hide();
    this.intro().then(() => window.bootReady).then(() => Game.startNew());
  },

  // the current game's intro text, unchanged
  intro() {
    return new Promise(resolve => {
      const el = document.getElementById('intro');
      el.classList.remove('hidden', 'out');
      let ready = false;
      // the opening lines (spreadsheet: Garden / Opening), on the original intro screen
      const INTRO = Lines.rows('Garden', 'Opening', 'intro').map(r => r.line);
      INTRO.forEach((txt, i) => {
        const l = document.getElementById('il' + i);
        if (l) { l.textContent = txt; l.classList.remove('on'); setTimeout(() => l.classList.add('on'), 600 + i * 2500); }
      });
      // the original "press any key to begin", or "loading…" until the game has finished loading
      const skip = document.getElementById('il_skip');
      const original = skip.textContent;
      setTimeout(() => {
        skip.classList.add('on');
        if (window.bootDone) { ready = true; return; }
        skip.textContent = 'loading…';
        window.bootReady.then(() => { skip.textContent = original; ready = true; });
      }, 600 + INTRO.length * 2500);
      const go = () => {
        if (!ready) return;
        pop(); el.removeEventListener('pointerdown', go);
        el.classList.add('out');
        setTimeout(() => { el.classList.add('hidden'); }, 1200);
        resolve();
      };
      const pop = Input.push({ onKey: go });
      el.addEventListener('pointerdown', go);
    });
  },
};
