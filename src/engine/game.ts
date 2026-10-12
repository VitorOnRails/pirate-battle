import { Application, Container, Ticker, TilingSprite } from "pixi.js";
import { config } from "./config";
import type { MatchSettings } from "./settings";
import { tex } from "./assets";
import { Input, type InputAction } from "./input";
import { Player } from "./entities/player";
import type { Projectile } from "./entities/projectile";
import type { Enemy } from "./entities/enemy";
import { Chaser } from "./entities/chaser";
import { Shooter } from "./entities/shooter";
import { Island } from "./entities/island";
import { Explosion } from "./entities/explosion";
import { circlesOverlap, circleRectOverlap, pushOutOfRect } from "./collision";
import {
  playSfx,
  playRandomSfx,
  startAmbience,
  stopAmbience,
} from "../audio/sounds";

export type GameOverReason = "time" | "death";

export type PauseReason = "manual" | "key" | "blur" | "hidden";

const MAX_DELTA = 0.05;

export interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onHealthChange: (health: number) => void;
  onTimeChange: (secondsLeft: number) => void;
  onGameOver: (reason: GameOverReason) => void;
  onPauseChange: (paused: boolean, reason?: PauseReason) => void;
}

export class Game {
  private app = new Application();
  private world = new Container();
  private input = new Input();
  private player = new Player();
  private playerShots: Projectile[] = [];
  private enemyShots: Projectile[] = [];
  private enemies: Enemy[] = [];
  private islands: Island[] = [];
  private effects: Explosion[] = [];
  private water?: TilingSprite;

  private score = 0;
  private status: "playing" | "paused" | "over" = "playing";
  private timeLeft: number;
  private spawnTimer: number;

  private prevScore = 0;
  private prevHealth = config.player.health;
  private prevSecond: number;

  private initialized = false;
  private destroyed = false;
  private tornDown = false;

  private readonly onBlur = (): void => this.autoPause("blur");
  private readonly onVisibility = (): void => {
    if (document.hidden) this.autoPause("hidden");
  };
  private readonly onPauseKey = (e: KeyboardEvent): void => {
    if (e.code === "Escape" || e.code === "KeyP") {
      e.preventDefault();
      if (this.status === "playing") this.pause("key");
      else if (this.status === "paused") this.resume();
    }
  };

  constructor(
    private readonly callbacks: GameCallbacks,
    private readonly settings: MatchSettings,
  ) {
    this.timeLeft = settings.sessionTime;
    this.spawnTimer = settings.spawnInterval;
    this.prevSecond = Math.ceil(settings.sessionTime);
  }

  async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: window,
      background: config.arena.background,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.initialized = true;

    if (this.destroyed) {
      this.teardown();
      return;
    }

    container.appendChild(this.app.canvas);

    this.app.stage.addChild(this.world);

    this.water = new TilingSprite({
      texture: tex("water"),
      width: config.arena.width,
      height: config.arena.height,
    });
    this.world.addChild(this.water);

    for (const def of config.islands) {
      const island = new Island(def);
      this.islands.push(island);
      this.world.addChild(island.view);
    }

    this.world.addChild(this.player.view);
    this.updateCamera();
    this.emitAll();
    this.app.ticker.add(this.update);

    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("keydown", this.onPauseKey);

