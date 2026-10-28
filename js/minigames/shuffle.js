// ═══════════════════════════════════════════════════════════════
//  VASE SHUFFLE (Calabar) — an ember hidden under one of three clay pots.
//  Watch it go under, follow the shuffle, pick the pot. Three rounds,
//  each faster; a wrong pick plays the retry line and replays that round
//  (rounds already won are kept). Esc to quit.
// ═══════════════════════════════════════════════════════════════
class ShuffleScene extends Phaser.Scene {
  constructor() { super('Shuffle'); }
  init(data) { this.done = data.done; }

  create() {
    this.ROUNDS = [{ swaps: 4, ms: 420 }, { swaps: 6, ms: 320 }, { swaps: 9, ms: 240 }];
    this.round = Math.min(this.ROUNDS.length - 1, G.s.shuffleRound || 0);
    this.cameras.main.setBackgroundColor('#140d1c');
    this.glow = this.add.graphics();
    const style = { fontFamily: 'PixelAE', fontSize: '26px', color: '#fff7ed', stroke: '#3b2230', strokeThickness: 5 };
    this.tRound = this.add.text(0, 0, '', style).setOrigin(0, 0);
    this.help = this.add.text(0, 0, '', Object.assign({}, style, { fontSize: '18px', strokeThickness: 4 })).setOrigin(0.5, 1);
    this.ember = this.add.image(0, 0, 'minigames/minigame_ember.png');
    this.pots = [0, 1, 2].map(i => {
      const p = this.add.image(0, 0, 'minigames/clay_pot.png').setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
      p.on('pointerdown', () => this.pick(i));
      return p;
    });
    this.selBox = this.add.graphics();
    this.sel = 1;
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layout, this); if (this.pop) this.pop(); });
    this.pop = Input.push({ onKey: name => this.key(name) });
    this.startRound();
  }

  layout() {
    const w = this.scale.width, h = this.scale.height;
    this.k = Math.max(2, Math.min(5, Math.floor(Math.min(w / 5, h / 3) / 32)));
    this.gap = 40 * this.k;
    this.cx = w / 2; this.baseY = h / 2 + 18 * this.k;
    this.slotX = [-1, 0, 1].map(d => this.cx + d * this.gap);
    // pot i sits in slot this.slotOf[i]
    if (!this.slotOf) this.slotOf = [0, 1, 2];
    this.pots.forEach((p, i) => p.setScale(this.k).setPosition(this.slotX[this.slotOf[i]], this.baseY));
    this.ember.setScale(this.k).setPosition(this.slotX[this.slotOf[this.under || 0]], this.baseY - 8 * this.k);
    this.glow.clear().fillStyle(0xff9a3c, 0.08).fillCircle(this.cx, this.baseY - 10 * this.k, 70 * this.k);
    this.tRound.setPosition(16, 12);
    this.help.setPosition(w / 2, h - 8);
    this.drawSel();
  }

  drawSel() {
    if (!this.slotX) return;
    const x = this.slotX[this.sel], r = 18 * this.k;
    this.selBox.clear();
    if (this.state === 'pick') this.selBox.lineStyle(3, 0xffd97a, 0.9).strokeRoundedRect(x - r, this.baseY - 36 * this.k, r * 2, 40 * this.k, 8);
  }

  say(t) { this.help.setText(t); }

  startRound() {
    this.state = 'show';
    this.tRound.setText('Round ' + (this.round + 1) + ' / ' + this.ROUNDS.length);
    this.slotOf = [0, 1, 2];
    this.under = Phaser.Math.Between(0, 2);
    this.layout();
    this.say('Watch the ember.');
    // lift the pot to show the ember, then cover it
    const pot = this.pots[this.under];
    this.ember.setVisible(true);
    this.tweens.add({ targets: pot, y: this.baseY - 26 * this.k, duration: 300, ease: 'Quad.easeOut', yoyo: true, hold: 900, onComplete: () => {
      this.ember.setVisible(false);
      this.time.delayedCall(250, () => this.shuffle(this.ROUNDS[this.round].swaps));
    } });
  }

  shuffle(n) {
    this.state = 'shuffle';
    this.say('');
    const { ms } = this.ROUNDS[this.round];
    const step = left => {
      if (left === 0) { this.state = 'pick'; this.say(Touch.enabled ? 'Tap the pot with the ember.   Bag: quit' : 'Which pot? Click, or arrows + E.   Esc: quit'); this.drawSel(); return; }
      let a = Phaser.Math.Between(0, 2), b;
      do { b = Phaser.Math.Between(0, 2); } while (b === a);
      const pa = this.slotOf.indexOf(a), pb = this.slotOf.indexOf(b);
      this.slotOf[pa] = b; this.slotOf[pb] = a;
      Snd.tick();
      const arc = 14 * this.k;
      [[pa, b, -1], [pb, a, 1]].forEach(([pot, slot, dir]) => {
        const p = this.pots[pot], x0 = p.x, x1 = this.slotX[slot];
        this.tweens.addCounter({ from: 0, to: 1, duration: ms, ease: 'Sine.easeInOut', onUpdate: t => {
          const v = t.getValue();
          p.x = x0 + (x1 - x0) * v; p.y = this.baseY + dir * Math.sin(v * Math.PI) * arc;
        } });
      });
      this.time.delayedCall(ms + 40, () => step(left - 1));
    };
    step(n);
  }

  pick(potIndex) {
    if (this.state !== 'pick' || this.busy) return;
    this.state = 'reveal';
    this.drawSel();
    const p = this.pots[potIndex];
    const right = potIndex === this.under;
    this.ember.setPosition(this.slotX[this.slotOf[this.under]], this.baseY - 8 * this.k).setVisible(true);
    this.tweens.add({ targets: [p, this.pots[this.under]], y: this.baseY - 26 * this.k, duration: 260, ease: 'Quad.easeOut' });
    if (right) {
      Snd.tick();
      this.round++;
      G.s.shuffleRound = this.round; G.save();
      this.time.delayedCall(1000, () => {
        if (this.round >= this.ROUNDS.length) { Snd.win(); this.time.delayedCall(500, () => this.finish('win')); }
        else this.startRound();
      });
    } else {
      Snd.lose();
      this.time.delayedCall(900, async () => {
        this.busy = true;
        await Story.run(L('Plains', 'Calabar', 'retry'));
        this.busy = false;
        this.startRound();
      });
    }
  }

  key(name) {
    if (this.busy) return;
    if (name === 'back' || name === 'inv') return this.finish('quit');
    if (this.state !== 'pick') return;
    if (name === 'left') this.sel = (this.sel + 2) % 3;
    else if (name === 'right') this.sel = (this.sel + 1) % 3;
    else if (/^num[1-3]$/.test(name)) { this.sel = +name.slice(3) - 1; return this.pick(this.slotOf.indexOf(this.sel)); }
    else if (name === 'act') return this.pick(this.slotOf.indexOf(this.sel));
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
