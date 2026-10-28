// ═══════════════════════════════════════════════════════════════
//  STATE — story flags, inventory, flowers, fragments, position; autosave
// ═══════════════════════════════════════════════════════════════
function freshState() {
  return {
    v: 1,
    flags: {},          // story flags (note_read, owl_unlocked, phoebe_won, ...)
    talks: {},          // npc id → number of talks (drives first / hint 1 / hint 2)
    rot: {},            // npc id → rotation index for "rotate" lines
    inv: [],            // item ids, in the order received
    flowers: [],        // flower numbers collected
    fragments: [],      // fragment item ids, in collection order
    revealed: {},       // hidden spot id → true
    swapped: {},        // two-state prop id → true (showing its `alt` image)
    whackRound: 0,      // whack-a-Phoebe rounds already won (progress is never lost)
    gateWrong: 0,       // wrong gate attempts
    map: 'cabin', x: CABIN.spawn[0], y: CABIN.spawn[1], dir: CABIN.spawn[2],
  };
}

const G = {
  s: freshState(),

  flag(k) { return !!this.s.flags[k]; },
  setFlag(k, v = true) { this.s.flags[k] = v; },
  has(item) { return this.s.inv.includes(item); },
  give(item) {
    if (this.has(item)) return false;
    this.s.inv.push(item);
    if (ITEMS[item] && ITEMS[item].fragment && !this.s.fragments.includes(item)) this.s.fragments.push(item);
    return true;
  },
  take(item) {
    const i = this.s.inv.indexOf(item);
    if (i < 0) return false;
    this.s.inv.splice(i, 1);
    return true;
  },
  addFlower(n) {
    if (this.s.flowers.includes(n)) return false;
    this.s.flowers.push(n);
    return true;
  },
  fragmentCount() { return this.s.fragments.length; },
  talk(id) { this.s.talks[id] = (this.s.talks[id] || 0) + 1; return this.s.talks[id]; },
  talks(id) { return this.s.talks[id] || 0; },

  // ── persistence ──────────────────────────────────────────────
  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  },
  beforeSave: null,   // set by the active scene: copies Jana's map + tile into the state
  save() {
    if (this.beforeSave) this.beforeSave();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch (e) { /* private mode etc. */ }
  },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      this.s = Object.assign(freshState(), d);
      return true;
    } catch (e) { return false; }
  },
  reset() {
    this.s = freshState();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  },
};
