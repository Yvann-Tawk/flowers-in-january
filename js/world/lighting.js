// ═══════════════════════════════════════════════════════════════
//  LIGHTING — the dark plains (placements.json → maps.plains.lighting).
//  A dark veil (~55% black) with soft light circles around Jana, each lit
//  lamp and the kiln once lit. When all five lamps are lit it fades to ~20%.
// ═══════════════════════════════════════════════════════════════
class Lighting {
  constructor(scene, opts) {
    this.scene = scene;
    this.opts = opts;               // { dark: 0.55, lit: 0.2, isLit(): bool, lights(): [[x, y, radius]] }
    this.alpha = opts.isLit() ? opts.lit : opts.dark;
    if (!scene.textures.exists('light_brush')) {
      const c = scene.textures.createCanvas('light_brush', 256, 256);
      const ctx = c.getContext(), g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
      c.refresh();
    }
    this.brush = scene.make.image({ key: 'light_brush', add: false }).setOrigin(0.5);
    this.rt = null;
    this.fit();
    scene.scale.on('resize', this.fit, this);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.fit, this));
  }

  fit() {
    const cam = this.scene.cameras.main;
    const w = Math.ceil(this.scene.scale.width / cam.zoom) + 4, h = Math.ceil(this.scene.scale.height / cam.zoom) + 4;
    if (this.rt) this.rt.destroy();
    this.rt = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(DEPTH.ABOVE + 50);
  }

  // fade the veil to its lit level
  brighten() {
    if (this.fading) return;
    this.fading = true;
    this.scene.tweens.addCounter({ from: this.alpha, to: this.opts.lit, duration: 2500, ease: 'Sine.easeInOut', onUpdate: t => { this.alpha = t.getValue(); } });
  }

  update(time) {
    if (!this.fading && this.opts.isLit() && this.alpha > this.opts.lit) this.brighten();
    const wv = this.scene.cameras.main.worldView, rt = this.rt;
    rt.setPosition(Math.floor(wv.x) - 2, Math.floor(wv.y) - 2);
    rt.clear();
    rt.fill(0x05030c, this.alpha);
    const flick = 1 + Math.sin(time / 180) * 0.03;
    this.opts.lights().forEach(([x, y, r]) => {
      this.brush.setScale((r * 2 * flick) / 256);
      rt.erase(this.brush, x - rt.x, y - rt.y);
    });
  }
}
