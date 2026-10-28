// ═══════════════════════════════════════════════════════════════
//  INPUT — one keyboard/touch router for the whole game.
//  Held directions are polled by the world; presses go to the top UI layer,
//  or to the world when no UI layer is open.
// ═══════════════════════════════════════════════════════════════
const Input = {
  held: { up: false, down: false, left: false, right: false },
  order: [],          // most recent direction last
  stack: [],          // UI layers: { onKey(name, ev) → true if handled }
  world: null,        // the active scene's handler
  anyKeyHooks: [],

  nameOf(e) {
    const k = e.key;
    switch (k) {
      case 'ArrowUp': case 'w': case 'W': return 'up';
      case 'ArrowDown': case 's': case 'S': return 'down';
      case 'ArrowLeft': case 'a': case 'A': return 'left';
      case 'ArrowRight': case 'd': case 'D': return 'right';
      case 'e': case 'E': case ' ': case 'Enter': return 'act';
      case 'Escape': return 'back';
      case 'i': case 'I': return 'inv';
      case 'Backspace': case 'Delete': return 'del';
      case 'Tab': return 'tab';
      case 'F1': case 'F2': case 'F3': case 'F4': return k.toLowerCase();
    }
    if (/^[0-9]$/.test(k)) return 'num' + k;
    return null;
  },

  push(layer) { this.stack.push(layer); return () => { const i = this.stack.indexOf(layer); if (i >= 0) this.stack.splice(i, 1); }; },
  busy() { return this.stack.length > 0; },

  setDir(name, on) {
    this.held[name] = on;
    this.order = this.order.filter(d => d !== name);
    if (on) this.order.push(name);
  },
  dir() { // last pressed direction still held
    for (let i = this.order.length - 1; i >= 0; i--) if (this.held[this.order[i]]) return this.order[i];
    return null;
  },
  clearHeld() { for (const k in this.held) this.held[k] = false; this.order = []; },

  press(name, ev) {
    const hooks = this.anyKeyHooks.splice(0);
    if (hooks.length) { hooks.forEach(h => h(name, ev)); return; }
    const top = this.stack[this.stack.length - 1];
    if (top) { top.onKey(name, ev); return; }
    if (this.world) this.world(name, ev);
  },
  onAnyKey(fn) { this.anyKeyHooks.push(fn); },

  init() {
    window.addEventListener('keydown', e => {
      const name = this.nameOf(e);
      if (name && /^(up|down|left|right|act|tab|f[1-4])$/.test(name)) e.preventDefault();
      if (['up', 'down', 'left', 'right'].includes(name)) {
        const wasHeld = this.held[name];
        this.setDir(name, true);
        if (e.repeat || wasHeld) { if (this.stack.length) this.press(name, e); return; }
      } else if (e.repeat) return;
      if (typeof Snd !== 'undefined') Snd.start();
      this.press(name || 'other', e);
    });
    window.addEventListener('keyup', e => {
      const name = this.nameOf(e);
      if (['up', 'down', 'left', 'right'].includes(name)) this.setDir(name, false);
    });
    window.addEventListener('blur', () => this.clearHeld());
  },
};
Input.init();
