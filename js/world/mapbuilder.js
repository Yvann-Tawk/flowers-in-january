// ═══════════════════════════════════════════════════════════════
//  MAP BUILDER — tile layers, draw-above, collision grid, props
//  Three kinds of map:
//    tiled     garden, beach, forest, blossom, plains (Sprite Fusion export + collision.json)
//    interior  interior:<room>   (rooms in maps/interiors; WallTop over everything)
//    scenic    hidden_path, wedding (ending maps; layer "Above" over characters)
// ═══════════════════════════════════════════════════════════════
const DEPTH = { GROUND_PROP: 2, WALL_PROP: 3, ABOVE: 100000, ICON: 200000, DEBUG: 300000 };
const GROUND_KINDS = ['ground', 'water'];
const SCENIC = ['hidden_path', 'wedding'];

function mapKind(key) {
  if (key.startsWith('interior:')) return 'interior';
  if (SCENIC.includes(key)) return 'scenic';
  return 'tiled';
}
function roomOf(key) { return key.slice('interior:'.length); }
// asset keys used by Boot
function mapAssetKey(key) { return mapKind(key) === 'interior' ? 'int_' + roomOf(key) : key; }

class WorldMap {
  constructor(scene, key) {
    this.scene = scene;
    this.key = key;
    this.kind = mapKind(key);
    this.props = {};      // id → { def, img, fp }
    if (this.kind === 'tiled') {
      const pl = scene.cache.json.get('placements');
      this.place = pl.maps[key];
      // blossom and plains don't list their guardian-house door: build it from guardian_cabins
      const gc = pl.guardian_cabins[key];
      if (gc && gc.guardian && !this.place.exits.some(e => e.id === 'guardian_house')) {
        this.place.exits.push({ id: 'guardian_house', tiles: [gc.door], to: 'interior:' + gc.interior, arrive: 'arrive', interact: true });
        this.place.arrivals.from_guardian_house = [gc.arrive_outside[0], gc.arrive_outside[1], 'down'];
      }
      this.buildTiled();
    } else {
      this.buildRoom();
      this.place = this.kind === 'interior' ? this.interiorPlace() : this.scenicPlace();
    }
  }

  // ── Sprite Fusion maps ───────────────────────────────────────
  buildTiled() {
    const s = this.scene, key = this.key;
    const map = s.make.tilemap({ key: 'map_' + key });
    this.map = map;
    const tileset = map.addTilesetImage(map.tilesets[0].name, 'tiles_' + key);
    this.W = map.width; this.H = map.height;
    const col = s.cache.json.get('col_' + key);
    this.col = col;
    this.tb = col.tiles_by_gid || {};

    // layers in file order at depth 0; path / lake overlays go right after the path (or lake) layer,
    // so they sit above the ground and paths but below objects
    const overlays = col.overlays || [];
    const names = map.layers.map(l => l.name);
    let after = names.findIndex(n => /lake/i.test(n));
    if (after < 0) after = names.findIndex(n => /path/i.test(n));
    if (after < 0) after = names.length - 1;
    this.layers = [];
    names.forEach((n, i) => {
      this.layers.push(map.createLayer(i, tileset, 0, 0).setDepth(0));
      if (i === after) overlays.forEach(o => s.add.image(o.x * TILE, (o.y + 1) * TILE, o.atlas, o.frame).setOrigin(0, 1).setDepth(0));
    });

    // collision
    this.solid = new Uint8Array(this.W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) this.solid[y * this.W + x] = col.solid[y][x] === '#' ? 1 : 0;

    // map fixes (config.js MAP_FIXES): clear objects that hide a placement
    this.cleared = new Set();
    (MAP_FIXES[key] || []).forEach(f => {
      const [x0, y0, x1, y1] = f.clear;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        this.layers.forEach(L => {
          const t = L.getTileAt(x, y);
          if (t && !GROUND_KINDS.includes((this.tb[t.index] || {}).kind)) L.removeTileAt(x, y);
        });
        this.solid[y * this.W + x] = 0;
        this.cleared.add(x + ',' + y);
      }
    });

    // props that replace the map's own tiles: clear non-ground tiles under their footprint first
    (this.place.props || []).forEach(p => {
      if (!p.replaces_map_tile) return;
      const { tw, th } = this.footprint(p);
      for (let yy = p.y - th + 1; yy <= p.y; yy++) for (let xx = p.x; xx < p.x + tw; xx++) {
        this.layers.forEach(L => {
          const t = L.getTileAt(xx, yy);
          if (t && !GROUND_KINDS.includes((this.tb[t.index] || {}).kind)) L.removeTileAt(xx, yy);
        });
      }
    });

