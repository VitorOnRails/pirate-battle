import { config } from "../config";
import { Enemy } from "./enemy";
import type { Obstacle } from "../steering";
import type { Projectile } from "./projectile";

export class Chaser extends Enemy {
  constructor(x: number, y: number) {
    const c = config.enemy.chaser;
    super({
      x,
      y,
      health: c.health,
      radius: c.radius,
      sprite: "ship_chaser",
      contactDamage: c.contactDamage,
      diesOnContact: true,
    });
  }

  update(dt: number, targetX: number, targetY: number, obstacles: readonly Obstacle[]): Projectile[] {
    const goal = Math.atan2(targetY - this.view.y, targetX - this.view.x);
    this.steerMove(goal, obstacles, config.enemy.chaser.moveSpeed, dt);
    return [];
  }
}
