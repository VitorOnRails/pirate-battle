import { Container, Sprite } from "pixi.js";
import { config } from "../config";
import { tex, SHIP_SPRITE_OFFSET } from "../assets";
import type { Input } from "../input";
import { Projectile } from "./projectile";
import { playSfx, playRandomSfx } from "../../audio/sounds";

export class Player {
  readonly view = new Container();
  health = config.player.health;

  private heading = 0;
  private readonly sprite: Sprite;
  private frontCd = 0;
  private lateralCd = 0;

  constructor() {
    this.sprite = new Sprite(tex("ship_player"));
    this.sprite.anchor.set(0.5);
    const target = config.player.radius * 2.9;
    this.sprite.scale.set(target / Math.max(this.sprite.width, this.sprite.height));
    this.view.addChild(this.sprite);
    this.reset();
  }

  getHeading(): number {
    return this.heading;
  }

  reset(): void {
    this.view.x = config.arena.width / 2;
    this.view.y = config.arena.height / 2;
    this.heading = 0;
    this.sprite.rotation = SHIP_SPRITE_OFFSET;
    this.health = config.player.health;
    this.frontCd = 0;
    this.lateralCd = 0;
  }

  update(dt: number, input: Input): void {
    const { moveSpeed, rotationSpeed } = config.player;

    if (input.isActive("rotateLeft")) this.heading -= rotationSpeed * dt;
    if (input.isActive("rotateRight")) this.heading += rotationSpeed * dt;

    if (input.isActive("forward")) {
      this.view.x += Math.cos(this.heading) * moveSpeed * dt;
      this.view.y += Math.sin(this.heading) * moveSpeed * dt;
    }

    this.sprite.rotation = this.heading + SHIP_SPRITE_OFFSET;
  }

  tryFire(dt: number, input: Input): Projectile[] {
    this.frontCd -= dt;
    this.lateralCd -= dt;

    const shots: Projectile[] = [];
    const { frontCooldown, lateralCooldown, lateralSpacing } = config.weapons;
    const rot = this.heading;
    const x = this.view.x;
    const y = this.view.y;

    if (input.isActive("fireFront") && this.frontCd <= 0) {
      shots.push(new Projectile(x, y, rot));
      this.frontCd = frontCooldown;
      playRandomSfx(["cannon_fire_1", "cannon_fire_2", "cannon_fire_3"]);
    }

    const forwardX = Math.cos(rot);
    const forwardY = Math.sin(rot);
    const broadside = (sideAngle: number): void => {
      for (const off of [-lateralSpacing, 0, lateralSpacing]) {
        shots.push(new Projectile(x + forwardX * off, y + forwardY * off, sideAngle));
      }
    };

    if (input.isActive("fireLeft") && this.lateralCd <= 0) {
      broadside(rot - Math.PI / 2);
      this.lateralCd = lateralCooldown;
      playSfx("cannon_broadside");
    } else if (input.isActive("fireRight") && this.lateralCd <= 0) {
      broadside(rot + Math.PI / 2);
      this.lateralCd = lateralCooldown;
      playSfx("cannon_broadside");
    }

    return shots;
  }
}
