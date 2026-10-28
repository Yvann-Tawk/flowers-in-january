// ═══════════════════════════════════════════════════════════════
//  GATE PANEL — four sign sockets + DAY / MONTH / YEAR (cipher in STORY.md)
//  Only reachable with all four fragments; this build has two, so the story
//  shows the "To be continued" card instead. The logic is complete and testable
//  in debug mode (F4 gives all four fragments).
// ═══════════════════════════════════════════════════════════════
const Gate = {
  SLOT_X: [37, 108, 179, 250], SLOT_Y: 33,
  FIELDS: [
    { id: 'day', label: 'DAY', len: 2, hint: ['fragment_gilmour'] },
    { id: 'month', label: 'MONTH', len: 2, hint: ['fragment_phoebe'] },
    { id: 'year', label: 'YEAR', len: 4, hint: ['fragment_calabar', 'fragment_spike'] },
  ],

  open() {
    const ov = document.getElementById('gate-ov');
    const panel = document.getElementById('gate-panel');
    const g = Math.max(1, Math.min(2, (window.innerWidth * 0.94) / 320, (window.innerHeight * 0.94) / 200));
    panel.style.setProperty('--g', g);
    this.vals = { day: '', month: '', year: '' };
    this.f = 0;
    this.render();
    ov.classList.add('open');
    Snd.gateClunk();
    return new Promise(resolve => {
      this._done = solved => { ov.classList.remove('open'); pop(); resolve(!!solved); };
      const pop = Input.push({ onKey: (name, ev) => this.key(name, ev) });
    });
  },

  key(name, ev) {
    const F = this.FIELDS[this.f];
    let v = this.vals[F.id];
    if (name === 'back') return this._done(false);
    if (/^num\d$/.test(name)) {
      if (v.length >= F.len) v = '';
      v += name.slice(3);
      this.vals[F.id] = v;
      if (v.length === F.len && this.f < 2) this.f++;
    } else if (name === 'del') this.vals[F.id] = v.slice(0, -1);
    else if (name === 'left') this.f = (this.f + 2) % 3;
    else if (name === 'right' || name === 'tab') this.f = (this.f + 1) % 3;
    else if (name === 'up' || name === 'down') { // cycle the last digit (touch / no number keys)
      if (!v.length) v = '0';
      const d = (+v.slice(-1) + (name === 'up' ? 1 : 9)) % 10;
      this.vals[F.id] = v.slice(0, -1) + d;
    } else if (name === 'act') return this.submit();
    else return;
    Snd.blipSoft();
    this.render();
  },

  submit() {
    const all = NOTE_ORDER.every(f => G.has(f));
    const ok = all && this.vals.day.padStart(2, '0') === GATE_ANSWER.day &&
      this.vals.month.padStart(2, '0') === GATE_ANSWER.month && this.vals.year === GATE_ANSWER.year;
    if (ok) {
      G.setFlag('gate_open'); G.save();
      Snd.gateClunk();
      setTimeout(() => this._done(true), 500);
      return;
    }
    if (all) G.s.gateWrong++;
    G.save();
    Snd.gateWrong();
    const p = document.getElementById('gate-panel');
    p.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    this.render();
  },

  render() {
    // sockets: held fragments in collection order
    const slots = document.getElementById('gate-slots');
    slots.innerHTML = '';
    this.SLOT_X.forEach((x, i) => {
      const s = document.createElement('div');
      s.className = 'gslot';
      s.style.left = 'calc(' + x + 'px * var(--g))';
      s.style.top = 'calc(' + this.SLOT_Y + 'px * var(--g))';
      const frag = G.s.fragments[i];
      if (frag && FRAGMENTS[frag]) {
        s.innerHTML = '<div class="sign"></div><div class="dig"></div>';
        s.firstChild.style.backgroundPosition = (FRAGMENTS[frag].sign * 100 / 3) + '% 0';
        s.lastChild.textContent = FRAGMENTS[frag].digits;
      }
      slots.appendChild(s);
    });
    // fields (after three wrong attempts: the four signs as empty slots above them, in note order)
    const showHint = G.s.gateWrong >= 3;
    const fields = document.getElementById('gate-fields');
    fields.innerHTML = '';
    this.FIELDS.forEach((F, i) => {
      const w = document.createElement('div');
      w.className = 'gfield';
      if (showHint) {
        const h = document.createElement('div');
        h.className = 'ghint';
        h.style.position = 'static';
        F.hint.forEach(fr => {
          const sg = document.createElement('div');
          sg.className = 'sign';
          sg.style.backgroundPosition = (FRAGMENTS[fr].sign * 100 / 3) + '% 0';
          h.appendChild(sg);
        });
        w.appendChild(h);
      }
      const lab = document.createElement('label');
      lab.textContent = F.label;
      const box = document.createElement('div');
      box.className = 'box' + (F.len > 2 ? ' wide' : '') + (i === this.f ? ' sel' : '');
      const v = this.vals[F.id];
      box.textContent = (v + '_'.repeat(F.len)).slice(0, F.len);
      box.addEventListener('click', () => { this.f = i; this.render(); });
      w.appendChild(lab); w.appendChild(box);
      fields.appendChild(w);
    });
    document.getElementById('gate-msg').textContent = 'E: try the gate · Esc: step back';
  },
};

// Soft full-screen card ("To be continued.")
const Card = {
  show(text, ms = 2600) {
    const c = document.getElementById('card');
    document.getElementById('card-text').textContent = text;
    c.classList.add('open');
    void c.offsetWidth;
    c.classList.add('show');
    return new Promise(resolve => {
      let done = false;
      const pop = Input.push({ onKey: () => { if (performance.now() - t0 > 900) finish(); } });
      const t0 = performance.now();
      const finish = () => {
        if (done) return; done = true; pop();
        c.classList.remove('show');
        setTimeout(() => { c.classList.remove('open'); resolve(); }, 1000);
      };
      c.onclick = () => { if (performance.now() - t0 > 900) finish(); };
      setTimeout(finish, ms + 1000);
    });
  },
};
