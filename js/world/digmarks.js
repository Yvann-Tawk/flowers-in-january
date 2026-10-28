// ═══════════════════════════════════════════════════════════════
//  DIG MARKS — make the dig spots easy to find once they're revealed:
//  a disturbed mound, a pulsing pink glow, a bobbing arrow and rising
//  sparkles that can be seen from across the map. Gone once dug.
// ═══════════════════════════════════════════════════════════════
const DigMarks = {
  PINK: 0xf06e9c, DARK: 0x8e3a55,
  MOUND: { beach: [0xfff3d6, 0xc9a86a], forest: [0xffffff, 0xaec8e0] },

  setup(scene) {
    scene.digMarks = [];
    const mc = this.MOUND[scene.mapKey];
    if (!mc || !scene.place) return;
    scene.place.spots.filter(s => s.kind === 'dig').forEach(sp => {
      const cx = (sp.x + 0.5) * TILE, cy = (sp.y + 0.7) * TILE;
      const glow = scene.add.ellipse(cx, cy, 64, 26, this.PINK, 0.5).setDepth(DEPTH.GROUND_PROP + 3);
      const mound = scene.add.graphics().setDepth(DEPTH.GROUND_PROP + 4);
      mound.fillStyle(mc[0], 1).fillEllipse(cx, cy, 28, 12);
      mound.fillStyle(mc[1], 1).fillEllipse(cx - 2, cy + 1, 14, 5);
      mound.fillStyle(mc[1], 1).fillRect(cx + 7, cy - 3, 3, 2).fillRect(cx - 11, cy - 2, 2, 2);
      // a bobbing arrow pointing at the spot
      const arrow = scene.add.graphics().setDepth(DEPTH.ABOVE + 4);
      arrow.fillStyle(this.DARK, 1).fillTriangle(-9, -1, 9, -1, 0, 11);
      arrow.fillStyle(this.PINK, 1).fillTriangle(-6, 1, 6, 1, 0, 8);
      arrow.fillStyle(this.DARK, 1).fillRect(-4, -12, 8, 12);
      arrow.fillStyle(this.PINK, 1).fillRect(-2, -10, 4, 11);
      arrow.setPosition(cx, cy - 40);
      scene.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.7 }, scaleX: { from: 0.75, to: 1.2 }, scaleY: { from: 0.75, to: 1.2 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: arrow, y: cy - 30, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const mark = { id: sp.id, parts: [glow, mound, arrow], on: false };
      // sparkles rising from the mound
      scene.time.addEvent({ delay: 260, loop: true, callback: () => {
        if (!mark.on) return;
        const s = scene.add.star(cx + Phaser.Math.Between(-12, 12), cy - 2, 4, 1, 3, Math.random() < 0.5 ? 0xffffff : 0xffd97a).setDepth(DEPTH.ABOVE + 3);
        scene.tweens.add({ targets: s, y: s.y - Phaser.Math.Between(16, 28), alpha: 0, angle: 90, duration: 800, onComplete: () => s.destroy() });
      } });
      scene.digMarks.push(mark);
    });
    this.update(scene);
  },

  update(scene) {
    (scene.digMarks || []).forEach(m => {
      const on = !!G.s.revealed[m.id] && !G.flag('dug_' + m.id);
      if (on !== m.on) { m.on = on; m.parts.forEach(p => p.setVisible(on)); }
    });
  },
};
