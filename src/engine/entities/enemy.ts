import { Container, Graphics, Sprite } from "pixi.js";
import { tex, SHIP_SPRITE_OFFSET, type AssetAlias } from "../assets";
import { steerAround, type Obstacle } from "../steering";
import type { Projectile } from "./projectile";

export interface EnemyParams {
  x: number;
  y: number;
  health: number;
  radius: number;
  sprite: AssetAlias;
  contactDamage: number;
  diesOnContact: boolean;
}

export abstract class Enemy {
  readonly view = new Container();
  readonly radius: number;
  readonly contactDamage: number;
  readonly diesOnContact: boolean;
  health: number;
  dead = false;

  protected heading = 0;
  private readonly maxHealth: number;
  private readonly hull: Sprite;
  private readonly bar: Graphics;

  constructor(params: EnemyParams) {
    this.maxHealth = params.health;
    this.health = params.health;
    this.radius = params.radius;
    this.contactDamage = params.contactDamage;
    this.diesOnContact = params.diesOnContact;

    this.hull = new Sprite(tex(params.sprite));
    this.hull.anchor.set(0.5);
    const target = params.radius * 2.9;
    this.hull.scale.set(target / Math.max(this.hull.width, this.hull.height));

    this.bar = new Graphics();
    this.view.addChild(this.hull, this.bar);
    this.view.x = params.x;
    this.view.y = params.y;
    this.refreshBar();
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
    this.refreshBar();
  }

  protected faceTarget(tx: number, ty: number): void {
    this.heading = Math.atan2(ty - this.view.y, tx - this.view.x);
    this.hull.rotation = this.heading + SHIP_SPRITE_OFFSET;
  }

  protected moveAlong(speed: number, dt: number, dir = 1): void {
    this.view.x += Math.cos(this.heading) * speed * dt * dir;
    this.view.y += Math.sin(this.heading) * speed * dt * dir;
  }

  protected steerMove(
    goalHeading: number,
    obstacles: readonly Obstacle[],
    speed: number,
    dt: number,
    dir = 1,
  ): void {
    const desired = dir >= 0 ? goalHeading : goalHeading + Math.PI;
    this.heading = steerAround(this.view.x, this.view.y, desired, obstacles, this.radius * 1.5);
    this.hull.rotation = this.heading + SHIP_SPRITE_OFFSET;
    this.moveAlong(speed, dt);
  }

  getHeading(): number {
    return this.heading;
  }

  protected distanceTo(tx: number, ty: number): number {
    return Math.hypot(tx - this.view.x, ty - this.view.y);
  }

  private refreshBar(): void {
    const w = this.radius * 1.8;
    const h = 4;
    const top = -this.radius * 1.9 - 6;
    const ratio = this.health / this.maxHealth;
    const color = ratio > 0.5 ? 0x6bcb77 : ratio > 0.25 ? 0xf0a202 : 0xd1495b;

    this.bar.clear();
    this.bar.rect(-w / 2, top, w, h).fill({ color: 0x000000, alpha: 0.5 });
    this.bar.rect(-w / 2, top, w * ratio, h).fill(color);
  }

  abstract update(
    dt: number,
    targetX: number,
    targetY: number,
    obstacles: readonly Obstacle[],
  ): Projectile[];
}
