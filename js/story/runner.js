// ═══════════════════════════════════════════════════════════════
//  STORY RUNNER — plays dialogue scripts and their actions; NPC state machine
// ═══════════════════════════════════════════════════════════════
const Story = {
  running: false,
  scene: null,        // the active WorldScene
  handlers: {},       // map → { npc: {id: fn}, spot: {id: fn}, prop: {id: fn}, active: {id: fn}, step: {id: fn} }
  pendingMinigame: null,

  // Play a script (array of lines and actions). Autosaves when it ends.
  async run(script, vars) {
    if (!script || !script.length) return;
    const nested = this.running;
    this.running = true;
    const pop = nested ? null : Input.push({ onKey: () => {} }); // swallow world input while a script runs
    try {
      for (const step of script) {
        if (typeof step === 'string') await Dialog.say(step, vars);
        else await this.action(step);
      }
    } finally {
      if (!nested) {
        Dialog.close();
        pop();
        this.running = false;
        G.save();
      }
    }
  },

  async action(a) {
    const sc = this.scene;
    if (a.give) {
      if (G.give(a.give)) { Snd.chimeGot(); HUD.popup('Got', a.give); G.save(); }
    } else if (a.take) {
      if (G.take(a.take)) { Snd.chimeGave(); HUD.popup('Gave', a.take); G.save(); }
    } else if (a.flower) {
      if (!G.addFlower(a.flower)) return;
      G.save();
      Snd.sfx('flower', 0.6);
      Dialog.hide(true);
      await HUD.flowerFly(a.flower);
      await Poem.open(FLOWERS[a.flower].poem, a.flower);
    } else if (a.swap) {
      G.s.swapped[a.swap] = true;
      if (sc && sc.wmap) sc.wmap.swapProp(a.swap);
    } else if (a.reveal) {
      G.s.revealed[a.reveal] = true;
    } else if (a.flag) {
      G.setFlag(a.flag);
    } else if (a.minigame) {
      this.pendingMinigame = a.minigame;
    }
  },

  // Generic character: first (+request) → hint 1 → hint 2 … → done (once) → after.
  //   d: dialogue entry, ready(): requirement met?, hint(n): optional custom hint picker
  async character(id, d, ready, opts = {}) {
    if (G.flag('done_' + id)) return this.run(d.after);
    const n = G.talk(id);
    if (ready()) {
      G.setFlag('done_' + id);
      return this.run(n === 1 && d.first && !opts.skipFirst ? [...d.first, ...d.done] : d.done);
    }
    if (n === 1) return this.run([...(d.first || []), ...(d.request || [])]);
    if (opts.hint) { const h = opts.hint(n); return this.run(h.lines, h.vars); }
    return this.run(d.hint[n === 2 ? 0 : 1]);
  },

  // "rotate" lines: one per talk, cycling
  async rotate(id, lines) {
    const i = (G.s.rot[id] || 0) % lines.length;
    G.s.rot[id] = i + 1;
    return this.run([lines[i]]);
  },

  // after a script, start a minigame it asked for
  takeMinigame() { const m = this.pendingMinigame; this.pendingMinigame = null; return m; },

  // fade to black, narration over a still, fade back (no sit / lie sprites exist)
  async still(lines, setup, teardown) {
    this.running = true;
    const pop = Input.push({ onKey: () => {} });
    await Fade.out(500);
    if (setup) setup();
    await Fade.in(500);
    pop();
    this.running = false;
    await this.run(lines);
    this.running = true;
    const pop2 = Input.push({ onKey: () => {} });
    await Fade.out(500);
    if (teardown) teardown();
    await Fade.in(500);
    pop2();
    this.running = false;
  },
};
