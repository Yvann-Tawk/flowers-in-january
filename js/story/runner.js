// ═══════════════════════════════════════════════════════════════
//  STORY RUNNER — plays dialogue scripts and their actions; NPC state machine
//  A script is a list of steps:
//    {say:{who,text}} one box (who = null for narration) · "Speaker: text" / "> text" (strings)
//    {give} {take} {flower} {flag} {reveal} {swap,states} {minigame} {open} {show} {start}
// ═══════════════════════════════════════════════════════════════
const Story = {
  running: false,
  scene: null,        // the active WorldScene
  handlers: {},       // map key → { enter, npc:{}, spot:{}, prop:{}, block, lockedExit }
  pending: {},        // minigame / open / show / start requests made by the last script
  hooks: {},          // name → fn(scene) for OPEN / SHOW / START actions that run immediately

  async run(script, vars) {
    if (!script || !script.length) return;
    const nested = this.running;
    this.running = true;
    const pop = nested ? null : Input.push({ onKey: () => {} }); // swallow world input while a script runs
    try {
      for (const step of script) {
        if (typeof step === 'string') await Dialog.say(step, vars);
        else if (step.say) await Dialog.say(step.say, vars);
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
      if (G.give(a.give)) { Snd.got(); HUD.popup('Got', a.give); G.save(); }
    } else if (a.take) {
      if (G.take(a.take)) { Snd.gave(); HUD.popup('Gave', a.take); G.save(); }
    } else if (a.flower) {
      if (!G.addFlower(a.flower)) return;
      G.save();
      Snd.flower();
      Dialog.hide(true);
      await HUD.flowerFly(a.flower);
      await Poem.open(FLOWERS[a.flower].poem, a.flower);
    } else if (a.swap) {
      // "SWAP plot (empty→seeded→bloom)" steps through the in-between state
      if (a.states && a.states.length > 2) {
        G.s.swapped[a.swap] = 'alt_seeded';
        if (sc && sc.wmap) sc.wmap.swapProp(a.swap);
        await new Promise(r => setTimeout(r, 900));
      }
      G.s.swapped[a.swap] = true;
      if (sc && sc.wmap) sc.wmap.swapProp(a.swap);
      G.save();
    } else if (a.reveal) {
      G.s.revealed[a.reveal] = true;
      if (sc && sc.wmap) sc.wmap.showProp(a.reveal, true);
    } else if (a.flag) {
      G.setFlag(a.flag);
    } else if (a.minigame) {
      this.pending.minigame = a.minigame;
    } else {
      const name = a.open || a.show || a.start;
      if (name && this.hooks[name]) await this.hooks[name](sc);
      else if (name) this.pending[name] = true;
    }
  },

  takeMinigame() { const m = this.pending.minigame; this.pending.minigame = null; return m; },
  take(name) { const v = this.pending[name]; delete this.pending[name]; return v; },

  // Generic character from the spreadsheet: first (+request) → hint 1 → hint 2 … → done (once) → after.
  //   ready(): requirement met?  opts.hint(n) → {state, vars}  opts.unlock: flag that must be set first ("before info")
  async character(id, area, scene, ready, opts = {}) {
    const has = st => DIALOGUE.some(r => r.area === area && r.scene === scene && r.state === st);
    if (G.flag('done_' + id)) return this.run(L(area, scene, 'after'));
    if (opts.unlock && !G.flag(opts.unlock)) return this.run(L(area, scene, 'before info'));
    const n = G.talk(id);
    if (ready()) {
      G.setFlag('done_' + id);
      const done = L(area, scene, 'done');
      return this.run(n === 1 && has('first') && !opts.skipFirst ? L(area, scene, 'first').concat(done) : done);
    }
    if (n === 1) return this.run(L(area, scene, 'first').concat(has('request') ? L(area, scene, 'request') : []));
    if (opts.hint) { const h = opts.hint(n); return this.run(L(area, scene, h.state), h.vars); }
    const st = n === 2 || !has('hint 2') ? 'hint 1' : 'hint 2';
    return this.run(L(area, scene, st));
  },

  // "rotate" lines: one row per talk, cycling
  async rotate(id, area, scene, state) {
    const rows = Lines.each(area, scene, state);
    const i = (G.s.rot[id] || 0) % rows.length;
    G.s.rot[id] = i + 1;
    return this.run(rows[i]);
  },

  // fade to black, narration over a still, fade back (no sit / lie sprites exist)
  async still(script, setup, teardown) {
    this.running = true;
    const pop = Input.push({ onKey: () => {} });
    await Fade.out(500);
    if (setup) setup();
    await Fade.in(500);
    pop();
    this.running = false;
    await this.run(script);
    this.running = true;
    const pop2 = Input.push({ onKey: () => {} });
    await Fade.out(500);
    if (teardown) teardown();
    await Fade.in(500);
    pop2();
    this.running = false;
  },
};
