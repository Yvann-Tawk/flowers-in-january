// ═══════════════════════════════════════════════════════════════
//  AUDIO — thin front end. All playback happens in AudioScene
//  (js/scenes/audio_scene.js); this only emits events to it.
// ═══════════════════════════════════════════════════════════════
const Snd = {
  musicOn: true,

  emit(...a) { if (window.game) window.game.events.emit(...a); },

  // first key / tap: let the browser start audio (autoplay rules)
  start() {
    try {
      const sm = window.game && window.game.sound;
      if (sm && sm.context && sm.context.state === 'suspended') sm.context.resume();
    } catch (e) {}
  },

  // remembered so the AudioScene can pick them up if it starts after the first request
  want: { music: undefined, loops: {} },
  music(key) { this.want.music = key; this.emit('audio:music', key); },
  sfx(key, opts) { this.emit('audio:sfx', key, opts); },
  loop(key, on) { this.want.loops[key] = on; this.emit('audio:loop', key, on); },

  toggleMusic() {
    this.musicOn = !this.musicOn;
    this.emit('audio:musicOn', this.musicOn);
    document.getElementById('mus-btn').innerHTML = this.musicOn ? '&#9835; Music' : '&#9834; Off';
  },

  // named sounds (files in assets/audio)
  blipStop() { this.emit('audio:sfxStop', 'dialogue'); },
  blip()     { this.sfx('dialogue', { volume: 0.5 }); },
  tick()     { this.sfx('dialogue', { volume: 0.35, detune: 500 }); },
  got()      { this.sfx('got-item', { volume: 0.8 }); },
  gave()     { this.sfx('got-item', { volume: 0.55, detune: -400 }); },
  flower()   { this.sfx('flower', { volume: 0.8 }); },
  door()     { this.sfx('door', { volume: 0.6 }); },
  win()      { this.sfx('game-win', { volume: 0.8 }); },
  lose()     { this.sfx('gamelose', { volume: 0.6 }); },
  unlock()   { this.sfx('gate-unlock', { volume: 0.9 }); },
  newArea()  { this.sfx('new_area', { volume: 0.7 }); },
};
