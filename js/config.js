// ═══════════════════════════════════════════════════════════════
//  CONFIG — constants, registries (areas, items, flowers, fragments)
// ═══════════════════════════════════════════════════════════════
const GAME_NAME = 'Flowers in January';
const TILE = 32;          // world tile size (px)
const ZOOM = 2;           // camera zoom (integer, crisp)
const WALK_SPEED = 4.6;   // tiles per second
const SAVE_KEY = 'flowers-in-january-save';
const DEBUG = /[?&]debug=1/.test(location.search);

// LPC sheet layout (832×3456, 13 columns of 64×64). Rows above 25 are undressed: never use them.
const LPC = { cols: 13, walk: { up: 8, left: 9, down: 10, right: 11 }, idle: { up: 22, left: 23, down: 24, right: 25 } };
// fishing-rod strip below the LPC block on the fishermen sheets (128×128 frames, 13 per row)
const ROD = { firstRow: 27, dirs: { up: 0, left: 1, down: 2, right: 3 }, loop: [5, 6, 7, 8, 9, 8, 7, 6] };
// creature sheets: rows = down, left, right, up
const CREATURE_ROWS = { down: 0, left: 1, right: 2, up: 3 };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ── Area registry ───────────────────────────────────────────────
const AREAS = {
  garden:  { label: 'The Garden',      music: 'garden_theme',  sheet: 'Garden' },
  beach:   { label: 'Nowhere Beach',   music: 'beach_theme',   sheet: 'Beach',   guardian: 'phoebe',  fragment: 'fragment_phoebe',  flag: 'fragment_01' },
  forest:  { label: 'Snowy Forest',    music: 'forest_theme',  sheet: 'Forest',  guardian: 'gilmour', fragment: 'fragment_gilmour', flag: 'fragment_28' },
  blossom: { label: 'Cherry Blossoms', music: 'blossom_theme', sheet: 'Blossom', guardian: 'spike',   fragment: 'fragment_spike',   flag: 'fragment_26' },
  plains:  { label: 'Dark Plains',     music: 'plains_theme',  sheet: 'Plains',  guardian: 'calabar', fragment: 'fragment_calabar', flag: 'fragment_20' },
  hidden_path: { label: '', music: 'garden_theme' },
  wedding: { label: '', music: 'wedding_outro' },
};
const MAPS = ['garden', 'beach', 'forest', 'blossom', 'plains'];
const ROOM_LABELS = { garden_cabin: 'The Cabin', beach_hut: 'The Harbour Inn', snow_cabin: 'The Lodge', blossom_house: 'The Inn', plains_house: 'The Lantern Inn' };
// area a map belongs to (interiors use their outside map's music)
function areaOf(key) {
  if (key.startsWith('interior:')) {
    const pl = window.game && window.game.cache.json.get('placements');
    return (pl && pl.interiors[key.slice(9)] || {}).exit_to || 'garden';
  }
  return key;
}

// ── Cipher (STORY.md) ───────────────────────────────────────────
// Note order: Gilmour, Phoebe, Calabar, Spike → Day / Month / Year (first half) / Year (second half).
// signs.png frames: 0 Phoebe (sun), 1 Gilmour (moon), 2 Spike (heart), 3 Calabar (eye).
const FRAGMENTS = {
  fragment_gilmour: { digits: '18', sign: 1, guardian: 'Gilmour', field: 'day' },
  fragment_phoebe:  { digits: '01', sign: 0, guardian: 'Phoebe',  field: 'month' },
  fragment_calabar: { digits: '20', sign: 3, guardian: 'Calabar', field: 'year1' },
  fragment_spike:   { digits: '26', sign: 2, guardian: 'Spike',   field: 'year2' },
};
const NOTE_ORDER = ['fragment_gilmour', 'fragment_phoebe', 'fragment_calabar', 'fragment_spike'];
const GATE_ANSWER = { day: '18', month: '01', year: '2026' };   // 18 / 01 / 2026

