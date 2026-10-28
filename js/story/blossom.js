// ═══════════════════════════════════════════════════════════════
//  CHERRY BLOSSOMS (Spike) — flowers #13–#18
// ═══════════════════════════════════════════════════════════════
(() => {
  const A = 'Blossom';

  Story.handlers.blossom = {
    async enter() {
      if (!G.flag('blossom_arrived')) { G.setFlag('blossom_arrived'); Snd.newArea(); await Story.run(L(A, 'Arrival', 'first time')); }
    },

    npc: {
      // A — gives the Seed on the first talk; done once the plot has bloomed
      blossoms_A: () => Story.character('blossoms_A', A, 'Gardener', () => G.flag('plot_bloomed')),

      // B — talking: everything on the first talk
      async blossoms_B() {
        if (G.flag('done_blossoms_B')) return Story.run(L(A, 'Tea-house owner', 'after'));
        G.setFlag('done_blossoms_B');
        return Story.run(L(A, 'Tea-house owner', 'first'));
      },

      // C — lost his voice; needs the Tea
      blossoms_C: () => Story.character('blossoms_C', A, 'Musician', () => G.has('tea')),

      // D — needs the musician's info; gives the needle and reveals the flat stone
      async blossoms_D() {
        if (!G.flag('tortoise_unlocked')) return Story.run(L(A, 'Tortoise', 'before info'));
        if (G.flag('lifted_flat_stone')) return Story.run(L(A, 'Tortoise', 'after'));
        const n = G.talk('blossoms_D');
        return Story.run(L(A, 'Tortoise', n === 1 ? 'first' : n === 2 ? 'hint 1' : 'hint 2'));
      },

      // E — needs the Winding key + Gramophone needle
      blossoms_E: () => Story.character('blossoms_E', A, 'Record stall keeper', () => G.has('key') && G.has('needle'), {
        hint() {
          const k = G.has('key'), n = G.has('needle');
          if (!k && !n) return { state: 'hint 1' };
          return { state: 'hint 2', vars: { missing: k ? 'needle' : 'key' } };
        },
      }),
    },

    spot: {
      // stand by the empty plot with the seed
      plant: {
        active: () => G.has('seed') && !G.flag('plot_bloomed'),
        async use(scene) {
          await Story.run(L(A, 'Planting plot', 'plant'));   // TAKE Seed · SWAP plot (empty→seeded→bloom)
          G.setFlag('plot_bloomed'); G.save();
          return Story.handlers.blossom.npc.blossoms_A();
        },
      },
      flat_stone: {
        active: () => G.s.revealed.flat_stone && !G.flag('lifted_flat_stone'),
        async use() {
          G.setFlag('lifted_flat_stone');
          return Story.run(L(A, 'Flat stone', 'lift'));
        },
      },
      plains_path_hint: {
        active: () => !G.has('fragment_spike'),
        use: () => Story.run(L(A, 'East road', 'locked')),
      },
      // the fixed gramophone plays (music/gramophone.mp3); the area music dips around it
      gramophone: {
        active: () => !!G.s.swapped.gramophone,
        async use(scene) {
          Snd.gramophone();
          const g = scene.wmap.props.gramophone;
          const x = g ? g.img.x + 18 : scene.player.x, y = g ? g.img.y - 52 : scene.player.y - 40;
          for (let i = 0; i < 8; i++) scene.time.delayedCall(i * 700, () => {
            const n = scene.add.text(x + Phaser.Math.Between(-6, 6), y, i % 2 ? '♪' : '♫', { fontFamily: 'PixelAE, sans-serif', fontSize: '14px', color: '#8e3a55', stroke: '#fff7ed', strokeThickness: 3 }).setDepth(DEPTH.ABOVE + 5).setResolution(2);
            scene.tweens.add({ targets: n, y: y - 34, x: n.x + Phaser.Math.Between(-14, 14), alpha: 0, duration: 1600, onComplete: () => n.destroy() });
          });
        },
      },
    },

    async lockedExit(scene, exit) {
      if (exit.id === 'to_plains') await Story.run(L(A, 'East road', 'locked'));
    },
  };

  // Spike waits inside the inn (south-west corner)
  Story.handlers['interior:blossom_house'] = {
    npc: {
      spike: sc => Guardian.talk(sc, { id: 'spike', area: A, scene: 'Spike', keepsake: 'vinyl', winFlag: 'fragment_26', rotate: false, minigame: 'sleeve_match' }),
    },
  };
})();
