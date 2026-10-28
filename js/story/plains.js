// ═══════════════════════════════════════════════════════════════
//  DARK PLAINS (Calabar) — flowers #19–#24
// ═══════════════════════════════════════════════════════════════
(() => {
  const A = 'Plains';
  const LAMPS = ['lamp_1', 'lamp_2', 'lamp_3', 'lamp_4', 'lamp_5'];
  const lampsLit = () => LAMPS.filter(id => G.s.swapped[id]).length;
  const FOX_HOME = [46, 24], FOX_END = [37, 24];

  // lamp spots: stand below a dark post and press E
  const lampSpot = id => ({
    active: () => !G.s.swapped[id],
    async use(scene) {
      G.s.swapped[id] = true;
      scene.wmap.swapProp(id);
      Snd.tick();
      G.save();
    },
  });

  Story.handlers.plains = {
    setup(scene) {
      // the fox stays where it led her
      if (G.flag('fox_walked')) moveFox(scene, FOX_END, true);
      // the butterfly flutters
      const bf = scene.npcs.plains_C;
      if (bf) scene.tweens.add({ targets: bf, y: bf.y - 5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // darkness until all five lamps are lit
      scene.lighting = new Lighting(scene, {
        dark: 0.55, lit: 0.2,
        isLit: () => lampsLit() === LAMPS.length,
        lights: () => {
          const L = [[scene.player.x, scene.player.y - 8, 70]];
          LAMPS.forEach(id => { if (G.s.swapped[id]) { const p = scene.wmap.props[id].def; L.push([(p.x + 0.5) * TILE, (p.y - 0.6) * TILE, 95]); } });
          if (G.s.swapped.kiln) { const k = scene.wmap.props.kiln.def; L.push([(k.x + 1) * TILE, (k.y - 0.5) * TILE, 110]); }
          return L;
        },
      });
    },
    update(scene, time) { if (scene.lighting) scene.lighting.update(time); },

    async enter() {
      if (!G.flag('plains_arrived')) { G.setFlag('plains_arrived'); Snd.newArea(); await Story.run(L(A, 'Arrival', 'first time')); }
    },

    npc: {
      // A — relight the lamps
      plains_A: () => Story.character('plains_A', A, 'Lamplighter', () => lampsLit() === LAMPS.length, {
        hint: n => n === 2 ? { state: 'hint 1' } : { state: 'hint 2', vars: { n: LAMPS.length - lampsLit() } },
      }),

      // B — talking: everything on the first talk
      async plains_B() {
        if (G.flag('done_plains_B')) return Story.run(L(A, 'Stargazer', 'after'));
        G.setFlag('done_plains_B');
        return Story.run(L(A, 'Stargazer', 'first'));
      },

      // C — needs the Jar of fireflies
      plains_C: () => Story.character('plains_C', A, 'Butterfly', () => G.has('fireflies')),

      // D — needs the butterfly's info; leads Jana along the footprints to the spring
      async plains_D(scene) {
        if (!G.flag('fox_unlocked')) return Story.run(L(A, 'Fox', 'before info'));
        if (!G.flag('fox_walked')) {
          await Story.run(L(A, 'Fox', 'first'));             // … START fox_walk
          if (Story.take('fox_walk')) await foxWalk(scene);
          return;
        }
        if (!G.s.revealed.spring) return footprintsEnd(scene);
        if (G.flag('spring_filled')) return Story.run(L(A, 'Fox', 'after'));
        return Story.run(L(A, 'Fox', 'hint 1'));
      },

      // E — needs the Ember + Spring water; gives the empty flask with her request
      plains_E: () => Story.character('plains_E', A, 'Potter', () => G.has('ember') && G.has('water'), {
        hint() {
          const e = G.has('ember'), w = G.has('water');
          if (!e && !w) return { state: 'hint 1' };
          return { state: 'hint 2', vars: { missing: e ? 'water' : 'ember' } };
        },
      }),
    },

    spot: Object.assign({}, ...LAMPS.map(id => ({ [id]: lampSpot(id) })), {
      spring: {
        active: () => G.s.revealed.spring && !G.flag('spring_filled'),
        async use() {
          if (!G.has('flask')) return Story.run(Lines.rows(A, 'Spring', 'fill').filter(r => r.cond.startsWith('!')).reduce((a, r) => a.concat(Lines.steps(r)), []));
          G.setFlag('spring_filled');
          return Story.run(Lines.rows(A, 'Spring', 'fill').filter(r => !r.cond.startsWith('!')).reduce((a, r) => a.concat(Lines.steps(r)), []));
        },
      },
      // (the kiln "look" spot has no line in the spreadsheet)
    }),

    // walking up to where the footprints stop
    async step(scene, tx, ty) {
      if (G.flag('fox_walked') && !G.s.revealed.spring && Math.abs(tx - 38) <= 1 && Math.abs(ty - 24) <= 1) {
        scene.locked = true; scene.player.stop();
        try { await footprintsEnd(scene); } finally { scene.locked = false; }
        return true;
      }
      return false;
    },
  };

  async function footprintsEnd(scene) {
    await Story.run(L(A, 'Footprints end', 'follow'));   // … REVEAL spring
  }

  function moveFox(scene, [x, y], instant) {
    const fox = scene.npcs.plains_D;
    if (!fox) return Promise.resolve();
    const t = scene.targets.find(t => t.id === 'plains_D');
    scene.wmap.setSolid(fox.npc.x, fox.npc.y, 0);
    fox.npc = Object.assign({}, fox.npc, { x, y, face: 'left' });
    scene.wmap.setSolid(x, y, 1);
    if (t) t.tile = [x, y];
    if (instant) { fox.setPosition(x * TILE + TILE / 2, y * TILE + TILE - 1); return Promise.resolve(); }
  }

  // START fox_walk: the fox trots west along the row, the footprints appear behind it
  function foxWalk(scene) {
    const fox = scene.npcs.plains_D;
    if (!fox) return;
    G.setFlag('fox_walked'); G.save();
    scene.locked = true;
    const prints = ['footprints_45', 'footprints_44', 'footprints_43', 'footprints_42', 'footprints_41', 'footprints_40', 'footprints_39', 'footprints_end'];
    fox.play(fox.npc.sheet + ':idle_left', true);
    const from = fox.x, to = FOX_END[0] * TILE + TILE / 2;
    return new Promise(res => {
      scene.tweens.add({
        targets: fox, x: to, duration: (from - to) / TILE * 420, ease: 'Linear',
        onUpdate: () => {
          const tx = Math.floor(fox.x / TILE);
          prints.forEach(id => {
            const p = scene.wmap.props[id];
            if (p && !G.s.revealed[id] && p.def.x > tx) { G.s.revealed[id] = true; p.img.setVisible(true).setAlpha(0); scene.tweens.add({ targets: p.img, alpha: 1, duration: 400 }); }
          });
        },
        onComplete: () => {
          prints.forEach(id => { G.s.revealed[id] = true; scene.wmap.showProp(id, true); });
          moveFox(scene, FOX_END, true);
          scene.locked = false;
          G.save();
          res();
        },
      });
    });
  }

  // Calabar watches from inside the lantern inn
  Story.handlers['interior:plains_house'] = {
    npc: {
      calabar: sc => Guardian.talk(sc, { id: 'calabar', area: A, scene: 'Calabar', keepsake: 'vases', winFlag: 'fragment_20', rotate: true, minigame: 'vase_shuffle' }),
    },
  };
})();
