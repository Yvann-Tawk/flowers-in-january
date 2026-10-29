// ═══════════════════════════════════════════════════════════════
//  BOOT — loads the garden and everything shared (the title screen covers the wait),
//  then each area's pack (PACKS) when it's first needed or in the background;
//  then launches the AudioScene, which runs for the rest of the game.
// ═══════════════════════════════════════════════════════════════
let bootResolve;
window.bootReady = new Promise(r => { bootResolve = () => { window.bootDone = true; r(); }; });

// loaded in the background by the AudioScene once the game is running (keeps the first load small)
const LATE_AUDIO = [
  ['beach_theme', 'music/beach_theme.mp3'], ['forest_theme', 'music/forest_theme.mp3'], ['games', 'music/games.mp3'],
  ['blossom_theme', 'music/blossom_theme.mp3'], ['gramophone', 'music/gramophone.mp3'], ['plains_theme', 'music/plains_theme.mp3'],
  ['wedding_outro', 'music/wedding_outro.mp3'],
  ['new_area', 'audio/new_area.wav'], ['game-win', 'audio/game-win.wav'], ['gamelose', 'audio/gamelose.wav'], ['gate-unlock', 'audio/gate-unlock.wav'],
];

const INTERIORS = ['garden_cabin', 'beach_hut', 'snow_cabin', 'blossom_house', 'plains_house'];

// ── asset packs: the garden loads first, every other area when it's needed ──
//    (and quietly in the background before then, in story order)
const PACK_ORDER = ['garden', 'beach', 'forest', 'blossom', 'plains', 'ending'];
const PACKS = {
  garden:  { map: 'garden', atlas: 'garden_village', room: 'garden_cabin', sheets: ['characters/jana.png'], props: ['gate_locked', 'gate_open'] },
  beach:   { map: 'beach', atlas: 'beach_village', room: 'beach_hut', sheets: ['beach_A', 'beach_B', 'beach_C', 'beach_D', 'beach_E', 'phoebe'],
             props: ['food_stall_closed', 'bean_bags_pair', 'bean_bag_red_sat', 'sandcastle_flower_flag', 'sandcastle_plain_flag'], images: ['minigames/sand_hole.png'] },
  forest:  { map: 'forest', atlas: 'forest_village', room: 'snow_cabin', sheets: ['forest_A', 'forest_B', 'forest_C', 'forest_D', 'forest_E', 'gilmour'],
             props: ['ice_fishing_hole', 'ice_fishing_hole_rod', 'snowman_nose', 'snowman_no_nose', 'snow_angel_snowed_over', 'table_cloth_corners'],
             images: ['maps/sled_track/sled_track.png', 'minigames/sled_jana.png', 'minigames/sled_gilmour.png'], extra: L => {
               L.json('sled_track', 'maps/sled_track/sled_track.json');
               L.spritesheet('minigames/sled_obstacles.png', 'minigames/sled_obstacles.png', { frameWidth: 32, frameHeight: 32 });
             } },
  blossom: { map: 'blossom', atlas: 'blossom_village', room: 'blossom_house', sheets: ['blossoms_A', 'blossoms_B', 'blossoms_C', 'blossoms_D', 'blossoms_E', 'spike'],
             props: ['planting_plot_empty', 'planting_plot_seeded', 'planting_plot_bloom', 'tea_table_two_cups', 'flat_stone', 'flat_stone_moved', 'record_stall', 'gramophone_broken', 'gramophone_fixed'],
             extra: L => L.spritesheet('minigames/sleeves.png', 'minigames/sleeves.png', { frameWidth: 32, frameHeight: 32 }) },
  plains:  { map: 'plains', atlas: 'dark_plains_village', room: 'plains_house', sheets: ['plains_A', 'plains_B', 'plains_C', 'plains_D', 'plains_E', 'calabar'],
             props: ['lamp_unlit', 'lamp_lit', 'kiln_cold', 'kiln_lit', 'spring', 'spring_hidden', 'footprints_h', 'footprints_h_end'],
             images: ['minigames/clay_pot.png', 'minigames/minigame_ember.png'] },
  ending:  { needs: ['beach', 'forest', 'blossom', 'plains'], scenic: ['hidden_path', 'wedding'], sheets: ['eevie'],
             props: ['food_stall_open', 'aisle_top', 'aisle_mid', 'aisle_bottom', 'altar_arch', 'bunting_l', 'bunting_m', 'bunting_r', 'vase_table_2x2', 'bean_bag_red_sat'],
             images: ['items/item_ring.png', 'items/bouquet.png', 'items/bouquet_2x.png'] },
};
const sheetPath = s => s.includes('/') ? s : (['phoebe', 'gilmour', 'spike', 'calabar'].includes(s) ? 'animals/' : 'characters/') + s + '.png';

