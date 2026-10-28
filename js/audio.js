// ═══════════════════════════════════════════════════════════════
//  AUDIO — looped music with crossfades, sound effects, synthesized chimes
// ═══════════════════════════════════════════════════════════════
const Snd = {
  musicOn: true,
  started: false,      // becomes true after the first key / tap (autoplay rules)
  cur: null,           // { key, snd, vol }
  fire: null,
  MUSIC_VOL: 0.4,

  get sm() { return window.game && window.game.sound; },

  start() {
    if (this.started) return;
    this.started = true;
    try { if (this.sm.context && this.sm.context.state === 'suspended') this.sm.context.resume(); } catch (e) {}
    if (this.pending) { const p = this.pending; this.pending = null; this.music(p.key, p.vol); }
  },

  _fade(snd, to, ms, done) {
    if (!snd) return;
    if (snd._fadeT) clearInterval(snd._fadeT);
    const from = snd.volume, t0 = performance.now();
    snd._fadeT = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      try { snd.setVolume(from + (to - from) * k); } catch (e) {}
      if (k >= 1) { clearInterval(snd._fadeT); snd._fadeT = null; if (done) done(); }
    }, 30);
  },

  // Play `key` looped, crossfading from whatever is playing (800 ms).
  music(key, vol = this.MUSIC_VOL) {
    if (!this.started) { this.pending = { key, vol }; return; }
    if (this.cur && this.cur.key === key) {
      this.cur.vol = vol;
      this._fade(this.cur.snd, this.musicOn ? vol : 0, 800);
      return;
    }
    const old = this.cur;
    if (old) this._fade(old.snd, 0, 800, () => { try { old.snd.stop(); old.snd.destroy(); } catch (e) {} });
    if (!key) { this.cur = null; return; }
    let snd;
    try { snd = this.sm.add(key, { loop: true, volume: 0 }); snd.play(); } catch (e) { return; }
    this.cur = { key, snd, vol };
    this._fade(snd, this.musicOn ? vol : 0, 800);
  },

  setFire(on) {
    if (!this.started) return;
    try {
      if (on) {
        if (!this.fire) { this.fire = this.sm.add('fire', { loop: true, volume: 0 }); this.fire.play(); }
        this._fade(this.fire, 0.3, 800);
      } else if (this.fire) {
        const f = this.fire; this.fire = null;
        this._fade(f, 0, 600, () => { try { f.stop(); f.destroy(); } catch (e) {} });
      }
    } catch (e) {}
  },

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.cur) this._fade(this.cur.snd, this.musicOn ? this.cur.vol : 0, 300);
    document.getElementById('mus-btn').innerHTML = this.musicOn ? '&#9835; Music' : '&#9834; Off';
  },

  sfx(key, vol = 0.5) {
    if (!this.started) return;
    try { this.sm.play(key, { volume: vol }); } catch (e) {}
  },

  // Short synthesized tones (no asset exists for these).
  _tones(notes, type = 'triangle', vol = 0.12) {
    if (!this.started) return;
    const ctx = this.sm && this.sm.context;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.01;
    notes.forEach(([freq, at, dur]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0 + at);
      g.gain.linearRampToValueAtTime(vol, t0 + at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + at + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.05);
    });
  },
  chimeGot()  { this._tones([[784, 0, .25], [988, .08, .25], [1319, .16, .4]]); },
  chimeGave() { this._tones([[1175, 0, .22], [880, .09, .35]]); },
  gateClunk() { this._tones([[110, 0, .35], [82, .05, .45]], 'square', 0.06); },
  gateWrong() { this._tones([[220, 0, .18], [196, .12, .3]], 'square', 0.05); },
  blipSoft()  { this._tones([[660, 0, .06]], 'square', 0.03); },
  catchPing() { this._tones([[1046, 0, .12], [1568, .06, .2]], 'sine', 0.12); },
};
