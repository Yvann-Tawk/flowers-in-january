// ═══════════════════════════════════════════════════════════════
//  NOTE — Eevie's three pages (spreadsheet: Garden / The note), re-readable
//  from the bag. The same page look is reused for the closing letter.
// ═══════════════════════════════════════════════════════════════
const Note = {
  // pages: [{num, text, sig?, small?}] — defaults to the opening note
  open(pages, opts = {}) {
    if (!pages) pages = Lines.notePages().map(p => ({ num: p.state.replace(/^page\s*/i, '') + '.', text: p.text, signoff: true }));
    const ov = document.getElementById('note-ov');
    const bk = document.getElementById('note-bk');
    bk.classList.toggle('letter', !!opts.letter);
    ov.classList.toggle('letter', !!opts.letter);
    document.getElementById('note-date').textContent = opts.date === undefined ? 'June 18th' : opts.date;
    let page = 0;
    const render = () => {
      const p = pages[page];
      document.getElementById('note-num').textContent = p.num || '';
      const t = document.getElementById('note-text');
      t.className = p.small ? 'small' : '';
      t.textContent = '';
      // the opening note's sign-off sits on its own lines; the words are unchanged
      const k = p.signoff ? p.text.indexOf('All my love,') : -1;
      if (k >= 0) {
        t.textContent = p.text.slice(0, k).trim();
        const sig = document.createElement('span');
        sig.className = 'sig';
        sig.textContent = 'All my love,\n' + p.text.slice(k + 'All my love,'.length).trim();
        t.appendChild(sig);
      } else (p.paras || [p.text]).forEach(par => {
        const d = document.createElement('p');
        d.textContent = typeof par === 'string' ? par : par.text;
        if (par.right) d.className = 'right';
        t.appendChild(d);
      });
      t.scrollTop = 0;
      document.getElementById('note-pnum').textContent = (page + 1) + '/' + pages.length;
      document.getElementById('note-prev').disabled = page === 0;
      document.getElementById('note-next').textContent = page === pages.length - 1 ? '✕' : '▶';
      t.style.opacity = 0;
      setTimeout(() => { t.style.opacity = 1; }, p.delay || 30);
    };
    render();
    ov.classList.add('open');
    Snd.tick();
    return new Promise(resolve => {
      const go = d => {
        const np = page + d;
        if (np >= pages.length) return close();
        if (np < 0) return;
        page = np; render(); Snd.tick();
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
        if (name === 'act' || (name === 'right' && page < pages.length - 1)) go(1);
        else if (name === 'left') go(-1);
        else if ((name === 'back' || name === 'inv') && !opts.letter) close();
      } });
    });
  },
};
