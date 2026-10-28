// ═══════════════════════════════════════════════════════════════
//  FADE — full-screen black fade used for map changes and "stills"
// ═══════════════════════════════════════════════════════════════
const Fade = {
  el: null,
  _set(opacity, ms) {
    this.el = this.el || document.getElementById('fade');
    this.el.style.transition = 'opacity ' + ms + 'ms linear';
    // force the transition to start from the current value
    void this.el.offsetWidth;
    this.el.style.opacity = opacity;
    return new Promise(r => setTimeout(r, ms + 20));
  },
  out(ms = 300) { document.getElementById('fade').classList.add('block'); return this._set(1, ms); },
  in(ms = 300) {
    return this._set(0, ms).then(() => document.getElementById('fade').classList.remove('block'));
  },
  wait(ms) { return new Promise(r => setTimeout(r, ms)); },
};
