// ═══════════════════════════════════════════════════════════════
//  ENDING — gate → hidden path → wedding vision → home → closing letter → credits
//  (STORY.md "Ending"; lines from the spreadsheet, Area "Ending")
// ═══════════════════════════════════════════════════════════════
const PATH_LINES = false;   // the bible says the walk is wordless; the sheet's stretch lines are optional

const Ending = {
  stage: null,               // 'home' while the garden shows the ending_home block
  wait: ms => new Promise(r => setTimeout(r, ms)),

  // 18/01/2026 entered: no dialogue. The gate swings open, then the path.
  async openGate() {
    const sc = Story.scene;
    G.s.swapped.gate = true;
    if (sc && sc.wmap) sc.wmap.swapProp('gate');
    G.save();
    await this.wait(1400);
    return Game.goto('hidden_path', 'start', { fade: 1000 });
  },
};

// ── the hidden path: a wordless walk east ─────────────────────
Story.handlers.hidden_path = {
  enter() { if (!G.flag('path_arrived')) { G.setFlag('path_arrived'); Snd.newArea(); } },
  setup(scene) {
    const m = scene.wmap.markers;
    scene.pathSections = m.section_notes || {};
    scene.bouquetX = m.bouquet.x; scene.endX = m.end.x;
    scene.nextMote = 0;
  },

  update(scene, time) {
    const p = scene.player, tx = p.tx;
    // faint traces of sand, snow, petals and lamplight, near where Jana walks
    if (time > scene.nextMote) {
      scene.nextMote = time + 140;
      const S = scene.pathSections;
      const kind = Object.keys(S).find(k => tx >= S[k][0] - 2 && tx <= S[k][1] + 2);
      if (kind) mote(scene, kind);
    }
    if (scene.bouquet) scene.bouquet.setPosition(Math.round(p.x + (p.dir === 'left' ? -9 : p.dir === 'right' ? 9 : 0)), Math.round(p.y + 2)).setDepth(p.y + FOOT_Y + (p.dir === 'up' ? -1 : 1));
  },

  async step(scene, tx, ty) {
    if (tx >= scene.bouquetX && !scene.bouquet) {
      scene.locked = true; scene.player.stop();
      try {
        holdBouquet(scene);
        await Story.run(L('Ending', 'Bouquet', 'path end'));   // … SHOW bouquet
      } finally { scene.locked = false; }
      return true;
    }
    if (tx >= scene.endX) {
      scene.locked = true; scene.player.stop();
      await Fade.white(1400);
      Game.goto('wedding', 'jana_start', { silentFade: true });
      return true;
    }
    if (PATH_LINES) {
      const S = scene.pathSections, said = scene.said = scene.said || {};
      const k = Object.keys(S).find(k => tx === S[k][0]);
      const state = { sand: 'sand stretch', snow: 'snow stretch', petals: 'petal stretch', lamplight: 'lamp stretch' }[k];
      if (state && !said[k]) { said[k] = true; await Story.run(L('Ending', 'Path', state)); }
    }
    return false;
  },
};

// the flower counter becomes the bouquet in her hands
function holdBouquet(scene) {
  if (scene.bouquet) return;
  const hud = document.getElementById('hud-flowers');
  const r = hud.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly-flower';
  fly.style.backgroundImage = 'url(assets/items/bouquet_2x.png)';
  fly.style.left = r.left + 'px'; fly.style.top = r.top + 'px';
  document.body.appendChild(fly);
  hud.style.transition = 'opacity .6s'; hud.style.opacity = 0;
  const cam = scene.cameras.main, p = scene.player;
  setTimeout(() => {
    fly.style.left = ((p.x - cam.worldView.x) * cam.zoom - 24) + 'px';
    fly.style.top = ((p.y - cam.worldView.y) * cam.zoom - 24) + 'px';
    fly.style.opacity = 0;
  }, 50);
  setTimeout(() => fly.remove(), 1000);
  scene.bouquet = scene.add.image(p.x, p.y, 'items/bouquet_2x.png').setScale(0.5).setOrigin(0.5, 0.5).setAlpha(0);
  scene.tweens.add({ targets: scene.bouquet, alpha: 1, duration: 700, delay: 500 });
}
Story.hooks.bouquet = sc => { if (sc && sc.mapKey === 'hidden_path') holdBouquet(sc); };

function mote(scene, kind) {
  const wv = scene.cameras.main.worldView;
  const x = wv.x + Math.random() * wv.width, y = wv.y + Math.random() * wv.height * 0.9;
  const col = { sand: 0xe9d7a4, snow: 0xffffff, petals: 0xf6a6c1, lamplight: 0xffd97a }[kind];
  const d = scene.add.rectangle(x, y, kind === 'petals' ? 3 : 2, 2, col, 0).setDepth(DEPTH.ABOVE + 5);
  const fall = kind === 'snow' || kind === 'petals';
  scene.tweens.add({
    targets: d, alpha: { from: 0, to: kind === 'lamplight' ? 0.9 : 0.75 }, duration: 900, yoyo: true,
    x: x + (kind === 'petals' ? 18 : kind === 'sand' ? 26 : 4), y: y + (fall ? 30 : -10),
    onComplete: () => d.destroy(),
  });
}

