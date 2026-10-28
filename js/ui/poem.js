// ═══════════════════════════════════════════════════════════════
//  POEM OVERLAY — the original poem screen (Arabic right-to-left kept)
// ═══════════════════════════════════════════════════════════════
const Poem = {
  isArabic(s) { return /[؀-ۿ]/.test(s); },

  // id = poem id in js/data.js; resolves when closed
  open(id, flowerNo) {
    const p = POEMS.find(q => q.id === id);
    if (!p) return Promise.resolve();
    const ov = document.getElementById('poem-ov');
    const ti = document.getElementById('poem-ti'), bd = document.getElementById('poem-bd');
    document.getElementById('poem-dt').textContent = flowerNo ? 'Flower ' + flowerNo + ' of 24' : '';
    ti.textContent = p.title; bd.textContent = p.body;
    const ar = this.isArabic(p.body);
    bd.style.direction = ar ? 'rtl' : 'ltr';
    bd.style.textAlign = ar ? 'right' : 'left';
    bd.style.fontFamily = ar ? '"Noto Naskh Arabic","Amiri",serif' : '"PixelAE",monospace';
    bd.style.fontSize = ar ? '1.3rem' : '';
    document.getElementById('poem-card').scrollTop = 0;
    ov.classList.add('open');
    return new Promise(resolve => {
      const opened = performance.now();
      const close = () => {
        if (performance.now() - opened < 400) return; // don't let a held key skip the poem
        ov.classList.remove('open');
        pop();
        ov.removeEventListener('click', onClick);
        document.getElementById('poem-x').removeEventListener('click', close);
        resolve();
      };
      const onClick = e => { if (e.target === ov) close(); };
      const pop = Input.push({ onKey: name => {
        if (name === 'act' || name === 'back') close();
        else if (name === 'up' || name === 'down') document.getElementById('poem-card').scrollTop += name === 'up' ? -60 : 60;
      } });
      ov.addEventListener('click', onClick);
      document.getElementById('poem-x').addEventListener('click', close);
    });
  },
};
