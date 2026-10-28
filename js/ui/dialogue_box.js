// ═══════════════════════════════════════════════════════════════
//  DIALOGUE BOX — Undertale-style: name tab, typewriter, bobbing arrow
// ═══════════════════════════════════════════════════════════════
const Dialog = {
  CPS: 40,            // characters per second
  BLIP_EVERY: 3,      // talk.mp3 every few letters
  isOpen: false,
  _pop: null,

  els() {
    if (!this._els) this._els = {
      root: document.getElementById('dlg'), name: document.getElementById('dlg-name'),
      body: document.getElementById('dlg-body'), next: document.getElementById('dlg-next'),
    };
    return this._els;
  },

  init() {
    const e = this.els();
    e.root.addEventListener('pointerdown', ev => { ev.preventDefault(); if (this.isOpen) this._advance(); });
  },

  // "Speaker: text" → {who, text}; "> text" → narration
  parse(line, vars) {
    let who = null, text = line;
    if (line.startsWith('>')) text = line.replace(/^>\s*/, '');
    else {
      const i = line.indexOf(': ');
      if (i > 0) { who = line.slice(0, i); text = line.slice(i + 2); }
    }
    if (vars) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return { who, text };
  },

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.els().root.classList.remove('hidden');
    this._pop = Input.push({ onKey: name => { if (name === 'act' || name === 'back') this._advance(); } });
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.els().root.classList.add('hidden');
    if (this._pop) { this._pop(); this._pop = null; }
    clearInterval(this._timer);
  },
  hide(on) { this.els().root.classList.toggle('hidden', on); },

  // Shows one line; resolves when the player advances past it.
  say(line, vars) {
    this.open();
    this.hide(false);
    const { who, text } = this.parse(line, vars);
    const e = this.els();
    e.name.classList.toggle('hidden', !who);
    e.name.textContent = who || '';
    e.body.classList.toggle('narr', !who);
    e.body.textContent = '';
    e.next.classList.remove('on');
    const chars = Array.from(text);
    let i = 0, since = 0;
    this.typing = true;
    clearInterval(this._timer);
    return new Promise(resolve => {
      this._resolve = resolve;
      this._full = text;
      this._timer = setInterval(() => {
        if (i >= chars.length) { this._finishTyping(); return; }
        const c = chars[i++];
        e.body.textContent += c;
        if (c !== ' ' && ++since >= this.BLIP_EVERY) { since = 0; Snd.sfx('talk', 0.25); }
      }, 1000 / this.CPS);
    });
  },
  _finishTyping() {
    clearInterval(this._timer);
    this.typing = false;
    this.els().body.textContent = this._full;
    this.els().next.classList.add('on');
  },
  _advance() {
    if (this.typing) { this._finishTyping(); return; }
    const r = this._resolve;
    this._resolve = null;
    if (r) r();
  },
};
