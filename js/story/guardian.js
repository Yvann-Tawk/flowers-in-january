// ═══════════════════════════════════════════════════════════════
//  GUARDIANS — the same shape in every area (STORY.md, per-area rules):
//  without keepsake → won't talk · with keepsake → takes it, minigame → retry / win → after
// ═══════════════════════════════════════════════════════════════
const MINIGAME_SCENES = { whack_a_phoebe: 'Whack', sled_race: 'Sled', sleeve_match: 'Sleeves', vase_shuffle: 'Shuffle' };

const Guardian = {
  // g: { id, area, scene, keepsake, winFlag, rotate }
  async talk(sc, g) {
    const A = g.area, S = g.scene;
    if (G.flag(g.winFlag)) return Story.run(L(A, S, 'after'));
    if (G.flag(g.id + '_challenge')) { await Story.run(L(A, S, 'retry')); return this.play(sc, g); }
    if (G.has(g.keepsake)) {
      G.setFlag(g.id + '_challenge');          // the keepsake is theirs for good from here on
      const rows = Lines.rows(A, S, 'with keepsake');
      // first box (with its TAKE), then the guardian wakes / looks up, then the rest
      await Story.run(Lines.steps(rows[0]));
      sc.refreshNpcs();
      await Story.run(rows.slice(1).reduce((a, r) => a.concat(Lines.steps(r)), []));
      if (Story.takeMinigame()) return this.play(sc, g);
      return;
    }
    if (g.rotate) return Story.rotate(g.id, A, S, 'without keepsake');
    return Story.run(L(A, S, 'without keepsake'));
  },

  async play(sc, g) {
    const key = MINIGAME_SCENES[g.minigame];
    const res = await sc.minigame(key);
    if (res === 'win') {
      await Story.run(L(g.area, g.scene, 'win'));
      sc.refreshNpcs();
    } else await Story.run(L(g.area, g.scene, 'retry'));
  },

  retryLines(area, scene) { return L(area, scene, 'retry'); },
};