// ── the wedding vision ─────────────────────────────────────────
Story.handlers.wedding = {
  enter() { Snd.newArea(); },
  setup(scene) {
    const m = scene.wmap.markers;
    HUD.show(false);
    scene.guests = [];
    Object.keys(m).forEach(k => {
      const v = m[k];
      if (!v || !v.sheet) return;
      const npc = { id: k, sheet: v.sheet, x: v.x, y: v.y, face: v.face || 'down', asleep: v.asleep, name: v.name };
      const spr = Actors.create(scene, npc, { guest: true });
      scene.wmap.setSolid(v.x, v.y, 1);
      if (k === 'eevie') scene.eevie = spr;
      else if (k.startsWith('guest_')) scene.guests.push(spr);
      if (k === 'animal_gilmour') { scene.gilmour = spr; spr.setFrame(3); }
      ['phoebe', 'spike', 'calabar'].forEach(a => { if (k === 'animal_' + a) spr.play(a + ':idle'); });
    });
    scene.stopAt = m.jana_stop;
  },

  update(scene) {
    const p = scene.player;
    // guests turn to face Jana as she passes; once she is past them they watch her go up the aisle
    scene.guests.forEach(g => {
      const gy = g.npc.y, py = p.y / TILE - 0.5;
      const want = py > gy + 1.5 ? g.npc.face : py < gy - 0.5 ? 'up' : (p.x < g.x ? 'left' : 'right');
      if (want !== g.curFace) { g.curFace = want; Actors.face(g, want); }
    });
    if (!scene.ceremony && p.ty <= scene.stopAt.y && p.tx === scene.stopAt.x) ceremony(scene);
  },
};

async function ceremony(scene) {
  scene.ceremony = true;
  scene.locked = true;
  const p = scene.player;
  p.stop(); p.frozen = true; p.face('up');
  Actors.face(scene.eevie, 'down');
  await Ending.wait(600);
  // Eevie's words (every Wedding row except the ring), in row order
  const rows = Lines.rows('Ending', 'Wedding').filter(r => r.state !== 'ring');
  await Story.run(rows.reduce((a, r) => a.concat(Lines.steps(r)), []));
  // the ring, exchanged as part of the ceremony
  showRing(scene);
  await Ending.wait(1200);
  if (scene.gilmour) scene.gilmour.setFrame(8);          // Gilmour opens one eye
  await Story.run(L('Ending', 'Wedding', 'ring'));       // … SHOW ring
  await Ending.wait(1200);
  await Fade.white(1800);
  Ending.stage = 'home';
  const h = window.game.cache.json.get('placements').maps.garden.ending_home;
  Game.goto('garden', 'ending_home', { at: h.jana, silentFade: true });
}

function showRing(scene) {
  if (scene.ring) return;
  const p = scene.player, e = scene.eevie;
  const x = (p.x + e.x) / 2, y = (p.y + e.y) / 2 - 10;
  scene.ring = scene.add.image(x, y + 10, 'items/item_ring.png').setDepth(DEPTH.ABOVE + 10).setAlpha(0).setScale(0.5);
  scene.tweens.add({ targets: scene.ring, alpha: 1, y, scale: 0.75, duration: 900, ease: 'Sine.easeOut' });
  for (let i = 0; i < 10; i++) {
    const s = scene.add.star(x, y, 4, 1, 3, 0xfff3c4).setDepth(DEPTH.ABOVE + 11).setAlpha(0);
    const a = (i / 10) * Math.PI * 2;
    scene.tweens.add({ targets: s, alpha: { from: 1, to: 0 }, x: x + Math.cos(a) * 22, y: y + Math.sin(a) * 22, delay: 500 + i * 40, duration: 900, onComplete: () => s.destroy() });
  }
}
Story.hooks.ring = sc => { if (sc && sc.mapKey === 'wedding') showRing(sc); };

// ── home: the garden, no longer empty ──────────────────────────
const EndingHome = {
  setup(scene) {
    const h = scene.cache.json.get('placements').maps.garden.ending_home;
    HUD.show(false);
    h.props.forEach(pr => scene.add.image(pr.x * TILE, (pr.y + 1) * TILE, pr.png).setOrigin(0, 1).setDepth((pr.y + 1) * TILE));
    h.npcs.forEach(n => {
      const spr = Actors.create(scene, Object.assign({ name: n.id }, n), { guest: true });
      if (n.id === 'gilmour') spr.setFrame(3);
      if (['phoebe', 'spike', 'calabar'].includes(n.id)) spr.play(n.id + ':idle');
      if (n.id === 'calabar') spr.setDepth(DEPTH.ABOVE + 20);   // on the cottage roof edge
      if (n.id === 'eevie') scene.eevie = spr;
    });
  },
  async enter(scene) {
    const p = scene.player;
    p.frozen = true;
    scene.locked = true;
    await Ending.wait(1500);
    await Story.run(L('Ending', 'Home', 'final'));
    await Ending.wait(1500);
    await Fade.out(1500);
    await ClosingLetter.show();
    await Credits.roll();
    Ending.stage = null;
    G.setFlag('finished'); G.save();
    location.reload();   // back to the title screen
  },
};

// ── the closing letter (written by Yvann; word for word) ───────
const ClosingLetter = {
  pages() {
    const rows = Lines.rows('Ending', 'Closing letter');
    const page = n => rows.filter(r => r.state === 'page ' + n);
    const p2 = page(2);
    return [
      { paras: page(1).map(r => r.line) },
      { paras: p2.map((r, i) => (i === p2.length - 1 ? { text: r.line, right: true } : r.line)) },
      { paras: page(3).map(r => r.line), small: true, delay: 1800 },
    ];
  },
  async show() {
    const shown = Note.open(this.pages(), { letter: true, date: '' });
    await Fade.in(1500);          // the page appears out of the dark
    await shown;
  },
};
