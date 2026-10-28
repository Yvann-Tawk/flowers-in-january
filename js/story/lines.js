// ═══════════════════════════════════════════════════════════════
//  LINES — reads the spreadsheet rows (js/dialogue.js) as scripts.
//  L(area, scene, state) → the boxes of that Scene + State, in row order,
//  each followed by its actions, ready for Story.run().
// ═══════════════════════════════════════════════════════════════
const Lines = {
  rows(area, scene, state) {
    const rows = DIALOGUE.filter(r => r.area === area && r.scene === scene && (state === undefined || r.state === state));
    if (!rows.length) console.warn('No dialogue rows for', area, '/', scene, '/', state);
    return rows;
  },

  action(a) {
    switch (a.type) {
      case 'GIVE':
      case 'TAKE': {
        const id = ITEM_BY_NAME[a.arg];
        if (!id) { console.warn('Unknown item in spreadsheet:', a.arg); return null; }
        return a.type === 'GIVE' ? { give: id } : { take: id };
      }
      case 'FLOWER': return { flower: a.n };
      case 'SET': return { flag: a.arg };
      case 'REVEAL': return { reveal: a.arg };
      case 'SWAP': return { swap: a.arg, states: a.states };
      case 'MINIGAME': return { minigame: a.arg };
      case 'OPEN': return { open: a.arg };
      case 'SHOW': return { show: a.arg };
      case 'START': return { start: a.arg };
    }
    return null;
  },

  // one row → its box (if it has a line) + its actions
  steps(r) {
    const out = [];
    if (r.line) out.push({ say: { who: r.speaker === 'Narration' || !r.speaker ? null : r.speaker, text: r.line } });
    r.actions.forEach(a => { const o = this.action(a); if (o) out.push(o); });
    return out;
  },

  script(area, scene, state) {
    return this.rows(area, scene, state).reduce((acc, r) => acc.concat(this.steps(r)), []);
  },

  // the rows of a state, one script per row (for lines that "rotate")
  each(area, scene, state) { return this.rows(area, scene, state).map(r => this.steps(r)); },

  // the note pages (Garden / The note): rows of the same page are joined with a space
  notePages() {
    const pages = [];
    this.rows('Garden', 'The note').forEach(r => {
      const p = pages.find(q => q.state === r.state);
      if (p) p.text += ' ' + r.line; else pages.push({ state: r.state, text: r.line, actions: [] });
      (p || pages[pages.length - 1]).actions.push(...r.actions.map(a => this.action(a)).filter(Boolean));
    });
    return pages;
  },
};
const L = (area, scene, state) => Lines.script(area, scene, state);
