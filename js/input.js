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
      case 'f': case 'F': return 'flowers';
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
    if (name === 'music') { if (typeof Snd !== 'undefined') Snd.toggleMusic(); return; }
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
    this.pad.init();
  },

  // ── game controllers (Gamepad API, "standard" mapping: Xbox / PlayStation / Switch Pro) ──
  //   d-pad or left stick: move / navigate · A ✕: act · B ○: back · Y △ or Start: bag
  //   X □: flower book · Select / Share: music on/off
  pad: {
    BUTTONS: { 0: 'act', 1: 'back', 2: 'flowers', 3: 'inv', 9: 'inv', 8: 'music' },
    DPAD: { 12: 'up', 13: 'down', 14: 'left', 15: 'right' },
    DEAD: 0.5, REPEAT_DELAY: 380, REPEAT_EVERY: 130,
    prevButtons: {}, prevDir: null, repeatAt: 0, connected: false,

    init() {
      if (!navigator.getGamepads) return;
      window.addEventListener('gamepadconnected', e => {
        this.connected = true;
        if (typeof HUD !== 'undefined' && HUD.toast) HUD.toast('Controller connected');
      });
      window.addEventListener('gamepaddisconnected', () => { this.connected = false; Input.clearHeld(); });
      const loop = t => { this.poll(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    },

    // the one direction the controller is pushing (d-pad first, then the stick's stronger axis)
    dirOf(gp) {
      for (const b in this.DPAD) if (gp.buttons[b] && gp.buttons[b].pressed) return this.DPAD[b];
      const x = gp.axes[0] || 0, y = gp.axes[1] || 0;
      if (Math.max(Math.abs(x), Math.abs(y)) < this.DEAD) return null;
      return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    },

    poll(t) {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp = null;
      for (const p of pads) if (p && p.connected && p.buttons.length) { gp = p; break; }
      if (!gp) { if (this.prevDir) { Input.setDir(this.prevDir, false); this.prevDir = null; } return; }
      // direction: held like an arrow key; repeats while held in menus
      const d = this.dirOf(gp);
      if (d !== this.prevDir) {
        if (this.prevDir) Input.setDir(this.prevDir, false);
        if (d) { Input.setDir(d, true); Snd.start(); Input.press(d); this.repeatAt = t + this.REPEAT_DELAY; }
        this.prevDir = d;
      } else if (d && Input.busy() && t >= this.repeatAt) {
        Input.press(d);
        this.repeatAt = t + this.REPEAT_EVERY;
      }
      // buttons: one press per push
      for (const b in this.BUTTONS) {
        const down = !!(gp.buttons[b] && gp.buttons[b].pressed);
        if (down && !this.prevButtons[b]) { Snd.start(); Input.press(this.BUTTONS[b]); }
        this.prevButtons[b] = down;
      }
    },
  },
};
Input.init();
