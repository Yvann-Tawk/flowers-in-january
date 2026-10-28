// ═══════════════════════════════════════════════════════════════
//  ACTORS — NPC sprites and their idle animations
// ═══════════════════════════════════════════════════════════════
// Sheet kinds (see docs/ASSETS.md)
const SHEETS = {
  'characters/jana.png':     { kind: 'lpc' },
  'characters/beach_A.png':  { kind: 'fisher' },
  'characters/forest_A.png': { kind: 'fisher' },
  'characters/beach_B.png':  { kind: 'lpc' },
  'characters/beach_E.png':  { kind: 'lpc' },
  'characters/forest_B.png': { kind: 'lpc' },
  'characters/forest_E.png': { kind: 'lpc' },
  'characters/beach_C.png':  { kind: 'creature', fw: 48, fh: 48 },
  'characters/forest_D.png': { kind: 'creature', fw: 48, fh: 48 },
  'characters/forest_C.png': { kind: 'creature', fw: 72, fh: 72 },
  'characters/beach_D.png':  { kind: 'creature', fw: 96, fh: 48, cols: 6 },
  'characters/blossoms_A.png': { kind: 'lpc' },
  'characters/blossoms_B.png': { kind: 'lpc' },
  'characters/blossoms_C.png': { kind: 'lpc' },
  'characters/blossoms_E.png': { kind: 'lpc' },
  'characters/blossoms_D.png': { kind: 'creature', fw: 48, fh: 48 },   // tortoise
  'characters/plains_A.png':   { kind: 'lpc' },
  'characters/plains_B.png':   { kind: 'lpc' },
  'characters/plains_E.png':   { kind: 'lpc' },
  'characters/plains_C.png':   { kind: 'creature', fw: 48, fh: 48 },   // butterfly
  'characters/plains_D.png':   { kind: 'creature', fw: 52, fh: 52 },   // fox
  'characters/eevie.png':      { kind: 'lpc' },
  'animals/phoebe.png':      { kind: 'animal' },
  'animals/gilmour.png':     { kind: 'animal' },
  'animals/spike.png':       { kind: 'animal' },
  'animals/calabar.png':     { kind: 'animal' },
};
const LPC_FOOT = 62 / 64;   // feet line inside a 64×64 LPC frame
const ROD_FOOT = 95 / 128;  // feet line inside a 128×128 rod frame
const FOOT_Y = 8;           // feet sit this far below the logical tile centre

