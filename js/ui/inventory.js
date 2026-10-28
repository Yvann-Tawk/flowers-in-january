// ═══════════════════════════════════════════════════════════════
//  INVENTORY — slots with item icons; the note can be re-read from here
// ═══════════════════════════════════════════════════════════════
const Inventory = {
  SLOTS: 12,
  sel: 0,
  isOpen: false,

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const ov = document.getElementById('inv');
    this.sel = Math.min(this.sel, Math.max(0, G.s.inv.length - 1));
    this.render();
    ov.classList.add('open');
    Snd.blipSoft();
    this._click = e => { if (e.target === ov) this.close(); };
    ov.addEventListener('click', this._click);
    this._pop = Input.push({ onKey: name => this.key(name) });
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const ov = document.getElementById('inv');
    ov.classList.remove('open');
    ov.removeEventListener('click', this._click);
    this._pop();
  },
  cols() { return getComputedStyle(document.getElementById('inv-grid')).gridTemplateColumns.split(' ').length || 6; },
  key(name) {
    const n = this.SLOTS, c = this.cols();
    if (name === 'inv' || name === 'back') return this.close();
    if (name === 'left') this.sel = (this.sel + n - 1) % n;
    else if (name === 'right') this.sel = (this.sel + 1) % n;
    else if (name === 'up') this.sel = (this.sel + n - c) % n;
    else if (name === 'down') this.sel = (this.sel + c) % n;
    else if (name === 'act') return this.use();
    else return;
    Snd.blipSoft();
    this.render();
  },
  use() {
    const item = G.s.inv[this.sel];
    if (item === 'note') {
      document.getElementById('inv').classList.remove('open');
      Note.open().then(() => { if (this.isOpen) document.getElementById('inv').classList.add('open'); });
    } else this.close();
  },
  render() {
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    for (let i = 0; i < this.SLOTS; i++) {
      const s = document.createElement('div');
      s.className = 'slot' + (i === this.sel ? ' sel' : '');
      const item = G.s.inv[i];
      if (item && ITEMS[item]) {
        const ico = document.createElement('div');
        ico.className = 'ico';
        ico.style.backgroundImage = 'url(assets/' + ITEMS[item].icon + ')';
        s.appendChild(ico);
        if (FRAGMENTS[item]) {
          const sg = document.createElement('div');
          sg.className = 'sign';
          sg.style.backgroundPosition = (FRAGMENTS[item].sign * 100 / 3) + '% 0';
          s.appendChild(sg);
        }
      }
      s.addEventListener('click', ev => {
        ev.stopPropagation();
        if (this.sel === i && G.s.inv[i] === 'note') return this.use();
        this.sel = i; this.render();
      });
      grid.appendChild(s);
    }
    const d = document.getElementById('inv-desc');
    const item = G.s.inv[this.sel];
    if (!item) d.innerHTML = '&nbsp;';
    else {
      d.textContent = ITEMS[item].name;
      const sub = document.createElement('span');
      sub.className = 'sub';
      if (item === 'note') sub.textContent = '  — E to read';
      else if (FRAGMENTS[item]) sub.textContent = "  — " + FRAGMENTS[item].guardian + "'s sign";
      if (sub.textContent) d.appendChild(sub);
    }
  },
};
