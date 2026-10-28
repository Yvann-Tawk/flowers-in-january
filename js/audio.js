// ═══════════════════════════════════════════════════════════════
//  AUDIO — thin front end. All playback happens in AudioScene
//  (js/scenes/audio_scene.js); this only emits events to it.
//
//  Which sound plays when:
//    dialogue     the talking effect (every 3rd letter, never stacked)
//    flower       Jana receives a flower
//    got-item     an NPC gives Jana an item
//    game-win     a minigame is won        gamelose   a minigame is lost
//    gate-unlock  the final gate opens     new_area   Jana arrives in a new area
//    gramophone   Jana plays the gramophone (music ducks around it)
//    fire         loops quietly, louder the closer Jana is to a fire
//    games        the boss music, during the guardians' minigames
// ═══════════════════════════════════════════════════════════════
const Snd = {
  musicOn: true,
  BOSS_MUSIC: 'games',

  emit(...a) { if (window.game) window.game.events.emit(...a); },

  // first key / tap: let the browser start audio (autoplay rules)
  start() {
    try {
      const sm = window.game && window.game.sound;
      if (sm && sm.context && sm.context.state === 'suspended') sm.context.resume();
    } catch (e) {}
  },

  // remembered so the AudioScene can pick them up if it starts after the first request
  want: { music: undefined, fire: 0 },
  music(key) { this.want.music = key; this.emit('audio:music', key); },
  sfx(key, opts) { this.emit('audio:sfx', key, opts); },
  fire(level) {
    if (level === this.want.fire || (level !== 0 && Math.abs(level - this.want.fire) < 0.03)) return;
    this.want.fire = level; this.emit('audio:fire', level);
  },

  toggleMusic() {
    this.musicOn = !this.musicOn;
    this.emit('audio:musicOn', this.musicOn);
    document.getElementById('mus-btn').innerHTML = this.musicOn ? '&#9835; Music' : '&#9834; Off';
  },

  // named sounds (files in assets/audio and assets/music)
  blipStop()   { this.emit('audio:sfxStop', 'dialogue'); },
  blip()       { this.sfx('dialogue', { volume: 0.5 }); },
  tick()       { this.sfx('dialogue', { volume: 0.3, detune: 500 }); },  // UI clicks, card flips
  got()        { this.sfx('got-item', { volume: 0.8 }); },
  flower()     { this.sfx('flower', { volume: 0.8 }); },
  door()       { this.sfx('door', { volume: 0.6 }); },
  win()        { this.sfx('game-win', { volume: 0.8 }); },
  lose()       { this.sfx('gamelose', { volume: 0.6 }); },
  unlock()     { this.sfx('gate-unlock', { volume: 0.9 }); },
  newArea()    { this.sfx('new_area', { volume: 0.7 }); },
  gramophone() { this.emit('audio:duck', 6600); this.sfx('gramophone', { volume: 1 }); },
};
