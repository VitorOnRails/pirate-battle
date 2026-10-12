import { Container, Graphics, Sprite } from "pixi.js";
import { config } from "../config";
import { tex } from "../assets";

export interface ProjectileOptions {
  speed?: number;
  damage?: number;
  tint?: number;
}

export class Projectile {
  readonly view: Container;
  readonly damage: number;
  dead = false;

  private life = config.projectile.lifetime;
  private readonly vx: number;
  private readonly vy: number;

  constructor(x: number, y: number, angle: number, opts: ProjectileOptions = {}) {
    const speed = opts.speed ?? config.projectile.speed;
    this.damage = opts.damage ?? config.projectile.damage;

    const sprite = new Sprite(tex("cannonball"));
    sprite.anchor.set(0.5);
    const r = config.projectile.radius;
    const target = r * 2.4;
    sprite.scale.set(target / Math.max(sprite.width, sprite.height));
    if (opts.tint !== undefined) sprite.tint = opts.tint;

    const trail = new Graphics();
    const len = r * 6;
    const half = r * 1.1;
    const trailColor = opts.tint ?? 0xffffff;
    trail
      .poly([0, -half, 0, half, -len, 0])
      .fill({ color: trailColor, alpha: 0.18 })
      .poly([0, -half * 0.5, 0, half * 0.5, -len * 0.6, 0])
      .fill({ color: 0xffffff, alpha: 0.28 });
    trail.rotation = angle;

    const container = new Container();
    container.addChild(trail, sprite);
    this.view = container;
    this.view.x = x;
    this.view.y = y;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number): void {
    this.view.x += this.vx * dt;
    this.view.y += this.vy * dt;

    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    const { width, height } = config.arena;
    if (
      this.view.x < 0 ||
      this.view.x > width ||
      this.view.y < 0 ||
      this.view.y > height
    ) {
      this.dead = true;
    }
  }
}
