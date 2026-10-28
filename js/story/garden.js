// ═══════════════════════════════════════════════════════════════
//  GARDEN + JANA'S CABIN — opening, note, bridge, paths, gate
// ═══════════════════════════════════════════════════════════════
// "Spot" lines that depend on a Condition within the same State
function rowsWhere(area, scene, state, cond) {
  return Lines.rows(area, scene, state).filter(r => r.cond === cond).reduce((a, r) => a.concat(Lines.steps(r)), []);
}

Story.handlers['interior:garden_cabin'] = {
  setup(scene) {
    // the note sits on the table until it's read
    const m = scene.wmap.markers.note;
    if (m && !G.flag('note_read')) {
      scene.noteImg = scene.add.image((m.x + 0.5) * TILE, m.y * TILE + 14, 'items/item_note.png').setDepth(m.y * TILE + TILE + 1);
    }
  },
  spot: {
    note: {
      active: () => !G.flag('note_read'),
      async use(scene) {
        const first = !G.flag('note_read');
        await Note.open();
        if (first) {
          for (const p of Lines.notePages()) for (const a of p.actions) await Story.action(a); // GIVE Note · SET note_read
          if (scene.noteImg) { scene.noteImg.destroy(); scene.noteImg = null; }
          G.save();
        }
      },
    },
  },
};

Story.handlers.garden = {
  setup(scene) {
    if (Ending.stage === 'home') EndingHome.setup(scene);
  },
  async enter(scene, from) {
    if (Ending.stage === 'home') return EndingHome.enter(scene);
    if (from === 'from_cabin' && !G.flag('garden_intro')) {
      G.setFlag('garden_intro');
      await Story.run(L('Garden', 'First time outside', 'first'));
    }
    if (G.fragmentCount() >= 4 && !G.flag('return_seen')) {
      G.setFlag('return_seen');
      await Story.run(L('Ending', 'Return', 'enter garden'));
    }
  },

  spot: {
    async gate() {
      const n = G.fragmentCount();
      if (n >= 4) {
        await Story.run(L('Garden', 'The gate', 'all fragments'));  // … OPEN gate_panel
        Story.take('gate_panel');
        const solved = await Gate.open();
        if (solved) return Ending.openGate();
        return;
      }
      if (!G.flag('gate_seen')) { G.setFlag('gate_seen'); return Story.run(L('Garden', 'The gate', 'first')); }
      return Story.run(L('Garden', 'The gate', 'repeat'), { n });
    },
    async forest_path_hint() {
      if (G.flag('fragment_01') || G.has('fragment_phoebe')) return Story.run(L('Garden', 'Signpost north-east', 'look'));
      return Story.run(L('Garden', 'Forest path', 'locked'));
    },
    blossom_path_hint: {
      active: () => !G.has('fragment_gilmour'),
      use: () => Story.run(L('Garden', 'West path', 'locked')),
    },
    sign_beach: () => Story.run(L('Garden', 'Signpost east', 'look')),
  },

  // stepping on the bridge before reading the note
  async block(scene, spot) {
    if (G.flag(spot.active_until)) return false;
    await Story.run(L('Garden', 'Island bridge', 'before note'));
    scene.player.setTile(spot.push_back_to[0], spot.push_back_to[1], 'left');
    return true;
  },

  // locked exits: lines, then Jana steps back one tile
  async lockedExit(scene, exit) {
    if (exit.id === 'to_forest') await Story.run(L('Garden', 'Forest path', 'locked'));
    if (exit.id === 'to_blossom') await Story.run(L('Garden', 'West path', 'locked'));
  },
};

// the gate's answer lines (wrong attempts), used by the gate panel
const GateLines = {
  wrong(attempts) {
    return attempts >= 3 ? rowsWhere('Garden', 'The gate', 'wrong answer', 'attempts>=3') : rowsWhere('Garden', 'The gate', 'wrong answer', 'attempts<3');
  },
};