function queuePack(scene, name) {
  const P = PACKS[name], L = scene.load;
  const img = k => { if (!scene.textures.exists(k)) L.image(k, k); };
  if (P.map) {
    L.tilemapTiledJSON('map_' + P.map, 'maps/' + P.map + '/map.json');
    L.image('tiles_' + P.map, 'maps/' + P.map + '/spritesheet.png');
    L.json('col_' + P.map, 'maps/' + P.map + '/collision.json');
  }
  if (P.atlas && !scene.textures.exists(P.atlas)) L.atlas(P.atlas, 'atlases/' + P.atlas + '_atlas.png', 'atlases/' + P.atlas + '_phaser_atlas.json');
  if (P.room) {
    const d = 'maps/interiors/' + P.room + '/', k = 'int_' + P.room;
    L.tilemapTiledJSON('map_' + k, d + 'map.json');
    L.atlas('tiles_' + k, d + 'tileset.png', d + 'atlas.json');
    L.json('col_' + k, d + 'collision.json');
    L.json('props_' + k, d + 'props.json');
  }
  (P.scenic || []).forEach(m => {
    const d = 'maps/' + m + '/';
    L.tilemapTiledJSON('map_' + m, d + 'map.json');
    L.image('tiles_' + m, d + 'tileset.png');
    L.json('col_' + m, d + 'collision.json');
    L.json('props_' + m, d + 'props.json');
  });
  (P.sheets || []).map(sheetPath).forEach(k => {
    if (scene.textures.exists(k)) return;
    const sh = SHEETS[k];
    if (sh.kind === 'lpc') L.spritesheet(k, k, { frameWidth: 64, frameHeight: 64 });
    else if (sh.kind === 'fisher') L.image(k, k);
    else if (sh.kind === 'creature') L.spritesheet(k, k, { frameWidth: sh.fw, frameHeight: sh.fh });
    else L.spritesheet(k, k, { frameWidth: 32, frameHeight: 32 });
  });
  (P.props || []).forEach(p => img('props/' + p + '.png'));
  (P.images || []).forEach(img);
  if (P.extra) P.extra(L);
}

const Packs = {
  loaded: { garden: true },
  chain: Promise.resolve(),
  areaOfMap(key) {
    if (mapKind(key) === 'scenic') return 'ending';
    const a = areaOf(key);
    return PACKS[a] ? a : 'garden';
  },
  // load a pack (and the packs it needs); loads run one after another on the Boot loader
  load(name) {
    if (this.loaded[name]) return Promise.resolve();
    const deps = (PACKS[name].needs || []).map(n => this.load(n));
    if (this['p_' + name]) return this['p_' + name];
    const p = this['p_' + name] = Promise.all(deps).then(() => this.chain = this.chain.then(() => new Promise(res => {
      if (this.loaded[name]) return res();
      const boot = window.game.scene.getScene('Boot');
      queuePack(boot, name);
      boot.load.once('complete', () => { Actors.setup(boot); this.loaded[name] = true; res(); });
      boot.load.start();
    })));
    return p;
  },
  ensure(mapKey) { return this.load(this.areaOfMap(mapKey)); },
  // after a map opens, fetch the next areas in story order in the background
  prefetch() {
    const next = PACK_ORDER.find(n => !this.loaded[n] && !this['p_' + n]);
    if (next) this.load(next).then(() => this.prefetch());
  },
};

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const L = this.load;
    L.setPath('assets/');
    L.on('loaderror', f => console.warn('asset failed:', f.key, f.src));
    L.on('progress', p => Title.progress(p));
    const img = k => { if (!this.textures.exists(k)) L.image(k, k); };

    L.json('placements', '../data/placements.json');
    queuePack(this, 'garden');
    // items, flowers, UI used everywhere
    Object.values(ITEMS).forEach(it => img(it.icon));
    for (let n = 1; n <= 24; n++) img(flowerSprite(n));
    img('ui/interact_icon.png');

    // audio
    // first load: the garden's music and the everyday sounds; the rest is LATE_AUDIO
    L.audio('garden_theme', 'music/garden_theme.mp3');
    ['dialogue', 'got-item'].forEach(k => L.audio(k, 'audio/' + k + '.wav'));
    L.audio('flower', 'audio/flower.mp3');
    L.audio('door', 'audio/door.mp3');
    L.audio('fire', 'audio/fire.ogg');
  }

  create() {
    // the one audio manager: launched once, never stopped (FIX_AUDIO.md)
    this.scene.launch('Audio');
    Actors.setup(this);
    // the pixel font must be ready before the first canvas text
    const fontReady = document.fonts ? document.fonts.load('16px PixelAE').then(() => document.fonts.ready).catch(() => {}) : Promise.resolve();
    fontReady.then(() => bootResolve());
  }
}
