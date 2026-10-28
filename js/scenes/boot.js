// ═══════════════════════════════════════════════════════════════
//  BOOT — loads every asset once (the title screen covers the wait),
//  then launches the AudioScene, which runs for the rest of the game.
// ═══════════════════════════════════════════════════════════════
let bootResolve;
window.bootReady = new Promise(r => { bootResolve = r; });

const INTERIORS = ['garden_cabin', 'beach_hut', 'snow_cabin', 'blossom_house', 'plains_house'];
const ATLASES = ['garden_village', 'beach_village', 'forest_village', 'blossom_village', 'dark_plains_village'];

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const L = this.load;
    L.setPath('assets/');
    L.on('loaderror', f => console.warn('asset failed:', f.key, f.src));
    const img = k => { if (!this.textures.exists(k)) L.image(k, k); };

    L.json('placements', '../data/placements.json');
    MAPS.forEach(m => {
      L.tilemapTiledJSON('map_' + m, 'maps/' + m + '/map.json');
      L.image('tiles_' + m, 'maps/' + m + '/spritesheet.png');
      L.json('col_' + m, 'maps/' + m + '/collision.json');
    });
    INTERIORS.forEach(r => {
      const d = 'maps/interiors/' + r + '/', k = 'int_' + r;
      L.tilemapTiledJSON('map_' + k, d + 'map.json');
      L.atlas('tiles_' + k, d + 'tileset.png', d + 'atlas.json');
      L.json('col_' + k, d + 'collision.json');
      L.json('props_' + k, d + 'props.json');
    });
    SCENIC.forEach(m => {
      const d = 'maps/' + m + '/';
      L.tilemapTiledJSON('map_' + m, d + 'map.json');
      L.image('tiles_' + m, d + 'tileset.png');
      L.json('col_' + m, d + 'collision.json');
      L.json('props_' + m, d + 'props.json');
    });
    L.json('sled_track', 'maps/sled_track/sled_track.json');
    img('maps/sled_track/sled_track.png');
    ATLASES.forEach(a => L.atlas(a, 'atlases/' + a + '_atlas.png', 'atlases/' + a + '_phaser_atlas.json'));

    // characters
    Object.keys(SHEETS).forEach(k => {
      const sh = SHEETS[k];
      if (sh.kind === 'lpc') L.spritesheet(k, k, { frameWidth: 64, frameHeight: 64 });
      else if (sh.kind === 'fisher') L.image(k, k);
      else if (sh.kind === 'creature') L.spritesheet(k, k, { frameWidth: sh.fw, frameHeight: sh.fh });
      else L.spritesheet(k, k, { frameWidth: 32, frameHeight: 32 });
    });

    // every prop image (outdoor props, their other states, the ending props)
    ['gate_locked', 'gate_open', 'food_stall_closed', 'food_stall_open', 'bean_bags_pair', 'bean_bag_red_sat', 'sandcastle_flower_flag',
      'sandcastle_plain_flag', 'ice_fishing_hole', 'ice_fishing_hole_rod', 'snowman_nose', 'snowman_no_nose', 'snow_angel_snowed_over',
      'table_cloth_corners', 'planting_plot_empty', 'planting_plot_seeded', 'planting_plot_bloom', 'tea_table_two_cups', 'flat_stone',
      'flat_stone_moved', 'record_stall', 'gramophone_broken', 'gramophone_fixed', 'lamp_unlit', 'lamp_lit', 'kiln_cold', 'kiln_lit',
      'spring', 'spring_hidden', 'footprints_h', 'footprints_h_end', 'aisle_top', 'aisle_mid', 'aisle_bottom', 'altar_arch',
      'bunting_l', 'bunting_m', 'bunting_r', 'vase_table_2x2'].forEach(p => img('props/' + p + '.png'));

    // items, flowers, UI, minigames
    Object.values(ITEMS).forEach(it => img(it.icon));
    for (let n = 1; n <= 24; n++) img(flowerSprite(n));
    ['items/item_ring.png', 'items/bouquet.png', 'items/bouquet_2x.png', 'ui/interact_icon.png', 'minigames/sand_hole.png',
      'minigames/sled_jana.png', 'minigames/sled_gilmour.png', 'minigames/clay_pot.png', 'minigames/minigame_ember.png'].forEach(img);
    L.spritesheet('minigames/sled_obstacles.png', 'minigames/sled_obstacles.png', { frameWidth: 32, frameHeight: 32 });
    L.spritesheet('minigames/sleeves.png', 'minigames/sleeves.png', { frameWidth: 32, frameHeight: 32 });

    // audio
    ['garden_theme', 'beach_theme', 'forest_theme', 'blossom_theme', 'plains_theme', 'wedding_outro'].forEach(m => L.audio(m, 'music/' + m + '.mp3'));
    ['dialogue', 'got-item', 'gate-unlock', 'new_area', 'game-win', 'gamelose'].forEach(k => L.audio(k, 'audio/' + k + '.wav'));
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
