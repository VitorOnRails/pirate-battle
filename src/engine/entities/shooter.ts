import { config } from "../config";
import { Enemy } from "./enemy";
import type { Obstacle } from "../steering";
import { Projectile } from "./projectile";

export class Shooter extends Enemy {
  private fireCd = 0;

  constructor(x: number, y: number) {
    const s = config.enemy.shooter;
    super({
      x,
      y,
      health: s.health,
      radius: s.radius,
      sprite: "ship_shooter",
      contactDamage: 0,
      diesOnContact: false,
    });
  }

  update(dt: number, targetX: number, targetY: number, obstacles: readonly Obstacle[]): Projectile[] {
    const s = config.enemy.shooter;
    const toPlayer = Math.atan2(targetY - this.view.y, targetX - this.view.x);
    const dist = this.distanceTo(targetX, targetY);

    if (dist > s.preferredRange + s.rangeTolerance) {
      this.steerMove(toPlayer, obstacles, s.moveSpeed, dt, 1);
    } else if (dist < s.preferredRange - s.rangeTolerance) {
      this.steerMove(toPlayer, obstacles, s.moveSpeed, dt, -1);
    } else {
      this.faceTarget(targetX, targetY);
    }

    this.fireCd -= dt;
    const shots: Projectile[] = [];
    if (this.fireCd <= 0 && dist <= s.preferredRange + s.rangeTolerance) {
      shots.push(
        new Projectile(this.view.x, this.view.y, toPlayer, {
          speed: s.projectileSpeed,
          damage: s.projectileDamage,
          tint: 0xff6b6b,
        }),
      );
      this.fireCd = s.fireCooldown;
    }
    return shots;
  }
}
