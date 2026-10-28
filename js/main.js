// ═══════════════════════════════════════════════════════════════
//  MAIN — Phaser game + map flow (new game, continue, map changes)
// ═══════════════════════════════════════════════════════════════
const Game = {
  transitioning: false,
  _created: null,

  arrival(map, name) {
    if (map === 'cabin') return CABIN[name] || CABIN.spawn;
    const a = window.game.cache.json.get('placements').maps[map].arrivals;
    return a[name] || a.new_game || Object.values(a)[0];
  },

  // start the World scene and wait for its create()
  _start(data) {
    return new Promise(res => {
      this._created = res;
      const sm = window.game.scene;
      if (sm.isActive('World') || sm.isPaused('World')) sm.getScene('World').scene.restart(data);
      else sm.start('World', data);
    });
  },

  async startNew() {
    HUD.show(true); Touch.show(true);
    const [x, y, dir] = CABIN.spawn;
    await this._start({ map: 'cabin', x, y, dir });
    G.save();
    await Fade.in(400);
  },

  async startSaved() {
    HUD.show(true); Touch.show(true);
    const s = G.s;
    const map = s.map === 'cabin' || AREAS[s.map] && AREAS[s.map].ready ? s.map : 'garden';
    const sc = await this._start({ map, x: s.x, y: s.y, dir: s.dir });
    await Fade.in(400);
  },

  // fade (300 ms), switch maps, put Jana at the arrival point, then the area's arrival beat
  async goto(map, arriveName) {
    if (this.transitioning) return;
    this.transitioning = true;
    Input.clearHeld();
    G.beforeSave = null;
    await Fade.out(300);
    const [x, y, dir] = this.arrival(map, arriveName);
    G.s.map = map; G.s.x = x; G.s.y = y; G.s.dir = dir;
    G.save();
    const sc = await this._start({ map, x, y, dir, from: arriveName });
    await Fade.in(300);
    this.transitioning = false;
    const h = Story.handlers[map];
    if (h && h.enter) await h.enter(sc, arriveName);
  },
};

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { disableWebAudio: false },
  scene: [BootScene, WorldScene, WhackScene, SledScene],
});

HUD.init();
Dialog.init();
Touch.init();
document.getElementById('fade').style.opacity = 1; // the first map fades in
window.addEventListener('pagehide', () => { if (G.beforeSave) G.save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.beforeSave) G.save(); });

if (DEBUG && Debug.autostart()) { /* debug URL params jump straight into a map */ }
else Title.start();
