// ═══════════════════════════════════════════════════════════════
//  WORLD SCENE — one scene for the cabin, garden, beach and forest
// ═══════════════════════════════════════════════════════════════
class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init(data) {
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
    this.cameras.main.setBackgroundColor(key === 'cabin' ? '#1a1008' : '#000000');

    // NPCs (their tiles are solid)
    this.npcs = {};
    ((this.place && this.place.npcs) || []).forEach(n => {
      this.npcs[n.id] = Actors.create(this, n);
      this.wmap.setSolid(n.x, n.y, 1);
    });
    this.refreshNpcs();

    // Jana: never start inside something solid
    let [sx, sy, sd] = this.startPos;
    if (this.wmap.blocked(sx, sy)) [sx, sy, sd] = this.fallbackStart();
    this.player = new Player(this, this.wmap, sx, sy, sd);
    G.beforeSave = () => {
      G.s.map = this.mapKey; G.s.x = this.player.tx; G.s.y = this.player.ty; G.s.dir = this.player.dir;
    };

    // camera
    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setRoundPixels(true);
    cam.setBounds(0, 0, this.wmap.W * TILE, this.wmap.H * TILE);
    cam.startFollow(this.player.spr, true, 1, 1, 0, -12);

    // interaction targets + icon
    this.buildTargets();
    this.icon = this.add.image(0, 0, 'ui/interact_icon.png').setDepth(DEPTH.ICON).setVisible(false);
    if (key === 'cabin') this.noteGlow = this.add.graphics().setDepth(DEPTH.GROUND_PROP + 1);

    // music + HUD
    if (key === 'cabin') { Snd.music('garden_theme', 0.15); Snd.setFire(true); }
    else { Snd.music(AREAS[key].music, Snd.MUSIC_VOL); Snd.setFire(false); }
    HUD.setArea(key === 'cabin' ? 'The Cabin' : AREAS[key].label);
    HUD.refresh();

    Input.world = (name) => this.onKey(name);
    this.lastTile = this.player.tx + ',' + this.player.ty;
    if (DEBUG) Debug.attach(this);
    if (Game._created) { const r = Game._created; Game._created = null; r(this); }
  }

  fallbackStart() {
    if (this.mapKey === 'cabin') return CABIN.spawn;
    const a = this.place.arrivals;
    return a.new_game || a.from_garden || Object.values(a)[0];
  }

  // Gilmour asleep → sits up when he has the band-aid → asleep again after the race
  refreshNpcs() {
    const gil = this.npcs.gilmour;
    if (gil) gil.setFrame(G.flag('gilmour_awake') && !G.flag('gilmour_won') ? 8 : 3);
    const ph = this.npcs.phoebe;
    if (ph && !ph.anims.isPlaying) ph.play('phoebe:idle');
  }

  // ── interaction targets ─────────────────────────────────────
  buildTargets() {
    const T = this.targets = [];
    const P = this.place;
    if (this.mapKey === 'cabin') {
      T.push({ type: 'note', tile: [CABIN.note.x, CABIN.note.y] });
      return;
    }
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
    if (t.type === 'note') return this.handlers.note.active();
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
      if (t.type === 'note') {
        const z = CABIN.note.zone;
        if (jx >= z[0] && jx <= z[2] && jy >= z[1] && jy <= z[3]) sc = 1;
      } else {
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
        Snd.sfx('door', 0.5);
        return Game.goto(t.def.to, t.def.arrive);
      } else if (t.type === 'note') {
        this.player.face('up');
        await this.handlers.note.use(this);
      }
    } catch (e) { console.error(e); }
    finally {
      if (panned) this.followJana();
      if (spr && spr.active) Actors.restore(spr);
      this.locked = false;
      G.save();
    }
  }

  // If the speaker is out of view (the owl on her tower), pan so both are on screen above the box.
  frameSpeaker(spr) {
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
      this.scene.launch(key, { done: r => { this.scene.resume(); HUD.show(true); Input.clearHeld(); res(r); } });
    });
  }

  // ── stepping onto tiles: exits, blocks ──────────────────────
  async onEnterTile(tx, ty) {
    if (this.mapKey === 'cabin') {
      if (ty >= this.wmap.door.y && Math.abs(tx - this.wmap.door.x) <= 1) {
        Snd.sfx('door', 0.5);
        return Game.goto('garden', 'from_cabin');
      }
      return;
    }
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
    // the note on the table glows until it's read
    if (this.noteGlow) {
      this.noteGlow.clear();
      if (!G.flag('note_read')) {
        const a = Math.abs(Math.sin(time * 0.003)) * 0.25 + 0.15;
        this.noteGlow.fillStyle(0xffe060, a).fillCircle((CABIN.note.x + 0.5) * TILE, (CABIN.note.y + 0.5) * TILE, TILE * 0.8);
      }
    }
    if (DEBUG) Debug.update(this);
  }
}
