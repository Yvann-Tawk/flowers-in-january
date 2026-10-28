// ═══════════════════════════════════════════════════════════════
//  PLAYER — Jana: smooth 4-directional movement, tile-centre collision
// ═══════════════════════════════════════════════════════════════
class Player {
  // (tx, ty) = tile; x/y are the logical body point (tile centre when standing on a tile)
  constructor(scene, wmap, tx, ty, dir) {
    this.scene = scene;
    this.wmap = wmap;
    this.x = tx * TILE + TILE / 2;
    this.y = ty * TILE + TILE / 2;
    this.dir = dir || 'down';
    this.moving = false;
    this.frozen = false;
    this.key = 'characters/jana.png';
    this.spr = scene.add.sprite(this.x, this.y + FOOT_Y, this.key, LPC.idle[this.dir] * 13).setOrigin(0.5, LPC_FOOT);
    this.spr.play(this.key + ':idle_' + this.dir);
    this.sync();
  }

  get tx() { return Math.floor(this.x / TILE); }
  get ty() { return Math.floor(this.y / TILE); }
  facingTile() { const d = DIRS[this.dir]; return [this.tx + d[0], this.ty + d[1]]; }

  setTile(tx, ty, dir) {
    this.x = tx * TILE + TILE / 2;
    this.y = ty * TILE + TILE / 2;
    if (dir) this.face(dir);
    this.sync();
  }
  face(dir) {
    this.dir = dir;
    this.spr.play(this.key + (this.moving ? ':walk_' : ':idle_') + dir, true);
  }
  stop() {
    if (!this.moving) return;
    this.moving = false;
    this.spr.play(this.key + ':idle_' + this.dir, true);
  }
  sync() {
    this.spr.setPosition(Math.round(this.x), Math.round(this.y + FOOT_Y));
    this.spr.setDepth(this.y + FOOT_Y);
  }

  canStand(px, py) {
    return !this.wmap.blocked(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  // returns true when Jana entered a new tile this frame
  update(dt) {
    const d = this.frozen ? null : Input.dir();
    if (!d) { this.stop(); return false; }
    if (d !== this.dir || !this.moving) {
      this.dir = d;
      this.moving = true;
      this.spr.play(this.key + ':walk_' + d, true);
    }
    const before = this.tx + ',' + this.ty;
    const step = WALK_SPEED * TILE * dt;
    const [mx, my] = DIRS[d];
    let nx = this.x + mx * step, ny = this.y + my * step;
    if (this.canStand(nx, ny)) { this.x = nx; this.y = ny; }
    else {
      // corner assist: slide toward the centre of the open neighbouring lane
      if (mx === 0) {
        const off = this.x - (this.tx * TILE + TILE / 2);
        const side = off > 0 ? 1 : -1;
        if (Math.abs(off) > 4 && this.canStand(this.x + side * TILE, ny)) this.x += side * Math.min(step, TILE / 2 - Math.abs(off) + 1);
        else if (Math.abs(off) > 0.5) this.x -= Math.sign(off) * Math.min(step, Math.abs(off));
      } else {
        const off = this.y - (this.ty * TILE + TILE / 2);
        const side = off > 0 ? 1 : -1;
        if (Math.abs(off) > 4 && this.canStand(nx, this.y + side * TILE)) this.y += side * Math.min(step, TILE / 2 - Math.abs(off) + 1);
        else if (Math.abs(off) > 0.5) this.y -= Math.sign(off) * Math.min(step, Math.abs(off));
      }
    }
    this.sync();
    return before !== this.tx + ',' + this.ty;
  }
}
