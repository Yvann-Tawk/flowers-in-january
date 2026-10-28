// ═══════════════════════════════════════════════════════════════
//  GARDEN (and the cabin) — opening, note, bridge, gate, exits
// ═══════════════════════════════════════════════════════════════
Story.handlers.cabin = {
  async enter(scene) {},
  // the note on the dining table
  note: {
    active: () => !G.flag('note_read'),
    async use(scene) {
      await Note.open();
      if (!G.flag('note_read')) {
        G.setFlag('note_read');
        G.give('note'); Snd.chimeGot(); HUD.popup('Got', 'note');
        G.save();
      }
    },
  },
};

Story.handlers.garden = {
  async enter(scene, from) {
    if (from === 'from_cabin' && !G.flag('garden_intro')) {
      G.setFlag('garden_intro');
      await Story.run(DLG.garden.first_outside);
    }
  },

  spot: {
    async gate() {
      const n = G.fragmentCount();
      if (n >= 4) {
        const solved = await Gate.open();
        if (solved) {
          G.s.swapped.gate = true;
          Story.scene.wmap.swapProp('gate');
          G.save();
          // TODO (ending): the hidden path, the bouquet and the wedding vision start here.
        }
        return;
      }
      if (G.flag('gilmour_won') && n === 2) { // this build only
        await Story.run(DLG.garden.gate_tbc);
        await Card.show(DLG.garden.gate_tbc_card);
        return;
      }
      if (!G.flag('gate_seen')) { G.setFlag('gate_seen'); return Story.run(DLG.garden.gate_first); }
      return Story.run(DLG.garden.gate_repeat, { n });
    },
    async forest_path_hint() {
      if (G.has('fragment_phoebe')) return Story.run(DLG.garden.sign_forest);
      return Story.run(DLG.garden.forest_locked);
    },
    async sign_beach() { return Story.run(DLG.garden.sign_beach); },
  },

  // stepping on the bridge before reading the note
  async block(scene, spot) {
    if (G.flag(spot.active_until)) return false;
    await Story.run(DLG.garden.bridge_block);
    scene.player.setTile(spot.push_back_to[0], spot.push_back_to[1], 'left');
    return true;
  },

  // the forest exit before Phoebe's fragment
  async lockedExit(scene, exit) {
    if (exit.id === 'to_forest') await Story.run(DLG.garden.forest_locked);
  },
};
