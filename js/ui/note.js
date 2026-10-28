// ═══════════════════════════════════════════════════════════════
//  NOTE — Eevie's three pages, re-readable from the inventory
// ═══════════════════════════════════════════════════════════════
const Note = {
  open() {
    const ov = document.getElementById('note-ov');
    const numerals = ['I.', 'II.', 'III.'];
    let page = 0;
    const render = () => {
      document.getElementById('note-num').textContent = numerals[page];
      const t = document.getElementById('note-text');
      const text = NOTE[page];
      // the sign-off sits on its own lines; the words are unchanged
      const k = text.indexOf('All my love,');
      if (k >= 0) {
        t.textContent = text.slice(0, k).trim();
        const sig = document.createElement('span');
        sig.className = 'sig';
        sig.textContent = 'All my love,\n' + text.slice(k + 'All my love,'.length).trim();
        t.appendChild(sig);
      } else t.textContent = text;
      t.scrollTop = 0;
      document.getElementById('note-pnum').textContent = (page + 1) + '/' + NOTE.length;
      document.getElementById('note-prev').disabled = page === 0;
      document.getElementById('note-next').textContent = page === NOTE.length - 1 ? '✕' : '▶';
    };
    render();
    ov.classList.add('open');
    Snd.sfx('talk', 0.4);
    return new Promise(resolve => {
      const go = d => {
        const np = page + d;
        if (np >= NOTE.length) return close();
        if (np < 0) return;
        page = np; render(); Snd.sfx('talk', 0.4);
      };
      const close = () => {
        ov.classList.remove('open'); pop();
        prev.onclick = next.onclick = null;
        resolve();
      };
      const prev = document.getElementById('note-prev'), next = document.getElementById('note-next');
      prev.onclick = () => go(-1);
      next.onclick = () => go(1);
      const pop = Input.push({ onKey: name => {
        if (name === 'act' || (name === 'right' && page < NOTE.length - 1)) go(1);
        else if (name === 'left') go(-1);
        else if (name === 'back' || name === 'inv') close();
      } });
    });
  },
};
