// ═══════════════════════════════════════════════════════════════
//  CREDITS — the guest list, every character named (names from the
//  wedding markers), then back to the title screen.
// ═══════════════════════════════════════════════════════════════
const Credits = {
  list() {
    const m = window.game.cache.json.get('col_wedding').markers;
    const by = { beach: [], forest: [], blossoms: [], plains: [] };
    Object.keys(m).forEach(k => {
      const g = k.match(/^guest_(beach|forest|blossoms|plains)_/);
      if (g && m[k].name) by[g[1]].push(m[k].name);
    });
    return [
      { h: AREAS.beach.label, names: by.beach.concat('Phoebe') },
      { h: AREAS.forest.label, names: by.forest.concat('Gilmour') },
      { h: AREAS.blossom.label, names: by.blossoms.concat('Spike') },
      { h: AREAS.plains.label, names: by.plains.concat('Calabar') },
      { h: '', names: ['Eevie', 'Jana'] },
    ];
  },

  roll() {
    let el = document.getElementById('credits');
    if (!el) {
      el = document.createElement('div');
      el.id = 'credits';
      el.innerHTML = '<div id="credits-roll"></div>';
      document.body.appendChild(el);
    }
    const roll = el.querySelector('#credits-roll');
    roll.innerHTML = '';
    const add = (cls, text) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; roll.appendChild(d); };
    add('t', GAME_NAME);
    this.list().forEach(s => { if (s.h) add('h', s.h); s.names.forEach(n => add('n', n)); });
    add('t', ' ');
    add('t', GAME_NAME);
    el.classList.add('open');
    Fade.in(800);
    return new Promise(resolve => {
      const h = roll.scrollHeight + window.innerHeight;
      const ms = Math.max(22000, h * 18);
      roll.style.transition = 'none';
      roll.style.transform = 'translateY(0)';
      void roll.offsetWidth;
      roll.style.transition = 'transform ' + ms + 'ms linear';
      roll.style.transform = 'translateY(' + (-h) + 'px)';
      let fast = false;
      const finish = () => { pop(); Fade.out(1200).then(() => { el.classList.remove('open'); resolve(); }); };
      const pop = Input.push({ onKey: name => {
        if ((name === 'act' || name === 'back') && !fast) { fast = true; clearTimeout(t); setTimeout(finish, 600); }
      } });
      const t = setTimeout(finish, ms);
    });
  },
};
