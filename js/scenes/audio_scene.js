// ═══════════════════════════════════════════════════════════════
//  AUDIO SCENE — the one place that owns music and sound effects.
//  Launched once from Boot and never stopped (see FIX_AUDIO.md).
//  Everything else talks to it through game events:
//    audio:music key · audio:sfx key opts · audio:loop key on · audio:mute bool · audio:musicOn bool
// ═══════════════════════════════════════════════════════════════
class AudioScene extends Phaser.Scene {
  constructor() { super({ key: 'Audio', active: false }); }

  create() {
    this.sound.pauseOnBlur = false;          // clicking another window must not pause the music
    this.current = null; this.currentKey = null;
    this.loops = {};                         // named looping SFX (fire)
    this.sfx = {};                           // one reusable instance per SFX key
    this.musicVol = 0.45; this.sfxVol = 0.8;
    this.musicOn = true;

    // resume the audio context on the first input, then start whatever is wanted
    const unlock = () => { if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume(); };
    this.input.keyboard.on('keydown', unlock);
    this.input.on('pointerdown', unlock);
    if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      if (this.pending !== undefined) { const p = this.pending; this.pending = undefined; this.playMusic(p); }
      Object.keys(this.wantLoops || {}).forEach(k => this.setLoop(k, this.wantLoops[k]));
    });

    const ev = this.game.events;
    ev.on('audio:music', k => this.playMusic(k));
    ev.on('audio:sfx', (k, o) => this.playSfx(k, o));
    ev.on('audio:loop', (k, on) => this.setLoop(k, on));
    ev.on('audio:sfxStop', k => { const s = this.sfx[k]; if (s && s.isPlaying) s.stop(); });
    ev.on('audio:mute', m => { this.sound.mute = m; });
    ev.on('audio:musicOn', on => this.setMusicOn(on));
    // catch up on anything asked for before this scene existed
    if (Snd.want.music !== undefined) this.playMusic(Snd.want.music);
    Object.keys(Snd.want.loops).forEach(k => this.setLoop(k, Snd.want.loops[k]));
    ev.emit('audio:ready');
  }

  playMusic(key, fade = 800) {
    if (this.sound.locked) { this.pending = key; return; }
    if (key === this.currentKey) return;     // same area: keep playing, don't restart
    const old = this.current;
    if (old) {
      this.tweens.killTweensOf(old);
      this.tweens.add({ targets: old, volume: 0, duration: fade, onComplete: () => { old.stop(); old.destroy(); } });
    }
    this.currentKey = key; this.current = null;
    if (!key) return;
    const m = this.sound.add(key, { loop: true, volume: 0 });
    m.play();
    this.current = m;
    // the tween lives here, so a map change can never kill it half-way
    this.tweens.add({ targets: m, volume: this.musicOn ? this.musicVol : 0, duration: fade });
  }

  setMusicOn(on) {
    this.musicOn = on;
    if (!this.current) return;
    this.tweens.killTweensOf(this.current);
    this.tweens.add({ targets: this.current, volume: on ? this.musicVol : 0, duration: 300 });
  }

  playSfx(key, { volume = 1, detune = 0 } = {}) {
    if (this.sound.locked) return;
    let s = this.sfx[key];
    if (!s) s = this.sfx[key] = this.sound.add(key);
    if (key === 'dialogue' && s.isPlaying) return;   // blips never stack
    s.play({ volume: volume * this.sfxVol, detune });
  }

  setLoop(key, on) {
    this.wantLoops = this.wantLoops || {};
    this.wantLoops[key] = on;
    if (this.sound.locked) return;
    let s = this.loops[key];
    if (on) {
      if (!s) s = this.loops[key] = this.sound.add(key, { loop: true, volume: 0.5 * this.sfxVol });
      if (!s.isPlaying) s.play();
    } else if (s) s.stop();
  }
}
