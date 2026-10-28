// ═══════════════════════════════════════════════════════════════
//  WHACK-A-PHOEBE — 3×3 sand holes, 3 rounds of 20 s, 6 taps each.
//  Visible time 1100 → 800 → 550 ms. Unlimited retries; won rounds are kept.
// ═══════════════════════════════════════════════════════════════
class WhackScene extends Phaser.Scene {
  constructor() { super('Whack'); }
  init(data) { this.done = data.done; }

  create() {
    this.ROUND_MS = 20000;
    this.NEED = 6;
    this.VISIBLE = [1100, 800, 550];
    this.round = Math.min(2, G.s.whackRound || 0);
    this.sel = 4;
    this.cameras.main.setBackgroundColor('#e8cf96');
    this.bg = this.add.tileSprite(0, 0, 10, 10, 'beach_village', 'sand_1').setOrigin(0).setTileScale(3);
    this.holes = [];
    for (let i = 0; i < 9; i++) this.holes.push(this.add.image(0, 0, 'minigames/sand_hole.png'));
    this.maskG = this.make.graphics();
    this.phoebe = this.add.sprite(0, 0, 'animals/phoebe.png', 8).setOrigin(0.5, 1).setVisible(false);
    this.phoebe.setMask(this.maskG.createGeometryMask());
    this.phoebe.setInteractive({ useHandCursor: true });
    this.phoebe.on('pointerdown', () => this.hit());
    this.selBox = this.add.graphics();
    const style = { fontFamily: 'PixelAE', fontSize: '28px', color: '#fff7ed', stroke: '#8e3a55', strokeThickness: 5 };
    this.tRound = this.add.text(0, 0, '', style).setOrigin(0, 0);
    this.tHits = this.add.text(0, 0, '', style).setOrigin(0.5, 0);
    this.tTime = this.add.text(0, 0, '', style).setOrigin(1, 0);
    this.banner = this.add.text(0, 0, '', Object.assign({}, style, { fontSize: '56px' })).setOrigin(0.5).setVisible(false);
    this.help = this.add.text(0, 0, Touch.enabled ? 'Tap Phoebe!   Bag: quit' : 'Click Phoebe, or arrows + E (or 1–9)   Esc: quit',
      Object.assign({}, style, { fontSize: '20px', strokeThickness: 4 })).setOrigin(0.5, 1);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layout, this); if (this.pop) this.pop(); });

    this.pop = Input.push({ onKey: name => this.key(name) });
    this.startRound();
  }

  layout() {
    const w = this.scale.width, h = this.scale.height;
    this.bg.setSize(w, h);
    const cell = Math.min(170, (h - 120) / 3, (w - 40) / 3);
    this.k = Phaser.Math.Clamp(cell / 52, 1.5, 3);
    const cx = w / 2, cy = 70 + (h - 110) / 2;
    this.holePos = [];
    for (let i = 0; i < 9; i++) {
      const x = cx + ((i % 3) - 1) * cell, y = cy + (Math.floor(i / 3) - 1) * cell;
      this.holePos.push([x, y]);
      this.holes[i].setPosition(x, y).setScale(this.k);
    }
    this.phoebe.setScale(this.k);
    this.tRound.setPosition(16, 12); this.tHits.setPosition(w / 2, 12); this.tTime.setPosition(w - 16, 12);
    this.banner.setPosition(w / 2, h / 2);
    this.help.setPosition(w / 2, h - 8);
    this.drawSel();
  }

  drawSel() {
    const [x, y] = this.holePos[this.sel], r = 19 * this.k;
    this.selBox.clear().lineStyle(3, 0x8e3a55, 0.9).strokeRoundedRect(x - r, y - r * 0.8, r * 2, r * 1.6, 8);
  }

  hud() {
    this.tRound.setText('Round ' + (this.round + 1) + ' / 3');
    this.tHits.setText('Taps ' + this.hits + ' / ' + this.NEED);
    this.tTime.setText(Math.max(0, Math.ceil(this.left / 1000)) + 's');
  }

  startRound() {
    this.hits = 0;
    this.left = this.ROUND_MS;
    this.playing = false;
    this.hud();
    this.showBanner('Round ' + (this.round + 1), () => { this.playing = true; this.nextPop(400); });
  }

  showBanner(text, then) {
    this.banner.setText(text).setVisible(true).setScale(0.6).setAlpha(1);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.time.delayedCall(1000, () => { this.banner.setVisible(false); if (then) then(); });
  }

  nextPop(delay) {
    if (this.popTimer) this.popTimer.remove();
    this.popTimer = this.time.delayedCall(delay, () => {
      if (!this.playing) return;
      let i;
      do { i = Phaser.Math.Between(0, 8); } while (i === this.hole && Math.random() < 0.9);
      this.hole = i;
      const [x, y] = this.holePos[i];
      const k = this.k;
      this.maskG.clear().fillStyle(0xffffff).fillRect(x - 24 * k, y - 60 * k, 48 * k, 60 * k + 3 * k);
      this.phoebe.setVisible(true).setPosition(x, y + 34 * k).setFlipX(Math.random() < 0.5);
      this.up = true;
      if (this.popTween) this.popTween.stop();
      this.popTween = this.tweens.add({ targets: this.phoebe, y: y + 3 * k, duration: 170, ease: 'Back.easeOut' });
      Snd.tick();
      this.hideTimer = this.time.delayedCall(this.VISIBLE[this.round], () => this.duck(false));
    });
  }

  duck(wasHit) {
    if (!this.up) return;
    this.up = false;
    if (this.hideTimer) this.hideTimer.remove();
    if (this.popTween) this.popTween.stop();
    const [, y] = this.holePos[this.hole];
    this.popTween = this.tweens.add({ targets: this.phoebe, y: y + 34 * this.k, duration: wasHit ? 90 : 130, ease: 'Quad.easeIn',
      onComplete: () => this.phoebe.setVisible(false) });
    if (this.playing) this.nextPop(Phaser.Math.Between(250, 600));
  }

  hit() {
    if (!this.playing || !this.up) return;
    this.hits++;
    Snd.tick();
    const [x, y] = this.holePos[this.hole];
    for (let i = 0; i < 6; i++) {
      const s = this.add.star(x, y - 14 * this.k, 5, 3, 7, 0xffd97a);
      this.tweens.add({ targets: s, x: x + Math.cos(i) * 40, y: y - 14 * this.k + Math.sin(i) * 40 - 10, alpha: 0, duration: 380, onComplete: () => s.destroy() });
    }
    this.duck(true);
    this.hud();
    if (this.hits >= this.NEED) this.roundWon();
  }

  roundWon() {
    this.playing = false;
    if (this.popTimer) this.popTimer.remove();
    this.round++;
    G.s.whackRound = this.round; G.save();
    if (this.round >= 3) {
      Snd.win();
      this.showBanner('3 / 3', () => this.finish('win'));
    } else this.time.delayedCall(500, () => this.startRound());
  }

  async roundLost() {
    this.playing = false;
    Snd.lose();
    if (this.popTimer) this.popTimer.remove();
    this.duck(false);
    this.busy = true;
    await Story.run(L('Beach', 'Phoebe', 'retry'));
    this.busy = false;
    this.startRound();
  }

  key(name) {
    if (this.busy) return;
    if (name === 'back' || name === 'inv') return this.finish('quit');
    const c = this.sel % 3, r = Math.floor(this.sel / 3);
    if (name === 'left') this.sel = r * 3 + (c + 2) % 3;
    else if (name === 'right') this.sel = r * 3 + (c + 1) % 3;
    else if (name === 'up') this.sel = ((r + 2) % 3) * 3 + c;
    else if (name === 'down') this.sel = ((r + 1) % 3) * 3 + c;
    else if (/^num[1-9]$/.test(name)) { this.sel = +name.slice(3) - 1; this.drawSel(); return this.whackAt(this.sel); }
    else if (name === 'act') return this.whackAt(this.sel);
    this.drawSel();
  }
  whackAt(i) { if (this.up && i === this.hole) this.hit(); }

  update(t, dt) {
    if (!this.playing) return;
    this.left -= dt;
    this.hud();
    if (this.left <= 0) this.roundLost();
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.playing = false;
    const done = this.done;
    this.scene.stop();
    done(result);
  }
}
