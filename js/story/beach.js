// ═══════════════════════════════════════════════════════════════
//  NOWHERE BEACH (Phoebe) — flowers #1–#6
// ═══════════════════════════════════════════════════════════════
(() => {
  const A = 'Beach';

  Story.handlers.beach = {
    // the owl's dig spot: a pale patch of sand with a glint, once she has told Jana about it
    setup(scene) {
      const sp = scene.place.spots.find(s => s.id === 'dig_owl');
      if (!sp) return;
      const cx = (sp.x + 0.5) * TILE, cy = (sp.y + 0.6) * TILE;
      const g = scene.digMark = scene.add.graphics().setDepth(DEPTH.GROUND_PROP);
      g.fillStyle(0xfff3d6, 0.85).fillEllipse(cx, cy, 26, 12);
      g.fillStyle(0xe9d7a4, 1).fillEllipse(cx - 3, cy + 1, 14, 6);
      const glint = scene.digGlint = scene.add.star(cx + 6, cy - 6, 4, 1, 4, 0xffffff).setDepth(DEPTH.GROUND_PROP + 1);
      scene.tweens.add({ targets: glint, alpha: { from: 0, to: 1 }, scale: { from: 0.4, to: 1 }, duration: 700, yoyo: true, repeat: -1, repeatDelay: 900 });
    },
    update(scene) {
      const on = !!G.s.revealed.dig_owl && !G.flag('dug_dig_owl');
      if (scene.digMark) { scene.digMark.setVisible(on); scene.digGlint.setVisible(on); }
    },

    async enter() {
      if (!G.flag('beach_arrived')) { G.setFlag('beach_arrived'); Snd.newArea(); await Story.run(L(A, 'Arrival', 'first time')); }
    },

    npc: {
      // A — task: catch a fish (done runs right after the catch, or on the next talk)
      beach_A: () => Story.character('beach_A', A, 'Old fisherman', () => G.flag('caught_beach')),

      // B — talking: everything on the first talk
      async beach_B() {
        if (G.flag('done_beach_B')) return Story.run(L(A, 'Kid with a sandcastle', 'after'));
        G.setFlag('done_beach_B');
        return Story.run(L(A, 'Kid with a sandcastle', 'first'));
      },

      // C — needs the Big shell
      beach_C: () => Story.character('beach_C', A, 'Guinea pig', () => G.has('shell')),

      // D — needs the guinea pig's info; gives the glasses and reveals the dig spot
      async beach_D() {
        if (!G.flag('owl_unlocked')) return Story.run(L(A, 'Owl', 'before info'));
        if (G.flag('dug_dig_owl')) return Story.run(L(A, 'Owl', 'after'));
        const n = G.talk('beach_D');
        return Story.run(L(A, 'Owl', n === 1 ? 'first' : n === 2 ? 'hint 1' : 'hint 2'));
      },

      // E — needs Old bottle + Borrowed glasses; hints follow what Jana holds
      beach_E: () => Story.character('beach_E', A, 'Bottle collector', () => G.has('bottle') && G.has('glasses'), {
        hint() {
          const b = G.has('bottle'), g = G.has('glasses');
          if (!b && !g) return { state: 'hint 1' };
          return { state: 'hint 2', vars: { missing: b ? 'glasses' : 'bottle', who: b ? 'owl' : 'fisherman' } };
        },
      }),
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
          return Story.run(L(A, 'Dig spot (owl)', 'dig'));
        },
      },
      bean_bag_sit: {
        async use(scene) {
          let sat = null;
          await Story.still(L(A, 'Bean bags', 'sit'),
            () => {
              scene.player.spr.setVisible(false);
              const bb = scene.wmap.props.bean_bags;
              if (bb) sat = scene.add.image(bb.def.x * TILE, (bb.def.y + 1) * TILE, 'props/bean_bag_red_sat.png').setOrigin(0, 1).setDepth(bb.img.depth + 1);
            },
            () => { scene.player.spr.setVisible(true); if (sat) sat.destroy(); });
        },
      },
      stall_sign: () => Story.run(L(A, 'Food stall', 'look')),
    },
  };

  // Phoebe waits inside the harbour inn
  Story.handlers['interior:beach_hut'] = {
    npc: {
      phoebe: sc => Guardian.talk(sc, { id: 'phoebe', area: A, scene: 'Phoebe', keepsake: 'keychain', winFlag: 'fragment_01', rotate: true, minigame: 'whack_a_phoebe' }),
    },
  };
})();