    // draw-above: for each '^' cell, copy the canopy / roof / lamp-head tiles (and anything layered
    // on top of them) into layers drawn over every sprite. Ground tiles under them stay below.
    this.above = [];
    const aboveLayers = {};
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (!col.above || col.above[y][x] !== '^' || this.cleared.has(x + ',' + y)) continue;
      let from = -1;
      this.layers.forEach((L, li) => {
        const t = L.getTileAt(x, y);
        if (from < 0 && t && (this.tb[t.index] || {}).above) from = li;
      });
      if (from < 0) continue;
      for (let li = from; li < this.layers.length; li++) {
        const t = this.layers[li].getTileAt(x, y);
        if (!t) continue;
        if (!aboveLayers[li]) {
          aboveLayers[li] = map.createBlankLayer('above_' + li, tileset, 0, 0, this.W, this.H).setDepth(DEPTH.ABOVE + li);
          this.above.push(aboveLayers[li]);
        }
        const c = aboveLayers[li].putTileAt(t.index, x, y);
        c.flipX = t.flipX; c.flipY = t.flipY; c.rotation = t.rotation;
      }
    }

    (this.place.props || []).forEach(p => this.addProp(p));
  }

  // ── interiors and the ending maps ────────────────────────────
  buildRoom() {
    const s = this.scene, ak = mapAssetKey(this.key);
    const map = s.make.tilemap({ key: 'map_' + ak });
    this.map = map;
    // interiors load their tileset as an atlas (frames for props); scenic maps as a plain image
    const tileset = map.addTilesetImage(map.tilesets[0].name, 'tiles_' + ak);
    this.W = map.width; this.H = map.height;
    const topName = this.kind === 'interior' ? 'WallTop' : 'Above';
    this.layers = map.layers.map((l, i) => map.createLayer(i, tileset, 0, 0).setDepth(l.name === topName ? DEPTH.ABOVE : 0));
    const col = s.cache.json.get('col_' + ak);
    this.col = col;
    this.markers = col.markers || {};
    this.solid = new Uint8Array(this.W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) this.solid[y * this.W + x] = col.solid[y][x] === '#' ? 1 : 0;

    const pj = s.cache.json.get('props_' + ak);
    ((pj && pj.props) || []).forEach((p, i) => {
      let img;
      if (p.frame) {
        img = s.add.sprite(p.x, p.y, 'tiles_' + ak, p.frame).setOrigin(0, 1);
        if (p.anim) {
          const ak2 = ak + ':' + p.frame;
          if (!s.anims.exists(ak2)) s.anims.create({ key: ak2, frames: p.anim.map(f => ({ key: 'tiles_' + ak, frame: f })), frameRate: p.fps || 6, repeat: -1 });
          img.play(ak2);
        }
      } else img = s.add.image(p.x, p.y, p.png).setOrigin(0, 1);
      const d = p.depth;
      img.setDepth(d === 'wall' ? DEPTH.WALL_PROP : d === 'floor' ? 1 : d === 'above' ? DEPTH.ABOVE + 1 : p.y);
      this.props[p.id || 'p' + i] = { def: p, img };
    });
  }

  // markers → the same shape as a placements.json map entry
  interiorPlace() {
    const room = roomOf(this.key);
    const info = this.scene.cache.json.get('placements').interiors[room] || {};
    const m = this.markers;
    const arrivals = {};
    Object.keys(m).forEach(k => { arrivals[k] = [m[k].x, m[k].y, k === 'arrive' ? 'up' : 'down']; });
    if (m.spawn_wake) arrivals.spawn_wake = [m.spawn_wake.x, m.spawn_wake.y, 'right'];
    const ex = this.col.exit;
    const exits = ex ? [{ id: 'door', tiles: [ex.tile], to: info.exit_to, arrive: info.arrive }] : [];
    const npcs = [];
    if (info.guardian && m.guardian) npcs.push({ id: info.guardian.id, name: info.guardian.id, sheet: info.guardian.sheet, x: m.guardian.x, y: m.guardian.y, face: 'down', asleep: info.guardian.asleep });
    const spots = [];
    if (m.note) spots.push({ id: 'note', x: m.note.x, y: m.note.y, kind: 'note' });
    return { arrivals, exits, props: [], npcs, spots, room, exitTo: info.exit_to, audioLoop: this.col.audio_loop };
  }

  scenicPlace() {
    const arrivals = {};
    Object.keys(this.markers).forEach(k => { const v = this.markers[k]; if (v && v.x !== undefined) arrivals[k] = [v.x, v.y, v.face || 'right']; });
    return { arrivals, exits: [], props: [], npcs: [], spots: [] };
  }

  // ── props (outdoor maps) ─────────────────────────────────────
  footprint(p) {
    const tex = this.texFor(p);
    const frame = this.scene.textures.getFrame(tex.key, tex.frame);
    return { tw: Math.max(p.tw || 1, Math.round(frame.width / TILE)), th: Math.max(p.th || 1, Math.round(frame.height / TILE)) };
  }
  texFor(p, state) {
    if (p.atlas) return { key: p.atlas, frame: p.frame };
    return { key: (state && p[state]) || p.png, frame: undefined };
  }
  // which image a two- (or three-) state prop shows: G.s.swapped[id] = 'alt' | 'alt_seeded' | true
  stateOf(p) {
    const s = G.s.swapped[p.id];
    if (!s) return null;
    return s === true ? 'alt' : s;
  }

  addProp(p) {
    const s = this.scene;
    const tex = this.texFor(p, this.stateOf(p));
    const img = s.add.image(p.x * TILE, (p.y + 1) * TILE, tex.key, tex.frame).setOrigin(0, 1);
    const fp = this.footprint(p);
    if (p.solid) {
      for (let xx = p.x; xx < p.x + fp.tw; xx++) this.setSolid(xx, p.y, 1);
      img.setDepth((p.y + 1) * TILE);
    } else img.setDepth(DEPTH.GROUND_PROP);
    if (p.hidden && !G.s.revealed[p.id]) img.setVisible(false);
    this.props[p.id] = { def: p, img, fp };
  }

  swapProp(id) {
    const pr = this.props[id];
    if (!pr || pr.def.atlas) return;
    const st = this.stateOf(pr.def);
    pr.img.setTexture((st && pr.def[st]) || pr.def.png);
  }
  showProp(id, on = true) { const pr = this.props[id]; if (pr) pr.img.setVisible(on); }

  setSolid(x, y, v) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.solid[y * this.W + x] = v; }
  blocked(x, y) { return x < 0 || y < 0 || x >= this.W || y >= this.H || this.solid[y * this.W + x] === 1; }
}
