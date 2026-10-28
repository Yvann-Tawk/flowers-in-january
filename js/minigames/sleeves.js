// ═══════════════════════════════════════════════════════════════
//  SLEEVE MEMORY MATCH (Spike) — 12 record sleeves, 6 pairs.
//  Flip two; matching sleeves stay up. Too many misses → Spike's retry
//  line and a fresh shuffle. Unlimited retries, Esc to quit.
//  sleeves.png: 9 frames of 32×32 — 0–7 sleeve designs, 8 the card back.
// ═══════════════════════════════════════════════════════════════
class SleevesScene extends Phaser.Scene {
  constructor() { super('Sleeves'); }
  init(data) { this.done = data.done; }

  create() {
    this.PAIRS = 6; this.COLS = 4; this.ROWS = 3; this.MAX_MISSES = 10; this.BACK = 8;
    this.cameras.main.setBackgroundColor('#f3d9e2');
    this.bg = this.add.graphics();
    const style = { fontFamily: 'PixelAE', fontSize: '26px', color: '#fff7ed', stroke: '#8e3a55', strokeThickness: 5 };
    this.tPairs = this.add.text(0, 0, '', style).setOrigin(0, 0);
    this.tMiss = this.add.text(0, 0, '', style).setOrigin(1, 0);
    this.help = this.add.text(0, 0, Touch.enabled ? 'Tap two sleeves   Bag: quit' : 'Click two sleeves, or arrows + E   Esc: quit',
      Object.assign({}, style, { fontSize: '18px', strokeThickness: 4 })).setOrigin(0.5, 1);
    this.selBox = this.add.graphics().setDepth(5);
    this.cards = [];
    for (let i = 0; i < this.COLS * this.ROWS; i++) {
      const c = this.add.sprite(0, 0, 'minigames/sleeves.png', this.BACK).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { this.sel = i; this.drawSel(); this.flip(i); });
      this.cards.push(c);
    }
    this.sel = 0;
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layout, this); if (this.pop) this.pop(); });
    this.pop = Input.push({ onKey: name => this.key(name) });
    this.deal();
  }

  layout() {
    const w = this.scale.width, h = this.scale.height;
    const cell = Math.min(150, (h - 110) / this.ROWS, (w - 40) / this.COLS);
    this.k = Math.max(1.5, Math.floor(cell / 34 * 2) / 2);
    const gx = w / 2 - (this.COLS - 1) * cell / 2, gy = 60 + (h - 100) / 2 - (this.ROWS - 1) * cell / 2;
    this.pos = [];
    this.cards.forEach((c, i) => {
      const x = gx + (i % this.COLS) * cell, y = gy + Math.floor(i / this.COLS) * cell;
      this.pos.push([x, y]);
      c.setPosition(x, y).setScale(this.k);
    });
    this.bg.clear().fillStyle(0xeec8d5, 1);
    for (let y = 0; y < h; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < w; x += 24) this.bg.fillRect(x, y, 2, 2);
    this.tPairs.setPosition(16, 12); this.tMiss.setPosition(w - 16, 12);
    this.help.setPosition(w / 2, h - 8);
    this.drawSel();
  }

  drawSel() {
    if (!this.pos) return;
    const [x, y] = this.pos[this.sel], r = 19 * this.k;
    this.selBox.clear().lineStyle(3, 0x8e3a55, 0.9).strokeRoundedRect(x - r, y - r, r * 2, r * 2, 6);
  }

  hud() {
    this.tPairs.setText('Pairs ' + this.found + ' / ' + this.PAIRS);
    this.tMiss.setText('Misses ' + this.misses + ' / ' + this.MAX_MISSES);
  }

  deal() {
    const designs = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, this.PAIRS);
    this.faces = Phaser.Utils.Array.Shuffle(designs.concat(designs));
    this.up = this.faces.map(() => false);
    this.matched = this.faces.map(() => false);
    this.open = [];
    this.found = 0; this.misses = 0;
    this.lock = false;
    this.cards.forEach(c => { c.setFrame(this.BACK).setAlpha(1); });
    this.hud();
  }

  turn(i, faceUp) {
    const c = this.cards[i];
    this.up[i] = faceUp;
    this.tweens.add({ targets: c, scaleX: 0, duration: 90, onComplete: () => {
      c.setFrame(faceUp ? this.faces[i] : this.BACK);
      this.tweens.add({ targets: c, scaleX: this.k, duration: 90 });
    } });
  }

  flip(i) {
    if (this.lock || this.busy || this.up[i] || this.matched[i]) return;
    Snd.tick();
    this.turn(i, true);
    this.open.push(i);
    if (this.open.length < 2) return;
    const [a, b] = this.open;
    this.open = [];
    if (this.faces[a] === this.faces[b]) {
      this.matched[a] = this.matched[b] = true;
      this.found++;
      Snd.tick();
      this.hud();
      if (this.found === this.PAIRS) { this.lock = true; Snd.win(); this.time.delayedCall(900, () => this.finish('win')); }
      return;
    }
    this.misses++;
    this.hud();
    this.lock = true;
    this.time.delayedCall(750, () => {
      this.turn(a, false); this.turn(b, false);
      this.lock = false;
      if (this.misses >= this.MAX_MISSES) this.lost();
    });
  }

  async lost() {
    this.busy = true;
    Snd.lose();
    await Story.run(L('Blossom', 'Spike', 'retry'));
    this.busy = false;
    this.deal();
  }

  key(name) {
    if (this.busy) return;
    if (name === 'back' || name === 'inv') return this.finish('quit');
    const c = this.sel % this.COLS, r = Math.floor(this.sel / this.COLS);
    if (name === 'left') this.sel = r * this.COLS + (c + this.COLS - 1) % this.COLS;
    else if (name === 'right') this.sel = r * this.COLS + (c + 1) % this.COLS;
    else if (name === 'up') this.sel = ((r + this.ROWS - 1) % this.ROWS) * this.COLS + c;
    else if (name === 'down') this.sel = ((r + 1) % this.ROWS) * this.COLS + c;
    else if (name === 'act') return this.flip(this.sel);
    this.drawSel();
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    const done = this.done;
    this.scene.stop();
    done(result);
  }
}