const Actors = {
  // called once (Boot): fishing-rod frames + all animations
  setup(scene) {
    const A = scene.anims;
    // fishermen sheets are loaded as plain images; their rod frames live below the LPC block
    ['characters/beach_A.png', 'characters/forest_A.png'].forEach(k => {
      const tex = scene.textures.get(k);
      // their plain standing frames (wedding guests): walk rows, column 0
      ['up', 'left', 'down', 'right'].forEach(d => tex.add('stand_' + d, 0, 0, LPC.walk[d] * 64, 64, 64));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++)
        tex.add('rod_' + r + '_' + c, 0, c * 128, 3456 + r * 128, 128, 128);
    });
    Object.keys(SHEETS).forEach(k => {
      const sh = SHEETS[k];
      if (sh.kind === 'lpc') {
        // Only Jana's idle rows are dressed. On the NPC sheets rows 22–25 are missing clothing
        // layers too, so NPCs idle on the standing frame of their walk row (plus a 1 px breath).
        const idleOk = k === 'characters/jana.png';
        ['up', 'left', 'down', 'right'].forEach(d => {
          const idle = idleOk ? [LPC.idle[d] * 13, LPC.idle[d] * 13 + 1] : [LPC.walk[d] * 13];
          A.create({ key: k + ':idle_' + d, frames: A.generateFrameNumbers(k, { frames: idle }), frameRate: 1.6, repeat: -1 });
          A.create({ key: k + ':walk_' + d, frames: A.generateFrameNumbers(k, { start: LPC.walk[d] * 13 + 1, end: LPC.walk[d] * 13 + 8 }), frameRate: 11, repeat: -1 });
        });
      }
      if (sh.kind === 'fisher') {
        ['up', 'left', 'down', 'right'].forEach(d => {
          A.create({ key: k + ':rod_' + d, frames: ROD.loop.map(c => ({ key: k, frame: 'rod_' + ROD.dirs[d] + '_' + c })), frameRate: 3, repeat: -1 });
        });
      }
      if (sh.kind === 'creature') {
        const cols = sh.cols || 3;
        ['up', 'left', 'down', 'right'].forEach(d => {
          const r = CREATURE_ROWS[d];
          A.create({ key: k + ':idle_' + d, frames: A.generateFrameNumbers(k, { frames: [r * cols, r * cols + 1, r * cols + 2] }), frameRate: 2, repeat: -1 });
        });
      }
    });
    // animals: Phoebe idles facing down (row 2), Gilmour has still poses
    ['phoebe', 'spike', 'calabar'].forEach(a =>
      A.create({ key: a + ':idle', frames: A.generateFrameNumbers('animals/' + a + '.png', { frames: [8, 9, 10] }), frameRate: a === 'calabar' ? 1.2 : 2.5, repeat: -1 }));
  },

  // create an NPC from a placements.json entry
  create(scene, npc, opts = {}) {
    const sh = SHEETS[npc.sheet] || { kind: 'lpc' };
    const cx = npc.x * TILE + TILE / 2;
    const feet = npc.y * TILE + TILE / 2 + FOOT_Y;
    let spr;
    const face = npc.face || 'down';
    if (sh.kind === 'fisher' && opts.guest) {
      spr = scene.add.sprite(cx, feet, npc.sheet, 'stand_' + face).setOrigin(0.5, LPC_FOOT);
      spr.guest = true;
    } else if (sh.kind === 'fisher') {
      spr = scene.add.sprite(cx, feet, npc.sheet, 'rod_' + ROD.dirs[face] + '_' + ROD.loop[0]).setOrigin(0.5, ROD_FOOT);
      spr.play(npc.sheet + ':rod_' + face);
    } else if (sh.kind === 'lpc') {
      spr = scene.add.sprite(cx, feet, npc.sheet, LPC.walk[face] * 13).setOrigin(0.5, LPC_FOOT);
      spr.play(npc.sheet + ':idle_' + face);
      // gentle 2-frame idle: a 1 px breath
      scene.time.addEvent({ delay: 650 + Math.random() * 200, loop: true, callback: () => { spr.y = spr.y === feet ? feet - 1 : feet; } });
    } else if (sh.kind === 'creature') {
      spr = scene.add.sprite(cx, npc.y * TILE + TILE - 1, npc.sheet, 0).setOrigin(0.5, 1);
      spr.play({ key: npc.sheet + ':idle_' + face, startFrame: Math.floor(Math.random() * 3) });
    } else { // animal
      spr = scene.add.sprite(cx, npc.y * TILE + TILE - 2, npc.sheet, 0).setOrigin(0.5, 1);
    }
    spr.setDepth(npc.y * TILE + TILE);

    // The owl is perched on the lifeguard tower. "40 px above her tile" put her on the towels
    // north of the tower, so her feet sit on the tower roof instead (14 px below her tile),
    // drawn above the roof's draw-above tiles.
    if (npc.perched_on) { spr.y = npc.y * TILE + TILE + 14; spr.setDepth(DEPTH.ABOVE + 20); }
    spr.npc = npc;
    spr.sheetKind = sh.kind;
    spr.face = face;
    return spr;
  },

  // turn to face a direction (LPC + creatures), or back to the placement facing
  face(spr, dir) {
    if (!spr || !dir) return;
    const k = spr.npc.sheet;
    if (spr.guest && spr.sheetKind === 'fisher') { spr.setFrame('stand_' + dir); return; }
    if (spr.sheetKind === 'lpc' || spr.sheetKind === 'creature') spr.play(k + ':idle_' + dir, true);
  },
  restore(spr) { this.face(spr, spr.face); },

  dirTowards(fromX, fromY, toX, toY) {
    const dx = toX - fromX, dy = toY - fromY;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  },
};
