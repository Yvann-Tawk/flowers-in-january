// ═══════════════════════════════════════════════════════════════
//  TOUCH — on-screen arrows + E + Bag on touch devices
// ═══════════════════════════════════════════════════════════════
const Touch = {
  enabled: false,
  init() {
    this.enabled = ('ontouchstart' in window) || window.matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search);
    if (!this.enabled) return;
    document.body.classList.add('touch');
    document.querySelectorAll('#touch .tbtn').forEach(b => {
      const k = b.dataset.k;
      const down = e => {
        e.preventDefault();
        b.classList.add('on');
        Snd.start();
        if (['up', 'down', 'left', 'right'].includes(k)) { Input.setDir(k, true); if (Input.busy()) Input.press(k); }
        else Input.press(k);
      };
      const up = e => {
        e.preventDefault();
        b.classList.remove('on');
        if (['up', 'down', 'left', 'right'].includes(k)) Input.setDir(k, false);
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    });
  },
  show(on) { if (this.enabled) document.getElementById('touch').classList.toggle('hidden', !on); },
};
