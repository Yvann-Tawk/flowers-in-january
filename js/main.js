// ═══════════════════════════════════════════════════════════════
//  MAIN — Phaser game + map flow (new game, continue, map changes)
// ═══════════════════════════════════════════════════════════════
const Game = {
  transitioning: false,
  _created: null,

  arrival(map, name) {
    if (mapKind(map) === 'tiled') {
      const a = window.game.cache.json.get('placements').maps[map].arrivals;
      return a[name] || a.new_game || Object.values(a)[0];
    }
    const m = window.game.cache.json.get('col_' + mapAssetKey(map)).markers;
    const k = m[name] ? name : ['arrive', 'spawn_wake', 'start', 'jana_start'].find(n => m[n]);
    const mk = m[k];
    return [mk.x, mk.y, k === 'spawn_wake' ? 'right' : mk.face || (k === 'arrive' ? 'up' : 'down')];
  },

  // start the World scene and wait for its create()
  // the area's assets (usually already fetched in the background); "loading…" if we have to wait
  async ensure(map) {
    if (Packs.loaded[Packs.areaOfMap(map)]) return;
    const msg = document.getElementById('loadmsg');
    const t = setTimeout(() => msg.classList.add('on'), 300);
    await Packs.ensure(map);
    clearTimeout(t); msg.classList.remove('on');
  },

  async _start(data) {
    await this.ensure(data.map);
    return new Promise(res => {
      this._created = res;
      const sm = window.game.scene;
      if (sm.isActive('World') || sm.isPaused('World')) sm.getScene('World').scene.restart(data);
      else sm.start('World', data);
    });
  },

  async startNew() {
    HUD.show(true); Touch.show(true);
    const [x, y, dir] = this.arrival('interior:garden_cabin', 'spawn_wake');
    await this._start({ map: 'interior:garden_cabin', x, y, dir });
    G.save();
    await Fade.in(400);
  },

  async startSaved() {
    HUD.show(true); Touch.show(true);
    const s = G.s;
    // the ending maps aren't resumed mid-scene: Continue puts Jana back at the gate
    if (mapKind(s.map) === 'scenic' || !(MAPS.includes(s.map) || s.map.startsWith('interior:'))) { s.map = 'garden'; s.x = 16; s.y = 45; s.dir = 'down'; }
    const sc = await this._start({ map: s.map, x: s.x, y: s.y, dir: s.dir });
    await Fade.in(400);
  },

  // fade (300 ms), switch maps, put Jana at the arrival point, then the area's arrival beat
  //   opts.fade: fade length · opts.at: [x, y, dir] instead of a named arrival · opts.silentFade: already faded out
  async goto(map, arriveName, opts = {}) {
    if (this.transitioning) return;
    this.transitioning = true;
    Input.clearHeld();
    G.beforeSave = null;
    const ms = opts.fade || 300;
    if (!opts.silentFade) await Fade.out(ms);
    await this.ensure(map);
    const [x, y, dir] = opts.at || this.arrival(map, arriveName);
    G.s.map = map; G.s.x = x; G.s.y = y; G.s.dir = dir;
    G.save();
    const sc = await this._start({ map, x, y, dir, from: arriveName });
    await Fade.in(opts.silentFade ? 1500 : ms);
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
  scene: [BootScene, AudioScene, WorldScene, WhackScene, SledScene, SleevesScene, ShuffleScene],
});

HUD.init();
FlowerBook.init();
Dialog.init();
Touch.init();
document.getElementById('fade').style.opacity = 1; // the first map fades in
window.addEventListener('pagehide', () => { if (G.beforeSave) G.save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.beforeSave) G.save(); });

if (DEBUG && Debug.autostart()) { /* debug URL params jump straight into a map */ }
else Title.start();
