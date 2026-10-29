// ═══════════════════════════════════════════════════════════════
//  FLOWER BOOK — click the flower counter (top left): all 24 flowers in the
//  same slots as the bag. Pick a collected flower to read its poem again.
// ═══════════════════════════════════════════════════════════════
const FlowerBook = {
  TOTAL: 24,
  sel: 0,
  isOpen: false,

  init() {
    const c = document.getElementById('hud-flowers');
    c.addEventListener('click', () => { if (!Input.busy() && !Story.running) this.open(); });
  },

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const ov = document.getElementById('flw');
    const got = G.s.flowers.slice().sort((a, b) => a - b);
    this.sel = got.length ? got[got.length - 1] - 1 : 0;
    this.render();
    ov.classList.add('open');
    Snd.tick();
    this._click = e => { if (e.target === ov) this.close(); };
    ov.addEventListener('click', this._click);
    this._pop = Input.push({ onKey: name => this.key(name) });
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const ov = document.getElementById('flw');
    ov.classList.remove('open');
    ov.removeEventListener('click', this._click);
    this._pop();
  },
  cols() { return getComputedStyle(document.getElementById('flw-grid')).gridTemplateColumns.split(' ').length || 6; },
  key(name) {
    const n = this.TOTAL, c = this.cols();
    if (name === 'back' || name === 'inv' || name === 'flowers') return this.close();
    if (name === 'left') this.sel = (this.sel + n - 1) % n;
    else if (name === 'right') this.sel = (this.sel + 1) % n;
    else if (name === 'up') this.sel = (this.sel + n - c) % n;
    else if (name === 'down') this.sel = (this.sel + c) % n;
    else if (name === 'act') return this.read();
    else return;
    Snd.tick();
    this.render();
  },
  read() {
    const no = this.sel + 1;
    if (!G.s.flowers.includes(no) || !FLOWERS[no]) return;
    const ov = document.getElementById('flw');
    ov.classList.remove('open');
    Poem.open(FLOWERS[no].poem, no).then(() => { if (this.isOpen) ov.classList.add('open'); });
  },
  render() {
    const grid = document.getElementById('flw-grid');
    grid.innerHTML = '';
    for (let i = 0; i < this.TOTAL; i++) {
      const no = i + 1, has = G.s.flowers.includes(no);
      const s = document.createElement('div');
      s.className = 'slot' + (i === this.sel ? ' sel' : '') + (has ? '' : ' empty');
      if (has) {
        const ico = document.createElement('div');
        ico.className = 'ico';
        ico.style.backgroundImage = 'url(assets/' + flowerSprite(no) + ')';
        s.appendChild(ico);
      } else {
        const q = document.createElement('div');
        q.className = 'num';
        q.textContent = no;
        s.appendChild(q);
      }
      s.addEventListener('click', ev => {
        ev.stopPropagation();
        if (this.sel === i && has) return this.read();
        this.sel = i; Snd.tick(); this.render();
      });
      grid.appendChild(s);
    }
    const no = this.sel + 1, d = document.getElementById('flw-desc');
    d.textContent = '';
    if (G.s.flowers.includes(no)) {
      d.textContent = 'Flower ' + no;
      const sub = document.createElement('span');
      sub.className = 'sub';
      sub.textContent = '  — E to read';
      d.appendChild(sub);
    } else d.innerHTML = '&nbsp;';
    document.getElementById('flw-count').textContent = G.s.flowers.length + ' / ' + this.TOTAL;
  },
};
