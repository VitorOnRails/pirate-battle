import { Container, Graphics, Sprite } from "pixi.js";
import { tex, type AssetAlias } from "../assets";

const FRAMES: AssetAlias[] = ["explosion_1", "explosion_2", "explosion_3"];
const LIFE = 0.36;
const FRAMES_SPAN = 0.85;

export class Explosion {
  readonly view = new Container();
  dead = false;

  private t = 0;
  private frame = -1;
  private readonly sprite: Sprite;
  private readonly ring: Graphics;
  private readonly baseScale: number;

  constructor(x: number, y: number, scale = 1) {
    this.baseScale = scale;
    this.view.x = x;
    this.view.y = y;

    this.ring = new Graphics();
    this.sprite = new Sprite(tex(FRAMES[0]));
    this.sprite.anchor.set(0.5);
    this.sprite.rotation = Math.random() * Math.PI * 2;
    this.view.addChild(this.ring, this.sprite);
    this.setFrame(0);
  }

  private setFrame(i: number): void {
    if (i !== this.frame) {
      this.frame = i;
      this.sprite.texture = tex(FRAMES[i]);
    }
  }

  update(dt: number): void {
    this.t += dt;
    const p = this.t / LIFE;
    if (p >= 1) {
      this.dead = true;
      return;
    }

    const fi = Math.min(FRAMES.length - 1, Math.floor((p / FRAMES_SPAN) * FRAMES.length));
    this.setFrame(fi);

    this.sprite.scale.set(this.baseScale * (0.85 + 0.35 * Math.min(1, p * 1.4)));
    this.sprite.alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;

    const radius = this.baseScale * (18 + 95 * p);
    this.ring
      .clear()
      .circle(0, 0, radius)
      .stroke({ color: 0xffe3a3, width: this.baseScale * 4 * (1 - p), alpha: 0.5 * (1 - p) });
  }
}
