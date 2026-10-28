// ═══════════════════════════════════════════════════════════════
//  DIGGING — three quick dust / snow puffs, then the reward lines
// ═══════════════════════════════════════════════════════════════
const Dig = {
  play(scene, spot, color) {
    const p = scene.player;
    p.stop(); p.frozen = true;
    p.face(Actors.dirTowards(p.x, p.y, (spot.x + 0.5) * TILE, (spot.y + 0.5) * TILE));
    const pop = Input.push({ onKey: () => {} });
    const cx = (spot.x + 0.5) * TILE, cy = (spot.y + 0.7) * TILE;
    return new Promise(resolve => {
      for (let k = 0; k < 3; k++) {
        scene.time.delayedCall(k * 330, () => {
          Snd.tick();
          for (let i = 0; i < 9; i++) {
            const a = Math.PI + (i / 8) * Math.PI + Phaser.Math.FloatBetween(-.2, .2);
            const r = Phaser.Math.Between(2, 4);
            const dot = scene.add.circle(cx + Phaser.Math.Between(-4, 4), cy, r, color, 0.95).setDepth(DEPTH.ABOVE - 2);
            scene.tweens.add({
              targets: dot, x: dot.x + Math.cos(a) * Phaser.Math.Between(10, 20), y: dot.y + Math.sin(a) * Phaser.Math.Between(10, 22),
              alpha: 0, scale: 0.4, duration: 420, ease: 'Quad.easeOut', onComplete: () => dot.destroy(),
            });
          }
        });
      }
      scene.time.delayedCall(1150, () => { pop(); p.frozen = false; resolve(); });
    });
  },
};