    playSfx("game_start");
    startAmbience();
  }

  private update = (ticker: Ticker): void => {
    if (this.status !== "playing") return;

    const dt = Math.min(ticker.deltaMS / 1000, MAX_DELTA);
    this.timeLeft -= dt;

    this.updateEntities(dt);
    this.resolveCollisions();
    this.cleanup();

    if (this.player.health <= 0) this.endMatch("death");
    else if (this.timeLeft <= 0) this.endMatch("time");

    this.emitChanges();
  };

  private updateEntities(dt: number): void {
    this.player.update(dt, this.input);
    this.keepOutOfIslands(this.player.view, config.player.radius, this.player.getHeading());
    this.clampToWorld(this.player.view, config.player.radius);

    for (const shot of this.player.tryFire(dt, this.input)) {
      this.spawnShot(shot, this.playerShots);
    }

    const px = this.player.view.x;
    const py = this.player.view.y;
    for (const e of this.enemies) {
      for (const shot of e.update(dt, px, py, this.islands)) {
        this.spawnShot(shot, this.enemyShots);
      }
      this.keepOutOfIslands(e.view, e.radius, e.getHeading());
      this.clampToWorld(e.view, e.radius);
    }

    for (const p of this.playerShots) p.update(dt);
    for (const p of this.enemyShots) p.update(dt);
    for (const fx of this.effects) fx.update(dt);

    if (this.water) this.water.tilePosition.x += 8 * dt;

    this.updateCamera();

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.enemies.length < config.spawn.maxEnemies) this.spawnEnemy();
      this.spawnTimer = this.settings.spawnInterval;
    }
  }

  private spawnExplosion(x: number, y: number, radius: number): void {
    const fx = new Explosion(x, y, (radius * 2.5) / 64);
    this.world.addChild(fx.view);
    this.effects.push(fx);
  }

  private spawnShot(shot: Projectile, bucket: Projectile[]): void {
    this.world.addChild(shot.view);
    bucket.push(shot);
  }

  private updateCamera(): void {
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const { width: ww, height: wh } = config.arena;
    this.world.x =
      ww <= vw ? (vw - ww) / 2 : Math.max(vw - ww, Math.min(0, vw / 2 - this.player.view.x));
    this.world.y =
      wh <= vh ? (vh - wh) / 2 : Math.max(vh - wh, Math.min(0, vh / 2 - this.player.view.y));
  }

  private clampToWorld(view: { x: number; y: number }, radius: number): void {
    view.x = Math.max(radius, Math.min(config.arena.width - radius, view.x));
    view.y = Math.max(radius, Math.min(config.arena.height - radius, view.y));
  }

  private keepOutOfIslands(
    view: { x: number; y: number },
    radius: number,
    heading: number,
  ): void {
    const rc = radius * 0.62;
    const off = radius * 1.35 - rc;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);

    for (const sign of [1, -1]) {
      for (const is of this.islands) {
        const cx = view.x + cos * off * sign;
        const cy = view.y + sin * off * sign;
        const p = pushOutOfRect(cx, cy, rc, is.x, is.y, is.halfW, is.halfH);
        view.x += p.x - cx;
        view.y += p.y - cy;
      }
    }
  }

  private blockShotsOnIslands(list: Projectile[]): void {
    const sr = config.projectile.radius;
    for (const p of list) {
      if (p.dead) continue;
      for (const is of this.islands) {
        if (circleRectOverlap(p.view.x, p.view.y, sr, is.x, is.y, is.halfW, is.halfH)) {
          p.dead = true;
          break;
        }
      }
    }
  }

  private resolveCollisions(): void {
    const sr = config.projectile.radius;
    const plr = config.player.radius;

    this.blockShotsOnIslands(this.playerShots);
    this.blockShotsOnIslands(this.enemyShots);

    for (const p of this.playerShots) {
      if (p.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (circlesOverlap(p.view.x, p.view.y, sr, e.view.x, e.view.y, e.radius)) {
          e.takeDamage(p.damage);
          p.dead = true;
          if (e.dead) {
            this.score += config.scoring.pointsPerKill;
            this.spawnExplosion(e.view.x, e.view.y, e.radius);
            playRandomSfx(["ship_explosion_1", "ship_explosion_2"]);
          }
          break;
        }
      }
    }

    for (const p of this.enemyShots) {
      if (p.dead) continue;
      if (
        circlesOverlap(
          p.view.x,
          p.view.y,
          sr,
          this.player.view.x,
          this.player.view.y,
          plr,
        )
      ) {
        this.player.health -= p.damage;
        p.dead = true;
        playRandomSfx(["ship_wood_hit_1", "ship_wood_hit_2"]);
      }
    }

    for (const e of this.enemies) {
      if (e.dead || e.contactDamage <= 0) continue;
      if (
        circlesOverlap(
          e.view.x,
          e.view.y,
          e.radius,
          this.player.view.x,
          this.player.view.y,
          plr,
        )
      ) {
        this.player.health -= e.contactDamage;
        if (e.diesOnContact) {
          e.dead = true;
          this.spawnExplosion(e.view.x, e.view.y, e.radius);
          playRandomSfx(["ship_explosion_1", "ship_explosion_2"]);
        } else {
          playSfx("ship_collision");
        }
      }
    }
  }

  private cleanup(): void {
    this.removeDead(this.playerShots);
    this.removeDead(this.enemyShots);
    this.removeDead(this.enemies);
    this.removeDead(this.effects);
  }

  private removeDead(list: { dead: boolean; view: { destroy(): void } }[]): void {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].dead) {
        list[i].view.destroy();
        list.splice(i, 1);
      }
    }
  }

  private spawnEnemy(): void {
    const margin = 60;
    const { width, height } = config.arena;

    const camX = -this.world.x;
    const camY = -this.world.y;
    const { width: vw, height: vh } = this.app.screen;
    const buffer = 90;

    let x = margin;
    let y = margin;
    for (let tries = 0; tries < 30; tries++) {
      x = margin + Math.random() * (width - margin * 2);
      y = margin + Math.random() * (height - margin * 2);
      const offscreen =
        x < camX - buffer ||
        x > camX + vw + buffer ||
        y < camY - buffer ||
        y > camY + vh + buffer;
      const clearOfIslands = this.islands.every(
        (is) =>
          Math.abs(x - is.x) >= is.halfW + margin ||
          Math.abs(y - is.y) >= is.halfH + margin,
      );
      if (offscreen && clearOfIslands) break;
    }

    const enemy =
      Math.random() < config.spawn.shooterChance
        ? new Shooter(x, y)
        : new Chaser(x, y);
    this.world.addChild(enemy.view);
    this.enemies.push(enemy);
  }

  private endMatch(reason: GameOverReason): void {
    this.status = "over";
    this.timeLeft = Math.max(0, this.timeLeft);
    this.emitChanges();
    stopAmbience();
    playSfx(reason === "death" ? "game_over" : "game_complete");
    this.callbacks.onGameOver(reason);
  }

  setInput(action: InputAction, active: boolean): void {
    this.input.setAction(action, active);
  }

  pause(reason: PauseReason = "manual"): void {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.callbacks.onPauseChange(true, reason);
    playSfx("game_pause");
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.callbacks.onPauseChange(false);
    playSfx("game_resume");
  }

  private autoPause(reason: PauseReason): void {
    this.pause(reason);
  }

  reset(): void {
    this.clearList(this.playerShots);
    this.clearList(this.enemyShots);
    this.clearList(this.enemies);
    this.clearList(this.effects);

    this.player.reset();
    this.updateCamera();
    this.score = 0;
    this.timeLeft = this.settings.sessionTime;
    this.spawnTimer = this.settings.spawnInterval;
    this.status = "playing";
    this.callbacks.onPauseChange(false);
    this.emitAll();
    playSfx("game_start");
    startAmbience();
  }

  private clearList(list: { view: { destroy(): void } }[]): void {
    for (const item of list) item.view.destroy();
    list.length = 0;
  }

  private emitAll(): void {
    this.prevScore = this.score;
    this.prevHealth = this.player.health;
    this.prevSecond = Math.max(0, Math.ceil(this.timeLeft));
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onHealthChange(this.player.health);
    this.callbacks.onTimeChange(this.prevSecond);
  }

  private emitChanges(): void {
    if (this.score !== this.prevScore) {
      this.prevScore = this.score;
      this.callbacks.onScoreChange(this.score);
    }
    if (this.player.health !== this.prevHealth) {
      this.prevHealth = this.player.health;
      this.callbacks.onHealthChange(this.player.health);
    }
    const sec = Math.max(0, Math.ceil(this.timeLeft));
    if (sec !== this.prevSecond) {
      this.prevSecond = sec;
      this.callbacks.onTimeChange(sec);
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.initialized) this.teardown();
  }

  private teardown(): void {
    if (this.tornDown) return;
    this.tornDown = true;
    stopAmbience();
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("keydown", this.onPauseKey);
    this.input.destroy();

    this.app.destroy(true, { children: true, texture: false });
  }
}
