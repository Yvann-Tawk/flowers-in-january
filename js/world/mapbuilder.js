// ═══════════════════════════════════════════════════════════════
//  MAP BUILDER — tile layers, draw-above layer, collision grid, props
// ═══════════════════════════════════════════════════════════════
const DEPTH = { GROUND_PROP: 2, ABOVE: 100000, ICON: 200000, DEBUG: 300000 };
const GROUND_KINDS = ['ground', 'water'];

class WorldMap {
  constructor(scene, key) {
    this.scene = scene;
    this.key = key;
    this.place = key === 'cabin' ? null : scene.cache.json.get('placements').maps[key];
    this.props = {};      // id → { def, img }
    if (key === 'cabin') this.buildCabin(); else this.buildTiled();
  }

  // ── the old cabin: one image at 2×, 16 px tiles become 32 px ──
  buildCabin() {
    const s = this.scene;
    const col = s.cache.json.get('col_cabin');
    this.W = col.w; this.H = col.h;
    s.add.image(0, 0, CABIN.img).setOrigin(0, 0).setScale(CABIN.scale).setDepth(0);
    this.solid = new Uint8Array(this.W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) this.solid[y * this.W + x] = col.solid[y][x] ? 1 : 0;
    this.door = col.door;
  }

  // ── Sprite Fusion maps (Tiled JSON) ──────────────────────────
  buildTiled() {
    const s = this.scene, key = this.key;
    const map = s.make.tilemap({ key: 'map_' + key });
    this.map = map;
    const tileset = map.addTilesetImage(map.tilesets[0].name, 'tiles_' + key);
    this.W = map.width; this.H = map.height;
    this.layers = map.layers.map((ld, i) => map.createLayer(i, tileset, 0, 0).setDepth(0));
    const col = s.cache.json.get('col_' + key);
    this.col = col;
    this.tb = col.tiles_by_gid || {};

    // collision
    this.solid = new Uint8Array(this.W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) this.solid[y * this.W + x] = col.solid[y][x] === '#' ? 1 : 0;

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
      if (col.above[y][x] !== '^') continue;
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

    // frozen lake (forest)
    (col.overlays || []).forEach(o => {
      s.add.image(o.x * TILE, (o.y + 1) * TILE, o.atlas, o.frame).setOrigin(0, 1).setDepth(1);
    });

    // props
    (this.place.props || []).forEach(p => this.addProp(p));
  }

  footprint(p) {
    const tex = this.texFor(p);
    const frame = this.scene.textures.getFrame(tex.key, tex.frame);
    return { tw: Math.max(p.tw || 1, Math.round(frame.width / TILE)), th: Math.max(p.th || 1, Math.round(frame.height / TILE)) };
  }
  texFor(p, alt) {
    if (p.atlas) return { key: p.atlas, frame: p.frame };
    return { key: alt && p.alt ? p.alt : p.png, frame: undefined };
  }

  addProp(p) {
    const s = this.scene;
    const alt = !!G.s.swapped[p.id];
    const tex = this.texFor(p, alt);
    const img = s.add.image(p.x * TILE, (p.y + 1) * TILE, tex.key, tex.frame).setOrigin(0, 1);
    const fp = this.footprint(p);
    if (p.solid) {
      for (let xx = p.x; xx < p.x + fp.tw; xx++) this.setSolid(xx, p.y, 1);
      img.setDepth((p.y + 1) * TILE);
    } else img.setDepth(DEPTH.GROUND_PROP);
    this.props[p.id] = { def: p, img, fp };
  }

  swapProp(id) {
    const pr = this.props[id];
    if (!pr || !pr.def.alt) return;
    pr.img.setTexture(G.s.swapped[id] ? pr.def.alt : pr.def.png);
  }

  setSolid(x, y, v) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.solid[y * this.W + x] = v; }
  blocked(x, y) { return x < 0 || y < 0 || x >= this.W || y >= this.H || this.solid[y * this.W + x] === 1; }
}
