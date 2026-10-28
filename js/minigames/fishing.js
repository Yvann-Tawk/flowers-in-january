// ═══════════════════════════════════════════════════════════════
//  FISHING — cast, wait 1.5–4 s, "!" → press E within 0.6 s.
//  Too early or too late: "It got away", try again. First catch wins. Esc quits.
// ═══════════════════════════════════════════════════════════════
const Fishing = {
  WINDOW: 600,

  play(scene, opts) {
    return new Promise(resolve => {
      const p = scene.player;
      p.stop(); p.frozen = true;
      if (opts.stand) p.setTile(opts.stand[0], opts.stand[1]);
      if (opts.face) p.face(opts.face);
      if (opts.onStart) opts.onStart();

      const bx = opts.bobber[0] * TILE, by = opts.bobber[1] * TILE;
      const hand = () => {
        const d = DIRS[p.dir];
        return [p.x + d[0] * 12, p.y - 10 + d[1] * 6];
      };
      const g = scene.add.graphics().setDepth(DEPTH.ABOVE - 1);
      const label = scene.add.text(p.x, p.y - 44, '', { fontFamily: 'PixelAE', fontSize: '14px', color: '#fff7ed', stroke: '#3b2230', strokeThickness: 3, align: 'center' })
        .setOrigin(0.5, 1).setDepth(DEPTH.ICON).setResolution(2);
      const bang = scene.add.text(p.x, p.y - 40, '!', { fontFamily: 'PixelAE', fontSize: '28px', color: '#ffd97a', stroke: '#8e3a55', strokeThickness: 4 })
        .setOrigin(0.5, 1).setDepth(DEPTH.ICON).setResolution(2).setVisible(false);

      let state = 'ready', timer = null, castT = 0, dip = 0;
      const say = t => label.setText(t);
      const ready = () => { state = 'ready'; bang.setVisible(false); dip = 0; say(Touch.enabled ? 'E: cast   Bag: stop' : 'E: cast   Esc: stop'); };
      const gotAway = () => {
        state = 'lost'; bang.setVisible(false); dip = 0;
        say('It got away');
        Snd.lose();
        if (timer) timer.remove();
        timer = scene.time.delayedCall(1000, ready);
      };
      const cast = () => {
        state = 'wait'; castT = scene.time.now; say('...');
        Snd.tick();
        timer = scene.time.delayedCall(Phaser.Math.Between(1500, 4000), () => {
          state = 'bite'; bang.setVisible(true); dip = 1; say('');
          Snd.blip();
          timer = scene.time.delayedCall(this.WINDOW, () => { if (state === 'bite') gotAway(); });
        });
      };
      const finish = ok => {
        if (timer) timer.remove();
        scene.events.off('update', draw);
        pop();
        const end = () => {
          g.destroy(); label.destroy(); bang.destroy();
          if (opts.onEnd) opts.onEnd();
          p.frozen = false;
          resolve(ok);
        };
        if (!ok) return end();
        state = 'caught'; bang.setVisible(false); say('');
        Snd.win();
        const fish = scene.add.image(bx, by, 'items/item_fish.png').setDepth(DEPTH.ICON);
        scene.tweens.add({ targets: fish, x: p.x, y: p.y - 46, duration: 450, ease: 'Quad.easeOut' });
        scene.time.delayedCall(1100, () => { fish.destroy(); end(); });
      };
      const pop = Input.push({ onKey: name => {
        if (name === 'back' || name === 'inv') return finish(false);
        if (name !== 'act') return;
        if (state === 'ready') cast();
        else if (state === 'wait') { if (scene.time.now - castT > 200) gotAway(); }
        else if (state === 'bite') finish(true);
      } });

      const draw = () => {
        g.clear();
        label.setPosition(p.x, p.y - 40);
        bang.setPosition(p.x, p.y - 36 - Math.abs(Math.sin(scene.time.now / 60)) * 3);
        if (state !== 'wait' && state !== 'bite') return;
        const t = scene.time.now / 1000;
        const yy = by + (dip ? 3 + Math.sin(t * 40) * 1.5 : Math.sin(t * 3) * 1.2);
        const [hx, hy] = hand();
        g.lineStyle(1, 0xf2ece0, 0.85);
        g.beginPath(); g.moveTo(hx, hy); g.lineTo((hx + bx) / 2, Math.max(hy, yy) + 6); g.lineTo(bx, yy - 2); g.strokePath();
        if (opts.ice) { g.fillStyle(0x1b3346, 0.35); g.fillEllipse(bx, yy + 1, 10, 4); }
        g.fillStyle(0xd94a4a, 1); g.fillRect(bx - 2, yy - 4, 4, 3);
        g.fillStyle(0xffffff, 1); g.fillRect(bx - 2, yy - 1, 4, 2);
      };
      scene.events.on('update', draw);
      ready();
      cast(); // pressing E at the spot is the first cast
    });
  },
};
