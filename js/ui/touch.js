// ═══════════════════════════════════════════════════════════════
//  TOUCH — the handheld's controls on touch devices (layout: handheld.js).
//  Same actions as the keyboard / controller, through the same input router:
//    D-pad → up/down/left/right · A → act · B → inv (bag) · Select → flowers · Start → pause
//  Pointer events: every finger is tracked on its own (hold the D-pad and press A),
//  the D-pad is one zone that follows the thumb (slide to change direction), and a
//  held direction repeats in menus like a held arrow key.
// ═══════════════════════════════════════════════════════════════
const Touch = {
  enabled: false,
  REPEAT_DELAY: 380, REPEAT_EVERY: 130,

  init() {
    this.enabled = ('ontouchstart' in window) || window.matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search);
    if (!this.enabled) return;
    document.body.classList.add('touch', 'handheld');
    this.initDpad();
    document.querySelectorAll('#shell [data-k]').forEach(b => this.initButton(b));
  },

  buzz() { if (Handheld.haptics && navigator.vibrate) navigator.vibrate(10); },

  // A, B, Select, Start
  initButton(b) {
    const k = b.dataset.k;
    const down = e => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      b.classList.add('on');
      Snd.start();
      this.buzz();
      if (k === 'pause') Handheld.togglePause();
      else Input.press(k);
    };
    const up = e => { e.preventDefault(); b.classList.remove('on'); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  },

  // one zone: the direction is whichever axis the finger is furthest along from the centre
  initDpad() {
    const pad = document.getElementById('sh-dpad');
    let pid = null, dir = null, timer = null;
    const set = d => {
      if (d === dir) return;
      if (dir) Input.setDir(dir, false);
      clearTimeout(timer);
      pad.dataset.dir = d || '';
      dir = d;
      if (!d) return;
      this.buzz();
      Input.setDir(d, true);
      Input.press(d);                      // menus step once on press…
      const rep = () => { if (dir === d && Input.busy()) Input.press(d); timer = setTimeout(rep, this.REPEAT_EVERY); };
      timer = setTimeout(rep, this.REPEAT_DELAY);   // …then repeat while held
    };
    const dirAt = e => {
      const r = pad.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(x, y) < r.width * 0.08) return dir;   // tiny dead zone in the middle keeps the current direction
      return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    };
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (pid !== null) return;
      pid = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch (err) {}
      Snd.start();
      set(dirAt(e));
    });
    pad.addEventListener('pointermove', e => { if (e.pointerId === pid) set(dirAt(e)); });
    const end = e => { if (e.pointerId !== pid) return; pid = null; set(null); };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('contextmenu', e => e.preventDefault());
  },

  // kept for the callers that used to show / hide the old overlay buttons; the console is always there
  show() {},
};
