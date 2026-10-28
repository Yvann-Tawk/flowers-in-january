// ═══════════════════════════════════════════════════════════════
//  DEBUG (?debug=1) — collision grid, spot/exit tiles, item keys, teleports
//    F1 beach items · F2 forest items · F3 blossom items · F4 plains items (each area's keepsake included)
//    Buttons: all four fragments + 24 flowers (to try the gate and the ending), teleports, minigames
//    URL: &map=beach&x=23&y=47  (jump straight in) · &fresh=1 (new state) · &grid=0 · &mini=Whack|Sled|Sleeves|Shuffle
// ═══════════════════════════════════════════════════════════════
const Debug = {
  params: new URLSearchParams(location.search),
  get showGrid() { return this._grid !== undefined ? this._grid : this.params.get('grid') !== '0'; },
  set showGrid(v) { this._grid = v; },

  autostart() {
    const map = this.params.get('map');
    if (!map) return false;
    document.getElementById('title').classList.add('hidden');
    if (this.params.get('fresh') === '1') G.reset(); else G.load();
    (this.params.get('flags') || '').split(',').filter(Boolean).forEach(f => G.setFlag(f));
    (this.params.get('give') || '').split(',').filter(Boolean).forEach(i => G.give(i));
    window.bootReady.then(async () => {
      HUD.show(true); Touch.show(true);
      let [x, y, dir] = Game.arrival(map, this.params.get('at') || 'new_game');
      if (this.params.get('x')) { x = +this.params.get('x'); y = +this.params.get('y'); dir = this.params.get('dir') || 'down'; }
      const sc = await Game._start({ map, x, y, dir });
      await Fade.in(100);
      const mini = this.params.get('mini');
      if (mini) sc.minigame(mini);
    });
    return true;
  },

  attach(scene) {
    const g = this.grid = scene.add.graphics().setDepth(DEPTH.DEBUG);
    const W = scene.wmap.W, H = scene.wmap.H;
    g.setVisible(this.showGrid);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (scene.wmap.blocked(x, y)) { g.fillStyle(0xff3040, 0.28).fillRect(x * TILE, y * TILE, TILE, TILE); }
      g.lineStyle(1, 0x000000, 0.12).strokeRect(x * TILE, y * TILE, TILE, TILE);
    }
    const P = scene.place;
    if (P) {
      P.exits.forEach(e => e.tiles.forEach(([x, y]) => g.lineStyle(2, 0x00ffff, 1).strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4)));
      P.spots.concat(EXTRA_SPOTS[scene.mapKey] || []).forEach(s => g.lineStyle(2, 0xff00ff, 1).strokeRect(s.x * TILE + 4, s.y * TILE + 4, TILE - 8, TILE - 8));
      Object.values(P.arrivals).forEach(([x, y]) => g.lineStyle(2, 0x00ff00, 1).strokeCircle((x + .5) * TILE, (y + .5) * TILE, 8));
      P.npcs.forEach(n => { if (n.talk_from) g.lineStyle(2, 0xffff00, 1).strokeCircle((n.talk_from[0] + .5) * TILE, (n.talk_from[1] + .5) * TILE, 6); });
    }
    if (this.params.get('grid') !== '0') this.panel(scene);
  },

  panel(scene) {
    const el = document.getElementById('debug-panel');
    el.classList.remove('hidden');
    el.innerHTML = '<div id="dbg-pos"></div><div id="dbg-maps"></div><div id="dbg-mini"></div><div id="dbg-misc"></div>';
    const add = (box, label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = e => { e.currentTarget.blur(); fn(); }; document.getElementById(box).appendChild(b); };
    INTERIORS.forEach(r => add('dbg-maps', r, () => Game.goto('interior:' + r, 'arrive')));
    const pl = window.game.cache.json.get('placements').maps;
    MAPS.forEach(m => Object.keys(pl[m].arrivals).forEach(a => add('dbg-maps', m + ':' + a, () => Game.goto(m, a))));
    SCENIC.forEach(m => add('dbg-maps', m, () => Game.goto(m, m === 'wedding' ? 'jana_start' : 'start')));
    ['Whack', 'Sled', 'Sleeves', 'Shuffle'].forEach(k => add('dbg-mini', k, () => scene.minigame(k)));
    add('dbg-mini', 'Gate panel', () => Gate.open());
    add('dbg-mini', 'Letter', () => ClosingLetter.show());
    add('dbg-mini', 'Credits', () => Credits.roll());
    add('dbg-misc', 'grid', () => { this.showGrid = !this.showGrid; this.grid.setVisible(this.showGrid); });
    add('dbg-misc', 'F1', () => this.fkey('f1', scene));
    add('dbg-misc', 'F2', () => this.fkey('f2', scene));
    add('dbg-misc', 'F3', () => this.fkey('f3', scene));
    add('dbg-misc', 'F4', () => this.fkey('f4', scene));
    add('dbg-misc', '4 fragments + 24 flowers', () => {
      G.setFlag('note_read'); G.give('note');
      ['01', '28', '26', '20'].forEach(f => G.setFlag('fragment_' + f));
      NOTE_ORDER.forEach(f => G.give(f));
      G.s.flowers = Array.from({ length: 24 }, (_, i) => i + 1); HUD.refresh(); G.save();
    });
    add('dbg-misc', 'reset save', () => { G.reset(); location.reload(); });
  },

  update(scene) {
    const p = scene.player, el = document.getElementById('dbg-pos');
    if (el) el.textContent = scene.mapKey + ' (' + p.tx + ', ' + p.ty + ') ' + p.dir + ' · flowers ' + G.s.flowers.length + ' · frags ' + G.s.fragments.length;
  },

  fkey(k, scene) {
    const sets = {
      f1: ['bottle', 'shell', 'glasses', 'keychain'],
      f2: ['fish', 'carrot', 'kindling', 'bandaid'],
      f3: ['seed', 'key', 'tea', 'needle', 'vinyl'],
      f4: ['ember', 'fireflies', 'flask', 'water', 'vases'],
    };
    sets[k].forEach(i => { if (G.give(i)) HUD.popup('Got', i); });
    Snd.got();
    G.save();
  },

};
