// ═══════════════════════════════════════════════════════════════
//  SNOWY FOREST (Gilmour) — flowers #7–#12
// ═══════════════════════════════════════════════════════════════
(() => {
  const D = DLG.forest;

  Story.handlers.forest = {
    async enter() {
      if (!G.flag('forest_arrived')) { G.setFlag('forest_arrived'); await Story.run(D.arrival); }
    },

    npc: {
      // A — task: ice fishing
      forest_A: () => Story.character('forest_A', D.forest_A, () => G.flag('caught_forest')),

      // B — talking: everything on the first talk (the snowman loses its nose)
      async forest_B() {
        if (G.flag('done_forest_B')) return Story.run(D.forest_B.after);
        G.setFlag('done_forest_B');
        return Story.run(D.forest_B.first);
      },

      // C — needs the Carrot
      forest_C: () => Story.character('forest_C', D.forest_C, () => G.has('carrot')),

      // D — needs the horse's info; reveals the drift
      async forest_D() {
        if (!G.flag('sheep_unlocked')) return Story.run(D.forest_D.before);
        if (G.flag('dug_dig_drift')) return Story.run(D.forest_D.after);
        const n = G.talk('forest_D');
        if (n === 1) return Story.run(D.forest_D.first);
        return Story.run(D.forest_D.hint[n === 2 ? 0 : 1]);
      },

      // E — needs Fish + Kindling
      forest_E: () => Story.character('forest_E', D.forest_E, () => G.has('fish') && G.has('kindling'), {
        hint() {
          const f = G.has('fish'), k = G.has('kindling');
          if (!f && !k) return { lines: D.forest_E.hint_none };
          return { lines: D.forest_E.hint_one, vars: { missing: f ? 'kindling' : 'fish' } };
        },
      }),
      // TODO (later build): the cabin keeper's interior map; she stands on her porch for now.

      // Gilmour — guardian
      async gilmour(scene) {
        const P = D.gilmour;
        if (G.flag('gilmour_won')) return Story.run(P.after);
        if (G.flag('gilmour_awake')) { await Story.run(P.retry); return Story.handlers.forest.race(scene); }
        if (G.has('bandaid')) {
          await Story.run(P.with.slice(0, 2)); // take the band-aid, wake up
          scene.refreshNpcs();
          await Story.run(P.with.slice(2));
          if (Story.takeMinigame() === 'sled') return Story.handlers.forest.race(scene);
          return;
        }
        return Story.rotate('gilmour', P.without);
      },
    },

    async race(scene) {
      const res = await scene.minigame('Sled');
      if (res === 'win') {
        await Story.run(D.gilmour.win);
        scene.refreshNpcs();
      } else await Story.run(D.gilmour.retry);
    },

    prop: {
      padded_table: () => Story.run(D.padded_table),
    },

    spot: {
      ice_fishing: {
        active: () => !G.flag('caught_forest'),
        async use(scene, spot) {
          const hole = scene.wmap.props.ice_hole_jana;
          // Jana kneels at the hole's west side, facing it, so the hole and bobber stay visible
          const ok = await Fishing.play(scene, {
            stand: [spot.x - 1, spot.y], face: 'right',
            bobber: [spot.x + 0.5, spot.y + 0.55], ice: true,
            onStart: () => hole && hole.img.setTexture('props/ice_fishing_hole_rod.png'),
            onEnd: () => hole && hole.img.setTexture('props/ice_fishing_hole.png'),
          });
          if (!ok) return;
          G.setFlag('caught_forest'); G.save();
          return Story.handlers.forest.npc.forest_A();
        },
      },
      dig_drift: {
        active: () => G.s.revealed.dig_drift && !G.flag('dug_dig_drift'),
        async use(scene, spot) {
          await Dig.play(scene, spot, 0xf4f8ff);
          G.setFlag('dug_dig_drift');
          return Story.run(D.forest_D.dig);
        },
      },
      angels_lie: {
        async use(scene) {
          await Story.still(D.angels_lie,
            () => scene.player.spr.setVisible(false),
            () => scene.player.spr.setVisible(true));
        },
      },
    },
  };
})();
