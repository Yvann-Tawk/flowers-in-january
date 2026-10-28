// ═══════════════════════════════════════════════════════════════
//  SNOWY FOREST (Gilmour) — flowers #7–#12
// ═══════════════════════════════════════════════════════════════
(() => {
  const A = 'Forest';

  Story.handlers.forest = {
    async enter() {
      if (!G.flag('forest_arrived')) { G.setFlag('forest_arrived'); Snd.newArea(); await Story.run(L(A, 'Arrival', 'first time')); }
    },

    npc: {
      // A — task: ice fishing
      forest_A: () => Story.character('forest_A', A, 'Ice fisher', () => G.flag('caught_forest')),

      // B — talking: everything on the first talk (the snowman loses its nose)
      async forest_B() {
        if (G.flag('done_forest_B')) return Story.run(L(A, 'Kid with a snowman', 'after'));
        G.setFlag('done_forest_B');
        return Story.run(L(A, 'Kid with a snowman', 'first'));
      },

      // C — needs the Carrot
      forest_C: () => Story.character('forest_C', A, 'Hungry horse', () => G.has('carrot')),

      // D — needs the horse's info; reveals the drift
      async forest_D() {
        if (!G.flag('sheep_unlocked')) return Story.run(L(A, 'Sheep', 'before info'));
        if (G.flag('dug_dig_drift')) return Story.run(L(A, 'Sheep', 'after'));
        const n = G.talk('forest_D');
        return Story.run(L(A, 'Sheep', n === 1 ? 'first' : n === 2 ? 'hint 1' : 'hint 2'));
      },

      // E — needs Fish + Kindling. (TODO later build: the keeper's own interior; she stands on her porch.)
      forest_E: () => Story.character('forest_E', A, 'Cabin keeper', () => G.has('fish') && G.has('kindling'), {
        hint() {
          const f = G.has('fish'), k = G.has('kindling');
          if (!f && !k) return { state: 'hint 1' };
          return { state: 'hint 2', vars: { missing: f ? 'kindling' : 'fish' } };
        },
      }),
    },

    prop: {
      padded_table: () => Story.run(L(A, 'Padded table', 'look')),
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
          return Story.run(L(A, 'Dig spot (drift)', 'dig'));
        },
      },
      angels_lie: {
        async use(scene) {
          await Story.still(L(A, 'Snow angels', 'lie down'),
            () => scene.player.spr.setVisible(false),
            () => scene.player.spr.setVisible(true));
        },
      },
    },
  };

  // Gilmour sleeps inside the lodge
  Story.handlers['interior:snow_cabin'] = {
    npc: {
      gilmour: sc => Guardian.talk(sc, { id: 'gilmour', area: A, scene: 'Gilmour', keepsake: 'bandaid', winFlag: 'fragment_28', rotate: true, minigame: 'sled_race' }),
    },
  };
})();
