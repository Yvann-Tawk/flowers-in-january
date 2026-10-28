// ═══════════════════════════════════════════════════════════════
//  CONFIG — constants, registries (areas, items, flowers, fragments)
// ═══════════════════════════════════════════════════════════════
const TILE = 32;          // world tile size (px)
const ZOOM = 2;           // camera zoom (integer, crisp)
const WALK_SPEED = 4.6;   // tiles per second
const SAVE_KEY = 'janas-garden-de-v1';
const DEBUG = /[?&]debug=1/.test(location.search);

// LPC sheet layout (832×3456, 13 columns of 64×64). Rows above 25 are undressed: never use them.
const LPC = { cols: 13, walk: { up: 8, left: 9, down: 10, right: 11 }, idle: { up: 22, left: 23, down: 24, right: 25 } };
// fishing-rod strip below the LPC block on the fishermen sheets (128×128 frames, 13 per row)
const ROD = { firstRow: 27, dirs: { up: 0, left: 1, down: 2, right: 3 }, loop: [5, 6, 7, 8, 9, 8, 7, 6] };
// creature sheets: rows = down, left, right, up
const CREATURE_ROWS = { down: 0, left: 1, right: 2, up: 3 };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ── Area registry ───────────────────────────────────────────────
// Later areas are listed so their hooks exist (guardian, fragment, music); `ready:false` keeps them out of play.
const AREAS = {
  garden:   { label: "Jana's Garden",  music: 'garden_theme', ready: true },
  beach:    { label: 'Nowhere Beach',  music: 'beach_theme',  ready: true, guardian: 'phoebe',  fragment: 'fragment_phoebe',  flowers: [1, 6] },
  forest:   { label: 'Snowy Forest',   music: 'forest_theme', ready: true, guardian: 'gilmour', fragment: 'fragment_gilmour', flowers: [7, 12] },
  blossoms: { label: 'Cherry Blossoms', music: null, ready: false, guardian: 'spike',   fragment: 'fragment_spike',   flowers: [13, 18] }, // TODO: Area 3
  plains:   { label: 'Dark Plains',     music: null, ready: false, guardian: 'calabar', fragment: 'fragment_calabar', flowers: [19, 24] }, // TODO: Area 4
};

// ── Cipher (STORY.md) ───────────────────────────────────────────
// Note order: Gilmour, Phoebe, Calabar, Spike → Day / Month / Year (first half) / Year (second half).
// signs.png frames: 0 Phoebe (sun), 1 Gilmour (moon), 2 Spike (heart), 3 Calabar (eye).
const FRAGMENTS = {
  fragment_gilmour: { digits: '28', sign: 1, guardian: 'Gilmour', field: 'day' },
  fragment_phoebe:  { digits: '01', sign: 0, guardian: 'Phoebe',  field: 'month' },
  fragment_calabar: { digits: '20', sign: 3, guardian: 'Calabar', field: 'year1' }, // hook: Area 4
  fragment_spike:   { digits: '26', sign: 2, guardian: 'Spike',   field: 'year2' }, // hook: Area 3
};
const NOTE_ORDER = ['fragment_gilmour', 'fragment_phoebe', 'fragment_calabar', 'fragment_spike'];
const GATE_ANSWER = { day: '28', month: '01', year: '2026' };

// ── Items ───────────────────────────────────────────────────────
const ITEMS = {
  note:             { name: 'The note',          icon: 'ui/note_page.png' },
  bottle:           { name: 'Old bottle',        icon: 'items/item_bottle.png' },
  shell:            { name: 'Big shell',         icon: 'items/item_shell.png' },
  glasses:          { name: 'Borrowed glasses',  icon: 'items/item_glasses.png' },
  keychain:         { name: 'Bean bag keychain', icon: 'items/keepsake_keychain.png' },
  fragment_phoebe:  { name: 'Fragment 01',       icon: 'items/fragment_phoebe.png', fragment: true },
  fish:             { name: 'Fish',              icon: 'items/item_fish.png' },
  carrot:           { name: 'Carrot',            icon: 'items/item_carrot.png' },
  kindling:         { name: 'Kindling',          icon: 'items/item_kindling.png' },
  bandaid:          { name: 'Band-aid',          icon: 'items/keepsake_bandaid.png' },
  fragment_gilmour: { name: 'Fragment 28',       icon: 'items/fragment_gilmour.png', fragment: true },
  // hooks for later areas (debug only in this build)
  fragment_spike:   { name: 'Fragment 26',       icon: 'items/fragment_spike.png', fragment: true },
  fragment_calabar: { name: 'Fragment 20',       icon: 'items/fragment_calabar.png', fragment: true },
};

// ── Flowers → poems (DIALOGUE.md table; poem = id in js/data.js) ─
const FLOWERS = {
  1: { poem: 1 },  2: { poem: 2 },  3: { poem: 3 },  4: { poem: 16 }, 5: { poem: 22 }, 6: { poem: 4 },
  7: { poem: 6 },  8: { poem: 7 },  9: { poem: 8 },  10: { poem: 13 }, 11: { poem: 5 }, 12: { poem: 9 },
};
function flowerSprite(n) { return 'items/flowers/flower_' + String(n).padStart(2, '0') + '.png'; }

// ── Maps ────────────────────────────────────────────────────────
const MAPS = ['garden', 'beach', 'forest'];
const CABIN = {
  img: 'maps/cabin/map_inside.png', collision: 'maps/cabin/collision_inside.json', scale: 2,
  spawn: [5, 6, 'down'],                 // by the bed
  from_garden: [15, 29, 'up'],           // just inside the door
  note: { x: 24, y: 6, zone: [20, 3, 29, 10] }, // the note on the dining table; zone = tiles Jana can read it from
};

// Extra interaction tiles not in placements.json (see report)
const EXTRA_SPOTS = {
  garden: [{ id: 'sign_beach', x: 41, y: 24, kind: 'look' }],   // the signpost by the east exit on row 25
  forest: [],
  beach: [],
};

const NPC_SPEAKER = {}; // filled by dialogue.js (npc id → name tab)
