// ═══════════════════════════════════════════════════════════════
//  BOOT — loads every asset once (the title screen covers the wait)
// ═══════════════════════════════════════════════════════════════
let bootResolve;
window.bootReady = new Promise(r => { bootResolve = r; });

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const L = this.load;
    L.setPath('assets/');
    L.on('loaderror', f => console.warn('asset failed:', f.key, f.src));

    L.json('placements', '../data/placements.json');
    MAPS.forEach(m => {
      L.tilemapTiledJSON('map_' + m, 'maps/' + m + '/map.json');
      L.image('tiles_' + m, 'maps/' + m + '/spritesheet.png');
      L.json('col_' + m, 'maps/' + m + '/collision.json');
    });
    L.image(CABIN.img, CABIN.img);
    L.json('col_cabin', CABIN.collision);
    L.json('sled_track', 'maps/sled_track/sled_track.json');
    L.image('maps/sled_track/sled_track.png', 'maps/sled_track/sled_track.png');
    L.atlas('beach_village', 'atlases/beach_village_atlas.png', 'atlases/beach_village_phaser_atlas.json');
    L.atlas('forest_village', 'atlases/forest_village_atlas.png', 'atlases/forest_village_phaser_atlas.json');

    // characters
    Object.keys(SHEETS).forEach(k => {
      const sh = SHEETS[k];
      if (sh.kind === 'lpc') L.spritesheet(k, k, { frameWidth: 64, frameHeight: 64 });
      else if (sh.kind === 'fisher') L.image(k, k);
      else if (sh.kind === 'creature') L.spritesheet(k, k, { frameWidth: sh.fw, frameHeight: sh.fh });
      else L.spritesheet(k, k, { frameWidth: 32, frameHeight: 32 });
    });

    // props used in this build (two-state images included)
    const props = new Set(['props/bean_bag_red_sat.png', 'props/ice_fishing_hole_rod.png', 'props/ice_fishing_hole.png']);
    // (placements are read after load; list the known ones here)
    ['gate_locked', 'gate_open', 'food_stall_closed', 'bean_bags_pair', 'sandcastle_flower_flag', 'sandcastle_plain_flag',
      'snowman_nose', 'snowman_no_nose', 'snow_angel_snowed_over', 'table_cloth_corners'].forEach(p => props.add('props/' + p + '.png'));
    props.forEach(p => L.image(p, p));

    // items, flowers, UI, minigames
    Object.values(ITEMS).forEach(it => { if (!this.textures.exists(it.icon)) L.image(it.icon, it.icon); });
    for (let n = 1; n <= 12; n++) L.image(flowerSprite(n), flowerSprite(n));
    ['ui/interact_icon.png', 'minigames/sand_hole.png', 'minigames/sled_jana.png', 'minigames/sled_gilmour.png'].forEach(k => L.image(k, k));
    L.spritesheet('minigames/sled_obstacles.png', 'minigames/sled_obstacles.png', { frameWidth: 32, frameHeight: 32 });

    // audio
    ['garden_theme', 'beach_theme', 'forest_theme'].forEach(m => L.audio(m, 'music/' + m + '.mp3'));
    L.audio('talk', 'audio/talk.mp3');
    L.audio('flower', 'audio/flower.mp3');
    L.audio('door', 'audio/door.mp3');
    L.audio('fire', 'audio/fire.ogg');
  }

  create() {
    Actors.setup(this);
    // make sure the pixel font is ready for canvas text
    const fontReady = document.fonts && document.fonts.load ? document.fonts.load('16px VT323').catch(() => {}) : Promise.resolve();
    fontReady.then(() => bootResolve());
  }
}