// ── Items (names exactly as the spreadsheet's GIVE / TAKE actions) ─
const ITEMS = {
  note:             { name: 'Note',               icon: 'items/item_note.png' },
  bottle:           { name: 'Old bottle',         icon: 'items/item_bottle.png' },
  shell:            { name: 'Big shell',          icon: 'items/item_shell.png' },
  glasses:          { name: 'Borrowed glasses',   icon: 'items/item_glasses.png' },
  keychain:         { name: 'Bean bag keychain',  icon: 'items/keepsake_keychain.png' },
  fragment_phoebe:  { name: 'Fragment 01',        icon: 'items/fragment_phoebe.png', fragment: true },
  fish:             { name: 'Fish',               icon: 'items/item_fish.png' },
  carrot:           { name: 'Carrot',             icon: 'items/item_carrot.png' },
  kindling:         { name: 'Kindling',           icon: 'items/item_kindling.png' },
  bandaid:          { name: 'Band-aid',           icon: 'items/keepsake_bandaid.png' },
  fragment_gilmour: { name: 'Fragment 18',        icon: 'items/fragment_gilmour.png', fragment: true },
  seed:             { name: 'Seed',               icon: 'items/item_seed.png' },
  key:              { name: 'Winding key',        icon: 'items/item_key.png' },
  tea:              { name: 'Tea',                icon: 'items/item_tea.png' },
  needle:           { name: 'Gramophone needle',  icon: 'items/item_needle.png' },
  vinyl:            { name: 'Vinyl record',       icon: 'items/keepsake_vinyl.png' },
  fragment_spike:   { name: 'Fragment 26',        icon: 'items/fragment_spike.png', fragment: true },
  ember:            { name: 'Ember',              icon: 'items/item_ember.png' },
  fireflies:        { name: 'Jar of fireflies',   icon: 'items/item_fireflies.png' },
  flask:            { name: 'Empty flask',        icon: 'items/item_flask_empty.png' },
  water:            { name: 'Spring water',       icon: 'items/item_water.png' },
  vases:            { name: 'Two clay vases',     icon: 'items/keepsake_vases.png' },
  fragment_calabar: { name: 'Fragment 20',        icon: 'items/fragment_calabar.png', fragment: true },
};
// spreadsheet item name → id ("TAKE Flask" is the empty flask)
// the sheet's Gilmour fragment is still named "Fragment 28" (the date is now 18/01/2026)
const ITEM_BY_NAME = { Flask: 'flask', 'Fragment 28': 'fragment_gilmour' };
Object.keys(ITEMS).forEach(id => { ITEM_BY_NAME[ITEMS[id].name] = id; });

// ── Flowers → poems: read from the spreadsheet's "FLOWER n (poem p)" actions ─
const FLOWERS = {};
DIALOGUE.forEach(r => r.actions.forEach(a => { if (a.type === 'FLOWER') FLOWERS[a.n] = { poem: a.poem }; }));
function flowerSprite(n) { return 'items/flowers/flower_' + String(n).padStart(2, '0') + '.png'; }

// Map fixes: tiles that sit on top of a placement and hide it.
// blossom: a weeping sakura (cols 33–35, rows 26–29) stands exactly where the gramophone and the
// record stall keeper are placed, so its tiles, canopy and trunk collision are cleared.
// Path overlays for exits that have none in the kit: the forest's west exit (1, 27) back to the
// garden had no visible opening, so a packed-snow trail runs from the plaza to the map edge.
const EXTRA_OVERLAYS = {
  forest: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(x => ({ x, y: 27, atlas: 'forest_village', frame: 'trail_packed_ew' })),
};

const MAP_FIXES = {
  blossom: [{ clear: [33, 26, 35, 29] }],
};

// garden signpost by the east exit (no spot for it in placements.json)
const EXTRA_SPOTS = {
  garden: [{ id: 'sign_beach', x: 41, y: 24, kind: 'look' }],
};
