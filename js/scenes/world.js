// ═══════════════════════════════════════════════════════════════
//  WORLD SCENE — one scene for every map: outdoor areas, interiors, ending maps
// ═══════════════════════════════════════════════════════════════
class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init(data) {
    // Phaser reuses this object when the scene restarts: clear everything a map may have left behind
    Object.assign(this, { locked: false, ceremony: false, bouquet: null, ring: null, lighting: null, noteImg: null,
      said: null, guests: [], gilmour: null, eevie: null, fixedCam: false, lastTile: null });
    this.mapKey = data.map;
    this.startPos = [data.x, data.y, data.dir || 'down'];
    this.from = data.from || null;
  }

  create() {
    const key = this.mapKey;
    Story.scene = this;
    this.handlers = Story.handlers[key] || {};
    this.wmap = new WorldMap(this, key);
    this.place = this.wmap.place;
    this.cameras.main.setBackgroundColor(this.wmap.kind === 'interior' ? '#120c0e' : '#000000');

    // NPCs (their tiles are solid)
    this.npcs = {};
    ((this.place && this.place.npcs) || []).forEach(n => {
      this.npcs[n.id] = Actors.create(this, n);
      this.wmap.setSolid(n.x, n.y, 1);
    });
    this.refreshNpcs();

    // Jana: never start inside something solid
    let [sx, sy, sd] = this.startPos;
    if (this.wmap.blocked(sx, sy)) {
      const near = this.nearestFree(sx, sy, 3);
      if (near) [sx, sy] = near; else [sx, sy, sd] = this.fallbackStart();
    }
    this.player = new Player(this, this.wmap, sx, sy, sd);
    G.beforeSave = () => {
      G.s.map = this.mapKey; G.s.x = this.player.tx; G.s.y = this.player.ty; G.s.dir = this.player.dir;
    };

    // camera (rooms smaller than the screen are centred instead of followed)
    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setRoundPixels(true);
    this.layoutCamera();
    this.scale.on('resize', this.layoutCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layoutCamera, this));

    // interaction targets + icon
    this.buildTargets();
    this.icon = this.add.image(0, 0, 'ui/interact_icon.png').setDepth(DEPTH.ICON).setVisible(false);

    // music (interiors keep their area's track) + fire loop + HUD
    Snd.music(AREAS[areaOf(key)].music);
    this.buildFires();
    HUD.setArea(this.wmap.kind === 'interior' ? ROOM_LABELS[roomOf(key)] || '' : (AREAS[key] || {}).label || '');
    HUD.refresh();
    if (this.handlers.setup) this.handlers.setup(this);
    DigMarks.setup(this);

    Input.world = (name) => this.onKey(name);
    this.lastTile = this.player.tx + ',' + this.player.ty;
    if (DEBUG) Debug.attach(this);
    if (Game._created) { const r = Game._created; Game._created = null; r(this); }
    setTimeout(() => Packs.prefetch(), 1500);
  }

  // ── fire nearby: the fire loop gets louder the closer Jana is ──
  buildFires() {
    const F = this.fires = [];
    const add = (x, y, r, max) => F.push({ x, y, r: r * TILE, max });
    if (this.wmap.kind === 'tiled') {
      const tb = this.wmap.tb;
      this.wmap.map.layers.forEach(ld => ld.data.forEach(row => row.forEach(t => {
        if (!t || t.index < 0) return;
        const a = (tb[t.index] || {}).asset || '';
        if (/campfire|bonfire|brazier|fireplace/.test(a)) add((t.x + 0.5) * TILE, (t.y + 0.5) * TILE, 7, 1);
        else if (/torch/.test(a)) add((t.x + 0.5) * TILE, (t.y + 0.5) * TILE, 4, 0.45);
      })));
    } else Object.values(this.wmap.props).forEach(p => {
      if (/fireplace/.test(p.def.frame || '')) add(p.img.x + p.img.width / 2, p.img.y - 16, 9, 1);
    });
  }
  fireLevel() {
    const p = this.player;
    let lvl = 0;
    const src = this.fires.slice();
    const kiln = this.mapKey === 'plains' && G.s.swapped.kiln && this.wmap.props.kiln;
    if (kiln) src.push({ x: (kiln.def.x + 1) * TILE, y: kiln.def.y * TILE, r: 6 * TILE, max: 0.8 });
    src.forEach(f => {
      const d = Math.hypot(p.x - f.x, p.y - f.y);
      lvl = Math.max(lvl, f.max * Phaser.Math.Clamp(1 - (d - TILE) / (f.r - TILE), 0, 1));
    });
    return lvl;
  }

  // closest walkable tile within r tiles (prefers the same row, then nearer columns)
  nearestFree(x, y, r) {
    for (let d = 1; d <= r; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]])
      if (!this.wmap.blocked(x + dx, y + dy)) return [x + dx, y + dy];
    return null;
  }

  fallbackStart() {
    const a = this.place.arrivals;
    return a.new_game || a.spawn_wake || a.arrive || a.from_garden || Object.values(a)[0];
  }

  layoutCamera() {
    const cam = this.cameras.main, mw = this.wmap.W * TILE, mh = this.wmap.H * TILE;
    const vw = this.scale.width / cam.zoom, vh = this.scale.height / cam.zoom;
    cam.stopFollow();
    cam.removeBounds();
    if (mw <= vw && mh <= vh) { cam.centerOn(mw / 2, mh / 2); this.fixedCam = true; return; }
    this.fixedCam = false;
    cam.setBounds(0, 0, mw, mh);
    cam.startFollow(this.player.spr, true, 1, 1, 0, -12);
  }

  // Gilmour asleep → sits up once he has the band-aid → asleep again after the race
  refreshNpcs() {
    const gil = this.npcs.gilmour;
    if (gil) gil.setFrame(G.flag('gilmour_challenge') && !G.flag('fragment_28') ? 8 : 3);
    ['phoebe', 'spike', 'calabar'].forEach(id => {
      const a = this.npcs[id];
      if (a && !a.anims.isPlaying) a.play(id + ':idle');
    });
  }

  // ── interaction targets ─────────────────────────────────────
  buildTargets() {
    const T = this.targets = [];
    const P = this.place;
    P.npcs.forEach(n => T.push({ type: 'npc', id: n.id, tile: [n.x, n.y], from: n.talk_from || null, spr: this.npcs[n.id] }));
    P.spots.concat(EXTRA_SPOTS[this.mapKey] || []).forEach(s => {
      if (s.kind === 'block') return;
      T.push({ type: 'spot', id: s.id, tile: [s.x, s.y], def: s });
    });
    P.exits.forEach(e => { if (e.interact) T.push({ type: 'exit', id: e.id, tile: e.tiles[0], def: e }); });
    const propH = this.handlers.prop || {};
    P.props.forEach(p => {
      if (!propH[p.id]) return;
      const fp = this.wmap.props[p.id].fp, tiles = [];
      for (let y = p.y - fp.th + 1; y <= p.y; y++) for (let x = p.x; x < p.x + fp.tw; x++) tiles.push([x, y]);
      T.push({ type: 'prop', id: p.id, tile: [p.x, p.y], tiles, def: p });
    });
  }

  spotHandler(id) {
    const h = (this.handlers.spot || {})[id];
    if (!h) return null;
    return typeof h === 'function' ? { use: h } : h;
  }

  isActive(t) {
    if (t.type === 'spot') {
      const h = this.spotHandler(t.id);
      if (!h) return false;
      if (t.def.hidden && !G.s.revealed[t.id]) return false;
      return h.active ? !!h.active() : true;
    }
    return true;
  }

  // best target for Jana right now: facing it beats standing next to it
  findTarget() {
    const p = this.player, jx = p.tx, jy = p.ty, [fx, fy] = p.facingTile();
    let best = null, bestScore = 9;
    const md = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    for (const t of this.targets) {
      if (!this.isActive(t)) continue;
      let sc = 9;
      {
        const tiles = t.tiles || [t.tile];
        for (const tt of tiles) {
          if (tt[0] === jx && tt[1] === jy) sc = Math.min(sc, 0);
          else if (tt[0] === fx && tt[1] === fy) sc = Math.min(sc, 0.5);
          else if (md(tt, [jx, jy]) === 1) sc = Math.min(sc, 1.5);
        }
        if (t.from) {
          if (t.from[0] === jx && t.from[1] === jy) sc = Math.min(sc, 0.2);
          else if (md(t.from, [jx, jy]) === 1) sc = Math.min(sc, 1.6);
        }
      }
      if (sc < bestScore) { bestScore = sc; best = t; }
    }
    return best;
  }

  iconPos(t) {
    if (t.type === 'npc') { const s = t.spr, b = s.getBounds(); return [s.x, b.y + (s.sheetKind === 'lpc' ? 10 : s.sheetKind === 'fisher' ? 38 : 0) - 6]; }
    if (t.type === 'prop') { const img = this.wmap.props[t.id].img; return [img.x + img.displayWidth / 2, img.y - img.displayHeight - 6]; }
    return [(t.tile[0] + 0.5) * TILE, t.tile[1] * TILE - 2];
  }

  // ── input ───────────────────────────────────────────────────
  onKey(name) {
    if (this.locked || Story.running) return;
    if (name === 'act') { const t = this.findTarget(); if (t) this.interact(t); }
    else if (name === 'inv') Inventory.open();
    else if (name === 'flowers') FlowerBook.open();
    else if (DEBUG && /^f[1-4]$/.test(name)) Debug.fkey(name, this);
  }

  async interact(t) {
    this.locked = true;
    this.player.stop();
    this.icon.setVisible(false);
    let spr = null, panned = false;
    try {
      if (t.type === 'npc') {
        spr = t.spr;
        const p = this.player;
        const at = t.from && Math.abs(t.from[0] - p.tx) + Math.abs(t.from[1] - p.ty) <= 1 ? t.from : t.tile;
        if (!(at === t.from && p.tx === at[0] && p.ty === at[1])) p.face(Actors.dirTowards(p.x, p.y, (at[0] + 0.5) * TILE, (at[1] + 0.5) * TILE));
        else p.face('up');
        Actors.face(spr, Actors.dirTowards(spr.x, spr.y, p.x, p.y));
        panned = this.frameSpeaker(spr);
        const h = (this.handlers.npc || {})[t.id];
        if (h) await h(this, spr);
      } else if (t.type === 'spot') {
        const p = this.player;
        if (!(p.tx === t.tile[0] && p.ty === t.tile[1])) p.face(Actors.dirTowards(p.x, p.y, (t.tile[0] + 0.5) * TILE, (t.tile[1] + 0.5) * TILE));
        await this.spotHandler(t.id).use(this, t.def);
      } else if (t.type === 'prop') {
        await this.handlers.prop[t.id](this, t.def);
      } else if (t.type === 'exit') {
        Snd.door();
        return Game.goto(t.def.to, t.def.arrive);
      }
    } catch (e) { console.error(e); }
    finally {
      if (panned) this.followJana();
      if (spr && spr.active) Actors.restore(spr);
      this.locked = false;
      G.save();
    }
  }

  // show Jana where a newly revealed spot is: pan there, hold, come back
  async showSpot(tx, ty) {
    if (this.fixedCam) return;
    const cam = this.cameras.main, x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
    const wv = cam.worldView;
    if (x > wv.x + 40 && x < wv.right - 40 && y > wv.y + 40 && y < wv.bottom - 120) return;   // already on screen
    cam.stopFollow();
    await new Promise(r => cam.pan(x, y + 40, 900, 'Sine.easeInOut', false, (c, k) => { if (k === 1) r(); }));
    await new Promise(r => setTimeout(r, 1400));
    await new Promise(r => cam.pan(this.player.spr.x, this.player.spr.y + 12, 700, 'Sine.easeInOut', false, (c, k) => { if (k === 1) r(); }));
    cam.startFollow(this.player.spr, true, 1, 1, 0, -12);
  }

  // If the speaker is out of view (the owl on her tower), pan so both are on screen above the box.
  frameSpeaker(spr) {
    if (this.fixedCam) return false;
    const cam = this.cameras.main, wv = cam.worldView, b = spr.getBounds();
    const boxH = 150 / cam.zoom; // the dialogue box covers the bottom of the screen
    if (b.y >= wv.y + 20 && b.bottom <= wv.bottom - boxH) return false;
    const p = this.player;
    const top = Math.min(b.y, p.y - 40), bottom = Math.max(b.bottom, p.y + FOOT_Y);
    cam.stopFollow();
    cam.pan((p.x + spr.x) / 2, (top + bottom) / 2 + boxH / 2 - 10, 350, 'Sine.easeInOut');
    return true;
  }
  followJana() {
    if (this.fixedCam) return;
    const cam = this.cameras.main, s = this.player.spr;
    cam.pan(s.x, s.y + 12, 250, 'Sine.easeInOut', false, (c, k) => { if (k === 1) cam.startFollow(s, true, 1, 1, 0, -12); });
  }

  // minigame overlay scene; resolves with its result ('win' | 'quit')
  minigame(key) {
    return new Promise(res => {
      Input.clearHeld();
      this.player.stop();
      this.scene.pause();
      HUD.show(false);
      if (key !== 'Sled') Touch.show(false);   // tap-based minigames: keep the arrows out of the way
      // the guardians' minigames are the boss fights: boss music, then back to the area's track
      Snd.music(Snd.BOSS_MUSIC); Snd.fire(0);
      this.scene.launch(key, { done: r => {
        this.scene.resume(); HUD.show(true); Touch.show(true); Input.clearHeld();
        Snd.music(AREAS[areaOf(this.mapKey)].music);
        res(r);
      } });
    });
  }

  // ── stepping onto tiles: exits, blocks ──────────────────────
  async onEnterTile(tx, ty) {
    if (this.handlers.step && await this.handlers.step(this, tx, ty)) return;
    for (const s of this.place.spots) {
      if (s.kind === 'block' && s.x === tx && s.y === ty && this.handlers.block) {
        this.locked = true; this.player.stop();
        try { await this.handlers.block(this, s); } finally { this.locked = false; this.lastTile = this.player.tx + ',' + this.player.ty; }
        return;
      }
    }
    for (const e of this.place.exits) {
      if (e.interact || !e.tiles.some(([x, y]) => x === tx && y === ty)) continue;
      if (e.requires && !G.has(e.requires)) {
        this.locked = true; this.player.stop();
        const back = DIRS[this.player.dir];
        try {
          if (this.handlers.lockedExit) await this.handlers.lockedExit(this, e);
          this.player.setTile(tx - back[0], ty - back[1]);
        } finally { this.locked = false; this.lastTile = this.player.tx + ',' + this.player.ty; }
        return;
      }
      if (this.wmap.kind === 'interior') Snd.door();
      return Game.goto(e.to, e.arrive);
    }
  }

  update(time, delta) {
    const busy = this.locked || Story.running || Input.busy() || Game.transitioning;
    if (busy) this.player.stop();
    else if (this.player.update(Math.min(delta, 50) / 1000)) {
      const k = this.player.tx + ',' + this.player.ty;
      if (k !== this.lastTile) { this.lastTile = k; this.onEnterTile(this.player.tx, this.player.ty); }
    }
    // interaction icon
    const t = busy ? null : this.findTarget();
    if (t) {
      const [ix, iy] = this.iconPos(t);
      this.icon.setVisible(true).setPosition(Math.round(ix), Math.round(iy - 8 + Math.sin(time / 220) * 2));
    } else this.icon.setVisible(false);
    if (this.handlers.update) this.handlers.update(this, time, delta);
    DigMarks.update(this);
    Snd.fire(this.fireLevel());
    if (DEBUG) Debug.update(this);
  }
}
