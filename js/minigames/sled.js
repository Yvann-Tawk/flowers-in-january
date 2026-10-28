// ═══════════════════════════════════════════════════════════════
//  SLED RACE — maps/sled_track exactly as its JSON says.
//  Left → right; up/down steers between lanes 2–9. Obstacles slow Jana for
//  0.8 s, ice patches give a short boost. Gilmour (asleep) follows gilmourPath.
// ═══════════════════════════════════════════════════════════════
class SledScene extends Phaser.Scene {
  constructor() { super('Sled'); }
  init(data) { this.done = data.done; }

  create() {
    const T = this.T = this.cache.json.get('sled_track');
    const ts = T.tileSize;
    this.ts = ts;
    this.BASE = 7 * ts;        // px/s
    this.STEER = 5.5 * ts;     // px/s
    this.SLOW = 0.45; this.SLOW_MS = 800;
    this.BOOST = 1.55; this.BOOST_MS = 700;
    this.GIL_TIME = 13.7;      // seconds for Gilmour's whole path (a decent run wins narrowly)
    this.cameras.main.setBackgroundColor('#2a3b2c');
    this.add.image(0, 0, 'maps/sled_track/sled_track.png').setOrigin(0);
    this.obs = T.obstacles.map(o => ({
      o, spr: this.add.image(o.x * ts + ts / 2, o.y * ts + ts / 2, 'minigames/sled_obstacles.png', T.obstacleSheet.index[o.type]).setDepth(o.y * ts + ts),
    }));
    this.ice = T.icePatches.map(p => new Phaser.Geom.Rectangle(p.x * ts, p.y * ts, p.w * ts, p.h * ts));
    // Gilmour's path as a polyline through tile centres
    this.path = T.gilmourPath.map(([x, y]) => [x * ts, y * ts + ts / 2]);
    this.path[this.path.length - 1][0] = T.finishX * ts;
    this.segs = []; let L = 0;
    for (let i = 1; i < this.path.length; i++) {
      const [ax, ay] = this.path[i - 1], [bx, by] = this.path[i];
      const d = Math.hypot(bx - ax, by - ay);
      this.segs.push({ ax, ay, bx, by, d, s0: L }); L += d;
    }
    this.pathLen = L;
    this.gSpeed = L / this.GIL_TIME;

    this.jana = this.add.image(0, 0, 'minigames/sled_jana.png').setOrigin(0.5, 0.82);
    this.gil = this.add.image(0, 0, 'minigames/sled_gilmour.png').setOrigin(0.5, 0.8);
    const style = { fontFamily: 'PixelAE', fontSize: '22px', color: '#fff7ed', stroke: '#3b2230', strokeThickness: 4 };
    this.ui = this.add.text(0, 0, '', style).setScrollFactor(0).setDepth(9999);
    this.big = this.add.text(0, 0, '', Object.assign({}, style, { fontSize: '64px', strokeThickness: 6 })).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
    this.help = this.add.text(0, 0, Touch.enabled ? '▲ ▼ steer   Bag: quit' : '↑ ↓ steer   Esc: quit', Object.assign({}, style, { fontSize: '18px' }))
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(9999);
    this.zzz = [];
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.spawnZ() });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layout, this); if (this.pop) this.pop(); });
    this.pop = Input.push({ onKey: name => { if (!this.busy && (name === 'back' || name === 'inv')) this.finish('quit'); } });
    this.reset();
  }

  layout() {
    const w = this.scale.width, h = this.scale.height;
    const cam = this.cameras.main;
    const z = Phaser.Math.Clamp(h / 380, 1, 3);
    cam.setZoom(z);
    // UI texts are drawn in screen space: undo the zoom for them
    [this.ui, this.big, this.help].forEach(t => t.setScale(1 / z));
    const vw = w / z, vh = h / z;
    const ox = (w - vw) / 2, oy = (h - vh) / 2; // zoom is around the centre
    this.ui.setPosition(ox + 10 / z, oy + 8 / z);
    this.big.setPosition(ox + vw / 2, oy + vh / 2);
    this.help.setPosition(ox + vw / 2, oy + vh - 4 / z);
  }

  reset() {
    const T = this.T, ts = this.ts;
    this.jx = T.start.x * ts; this.jy = T.start.jana * ts + ts / 2;
    this.gs = 0;
    this.slow = 0; this.boost = 0;
    this.obs.forEach(o => { o.hit = false; o.spr.setAngle(0); });
    this.state = 'count';
    this.place();
    let n = 3;
    this.big.setText(String(n));
    Snd.tick();
    this.countT = this.time.addEvent({ delay: 650, repeat: 3, callback: () => {
      n--;
      if (n > 0) { this.big.setText(String(n)); Snd.tick(); }
      else if (n === 0) { this.big.setText('GO!'); Snd.tick(); this.state = 'race'; this.t0 = this.time.now; }
      else this.big.setText('');
    } });
  }

  gilPos(s) {
    s = Math.min(s, this.pathLen);
    for (const g of this.segs) if (s <= g.s0 + g.d) {
      const k = (s - g.s0) / g.d;
      return [g.ax + (g.bx - g.ax) * k, g.ay + (g.by - g.ay) * k];
    }
    const last = this.path[this.path.length - 1];
    return [last[0], last[1]];
  }

  place() {
    const [gx, gy] = this.gilPos(this.gs);
    this.gx = gx;
    this.jana.setPosition(Math.round(this.jx), Math.round(this.jy)).setDepth(this.jy + 8);
    this.gil.setPosition(Math.round(gx), Math.round(gy)).setDepth(gy + 8);
    const cam = this.cameras.main;
    const w = this.scale.width, vw = w / cam.zoom;
    const wx = Phaser.Math.Clamp(this.jx - vw * 0.32, 0, Math.max(0, this.T.width * this.ts - vw));
    cam.scrollX = wx - (w - vw) / 2;
    cam.scrollY = (this.T.height * this.ts) / 2 - this.scale.height / 2;
    const left = Math.max(0, this.T.finishX * this.ts - this.jx) / this.ts;
    this.ui.setText(this.state === 'race' || this.state === 'count' ? Math.ceil(left) + ' m to go' : '');
  }

  spawnZ() {
    if (!this.gil) return;
    const z = this.add.text(this.gil.x + 8, this.gil.y - 18, 'z', { fontFamily: 'PixelAE', fontSize: '14px', color: '#e6eefc', stroke: '#3b2230', strokeThickness: 2 }).setDepth(9000);
    this.tweens.add({ targets: z, x: z.x + 10, y: z.y - 18, alpha: 0, duration: 1100, onComplete: () => z.destroy() });
  }

  update(t, dtMs) {
    if (this.state !== 'race') return;
    const dt = Math.min(0.05, dtMs / 1000), ts = this.ts;
    // steering
    const minY = this.T.lanes.min * ts + ts / 2, maxY = this.T.lanes.max * ts + ts / 2;
    if (Input.held.up) this.jy -= this.STEER * dt;
    if (Input.held.down) this.jy += this.STEER * dt;
    this.jy = Phaser.Math.Clamp(this.jy, minY, maxY);
    // ice and obstacles
    if (this.ice.some(r => r.contains(this.jx, this.jy))) this.boost = this.BOOST_MS;
    for (const o of this.obs) {
      if (o.hit) continue;
      if (Math.abs(this.jx - o.spr.x) < 20 && Math.abs(this.jy - o.spr.y) < 17) {
        o.hit = true; this.slow = this.SLOW_MS; this.boost = 0;
        Snd.tick();
        this.cameras.main.shake(120, 0.004);
        this.tweens.add({ targets: o.spr, angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => o.spr.setAngle(0) });
      }
    }
    let v = this.BASE;
    if (this.slow > 0) { v *= this.SLOW; this.slow -= dtMs; }
    else if (this.boost > 0) { v *= this.BOOST; this.boost -= dtMs; }
    this.jx += v * dt;
    this.gs += this.gSpeed * dt;
    this.jana.setAngle(this.slow > 0 ? Math.sin(t / 30) * 6 : 0);
    this.place();
    const fx = this.T.finishX * ts;
    const janaIn = this.jx >= fx, gilIn = this.gs >= this.pathLen;
    if (janaIn || gilIn) this.over(janaIn);
  }

  async over(won) {
    this.state = 'over';
    if (won) {
      this.big.setText('1st!');
      Snd.win();
      this.time.delayedCall(1200, () => this.finish('win'));
      return;
    }
    this.big.setText('2nd');
    Snd.lose();
    this.busy = true;
    await new Promise(r => this.time.delayedCall(900, r));
    this.big.setText('');
    await Story.run(L('Forest', 'Gilmour', 'retry'));
    this.busy = false;
    if (!this.finished) this.reset();
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    if (this.countT) this.countT.remove();
    const done = this.done;
    this.scene.stop();
    done(result);
  }
}
