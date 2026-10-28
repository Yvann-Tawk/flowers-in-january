// ═══════════════════════════════════════════════════════════════
//  AUDIO SCENE — the one place that owns music and sound effects.
//  Launched once from Boot and never stopped (see FIX_AUDIO.md).
//  Everything else talks to it through game events:
//    audio:music key · audio:sfx key opts · audio:sfxStop key · audio:fire level(0–1)
//    audio:duck ms · audio:mute bool · audio:musicOn bool
//
//  Music and the fire loop use the browser's own looping (AudioBufferSourceNode.loop)
//  with gain-node fades, so they loop gaplessly and never depend on the game loop
//  (which browsers slow down or stop when the tab is in the background).
// ═══════════════════════════════════════════════════════════════
class AudioScene extends Phaser.Scene {
  constructor() { super({ key: 'Audio', active: false }); }

  create() {
    this.sound.pauseOnBlur = false;          // clicking another window must not pause anything
    this.sfx = {};                           // one reusable Phaser sound per SFX key
    this.musicVol = 0.45; this.sfxVol = 0.8; this.fireVol = 0.55;
    this.musicOn = true;
    this.current = null;                     // { key, src, gain }
    this.currentKey = undefined;

    const ctx = this.ctx = this.sound.context;
    // music bus: on/off and ducking (gramophone) happen here, fades per track below it
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.sound.destination);
    // fire bus: its level follows how close Jana is to a fire
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    this.fireGain.connect(this.sound.destination);
    this.fireSrc = null;

    // resume the audio context on the first input
    const unlock = () => { if (ctx.state === 'suspended') ctx.resume(); };
    this.input.keyboard.on('keydown', unlock);
    this.input.on('pointerdown', unlock);

    const ev = this.game.events;
    ev.on('audio:music', k => this.playMusic(k));
    ev.on('audio:sfx', (k, o) => this.playSfx(k, o));
    ev.on('audio:sfxStop', k => { const s = this.sfx[k]; if (s && s.isPlaying) s.stop(); });
    ev.on('audio:fire', lvl => this.setFire(lvl));
    ev.on('audio:duck', ms => this.duck(ms));
    ev.on('audio:mute', m => { this.sound.mute = m; });
    ev.on('audio:musicOn', on => this.setMusicOn(on));
    // catch up on anything asked for before this scene existed
    if (Snd.want.music !== undefined) this.playMusic(Snd.want.music);
    if (Snd.want.fire) this.setFire(Snd.want.fire);
  }

  ramp(param, to, ms) {
    const t = this.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(to, t + ms / 1000);
  }

  loopSource(key, gain) {
    const buf = this.cache.audio.get(key);
    if (!buf || !(buf instanceof AudioBuffer)) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    return src;
  }

  // crossfade to `key` (800 ms); the same key keeps playing without a restart
  playMusic(key, fade = 800) {
    if (key === this.currentKey) return;
    const old = this.current;
    if (old) {
      this.ramp(old.gain.gain, 0, fade);
      setTimeout(() => { try { old.src.stop(); } catch (e) {} old.src.disconnect(); old.gain.disconnect(); }, fade + 50);
    }
    this.currentKey = key; this.current = null;
    if (!key) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.musicBus);
    const src = this.loopSource(key, gain);
    if (!src) return;
    this.current = { key, src, gain };
    this.ramp(gain.gain, this.musicVol, fade);
  }

  setMusicOn(on) {
    this.musicOn = on;
    this.ramp(this.musicBus.gain, on ? 1 : 0, 300);
  }

  // lower the music while something else plays (the gramophone), then bring it back
  duck(ms) {
    if (!this.musicOn) return;
    this.ramp(this.musicBus.gain, 0.12, 300);
    clearTimeout(this._duckT);
    this._duckT = setTimeout(() => { if (this.musicOn) this.ramp(this.musicBus.gain, 1, 900); }, ms);
  }

  setFire(level) {
    level = Math.max(0, Math.min(1, level || 0));
    if (level > 0 && !this.fireSrc) this.fireSrc = this.loopSource('fire', this.fireGain);
    const t = this.ctx.currentTime;
    this.fireGain.gain.cancelScheduledValues(t);
    this.fireGain.gain.setTargetAtTime(level * this.fireVol, t, 0.25);
  }

  playSfx(key, { volume = 1, detune = 0 } = {}) {
    if (this.ctx.state !== 'running') return;
    let s = this.sfx[key];
    if (!s) s = this.sfx[key] = this.sound.add(key);
    if (key === 'dialogue' && s.isPlaying) return;   // blips never stack
    s.play({ volume: volume * this.sfxVol, detune });
  }
}
