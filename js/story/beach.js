// ═══════════════════════════════════════════════════════════════
//  NOWHERE BEACH (Phoebe) — flowers #1–#6
// ═══════════════════════════════════════════════════════════════
(() => {
  const D = DLG.beach;

  Story.handlers.beach = {
    async enter() {
      if (!G.flag('beach_arrived')) { G.setFlag('beach_arrived'); await Story.run(D.arrival); }
    },

    npc: {
      // A — task: catch a fish (done runs right after the catch, or on the next talk)
      beach_A: () => Story.character('beach_A', D.beach_A, () => G.flag('caught_beach')),

      // B — talking: everything on the first talk
      async beach_B() {
        if (G.flag('done_beach_B')) return Story.run(D.beach_B.after);
        G.setFlag('done_beach_B');
        return Story.run(D.beach_B.first);
      },

      // C — needs the Big shell
      beach_C: () => Story.character('beach_C', D.beach_C, () => G.has('shell')),

      // D — needs the guinea pig's info; gives the glasses and reveals the dig spot
      async beach_D() {
        if (!G.flag('owl_unlocked')) return Story.run(D.beach_D.before);
        if (G.flag('dug_dig_owl')) return Story.run(D.beach_D.after);
        const n = G.talk('beach_D');
        if (n === 1) return Story.run(D.beach_D.first);
        return Story.run(D.beach_D.hint[n === 2 ? 0 : 1]);
      },

      // E — needs Old bottle + Borrowed glasses; hints follow what Jana holds
      beach_E: () => Story.character('beach_E', D.beach_E, () => G.has('bottle') && G.has('glasses'), {
        hint() {
          const b = G.has('bottle'), g = G.has('glasses');
          if (!b && !g) return { lines: D.beach_E.hint_none };
          return { lines: D.beach_E.hint_one, vars: { missing: b ? 'glasses' : 'bottle', ask: b ? 'owl' : 'fisherman' } };
        },
      }),

      // Phoebe — guardian
      async phoebe(scene) {
        const P = D.phoebe;
        if (G.flag('phoebe_won')) return Story.run(P.after);
        if (G.flag('phoebe_challenge')) { await Story.run(P.retry); return Story.handlers.beach.whack(scene); }
        if (G.has('keychain')) {
          await Story.run(P.with);
          if (Story.takeMinigame() === 'whack') return Story.handlers.beach.whack(scene);
          return;
        }
        return Story.rotate('phoebe', P.without);
      },
    },

    async whack(scene) {
      const res = await scene.minigame('Whack');
      if (res === 'win') await Story.run(D.phoebe.win);
      else await Story.run(D.phoebe.retry);
    },

    spot: {
      fishing: {
        active: () => !G.flag('caught_beach'),
        async use(scene, spot) {
          const ok = await Fishing.play(scene, { stand: [spot.x, spot.y], face: spot.face || 'down', bobber: [spot.x + 0.5, spot.y + 1.75] });
          if (!ok) return;
          G.setFlag('caught_beach'); G.save();
          return Story.handlers.beach.npc.beach_A();
        },
      },
      dig_owl: {
        active: () => G.s.revealed.dig_owl && !G.flag('dug_dig_owl'),
        async use(scene, spot) {
          await Dig.play(scene, spot, 0xe9d7a4);
          G.setFlag('dug_dig_owl');
          return Story.run(D.beach_D.dig);
        },
      },
      bean_bag_sit: {
        async use(scene) {
          let sat = null;
          await Story.still(D.bean_bag_sit,
            () => {
              scene.player.spr.setVisible(false);
              const bb = scene.wmap.props.bean_bags;
              if (bb) sat = scene.add.image(bb.def.x * TILE, (bb.def.y + 1) * TILE, 'props/bean_bag_red_sat.png').setOrigin(0, 1).setDepth(bb.img.depth + 1);
            },
            () => { scene.player.spr.setVisible(true); if (sat) sat.destroy(); });
        },
      },
      stall_sign: { use: () => Story.run(D.stall_sign) },
    },
  };
})();
