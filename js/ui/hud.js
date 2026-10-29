// ═══════════════════════════════════════════════════════════════
//  HUD — flower counter, area label, Bag / Music buttons, item popups
// ═══════════════════════════════════════════════════════════════
const HUD = {
  init() {
    // fetch the UI frames right away, before the game's own files fill the connection
    ['dialog_frame', 'panel_frame', 'note_page', 'dialog_next', 'slot', 'slot_selected', 'flower_icon', 'gate_panel', 'field_frame', 'signs']
      .forEach(n => { const i = new Image(); i.src = 'assets/ui/' + n + '.png'; });
    document.getElementById('mus-btn').addEventListener('click', e => { e.currentTarget.blur(); Snd.start(); Snd.toggleMusic(); });
    document.getElementById('inv-btn').addEventListener('click', e => { e.currentTarget.blur(); if (!Input.busy()) Inventory.open(); });
    document.getElementById('mus-btn').innerHTML = '&#9835; Music';
  },
  show(on) { document.getElementById('hud').classList.toggle('hidden', !on); },
  setArea(label) {
    const el = document.getElementById('area-lbl');
    el.textContent = label || '';
  },
  setFlowers(n) { document.getElementById('hud-fn').textContent = n; },
  refresh() { this.setFlowers(G.s.flowers.length); },

  // a short message in the same popup style ("Controller connected")
  toast(text) {
    const box = document.getElementById('popups');
    const p = document.createElement('div');
    p.className = 'popup nine';
    p.textContent = text;
    box.appendChild(p);
    setTimeout(() => p.classList.add('out'), 1800);
    setTimeout(() => p.remove(), 2300);
  },

  // "Got: Old bottle" / "Gave: Big shell"
  popup(verb, item) {
    const it = ITEMS[item];
    if (!it) return;
    const box = document.getElementById('popups');
    const p = document.createElement('div');
    p.className = 'popup nine';
    p.innerHTML = '<span class="ico"></span><span></span>';
    p.querySelector('.ico').style.backgroundImage = 'url(assets/' + it.icon + ')';
    p.lastChild.textContent = verb + ': ' + it.name;
    box.appendChild(p);
    setTimeout(() => p.classList.add('out'), 2000);
    setTimeout(() => p.remove(), 2500);
  },

  // flower flies from the middle of the screen into the counter, which bumps
  flowerFly(n) {
    return new Promise(res => {
      const f = document.createElement('div');
      f.className = 'fly-flower';
      f.style.backgroundImage = 'url(assets/' + flowerSprite(n) + ')';
      f.style.left = (window.innerWidth / 2 - 24) + 'px';
      f.style.top = (window.innerHeight / 2 - 60) + 'px';
      f.style.transform = 'scale(2)';
      document.body.appendChild(f);
      const tgt = document.querySelector('#hud-flowers .flower-icon').getBoundingClientRect();
      setTimeout(() => {
        f.style.left = (tgt.left + tgt.width / 2 - 24) + 'px';
        f.style.top = (tgt.top + tgt.height / 2 - 24) + 'px';
        f.style.transform = 'scale(.5)';
        f.style.opacity = '0';
      }, 450);
      setTimeout(() => {
        f.remove();
        this.refresh();
        const c = document.getElementById('hud-flowers');
        c.classList.add('bump');
        setTimeout(() => c.classList.remove('bump'), 220);
        res();
      }, 1300);
    });
  },
};
