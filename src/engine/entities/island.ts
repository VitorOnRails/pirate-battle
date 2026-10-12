import { BlurFilter, ColorMatrixFilter, Container, Sprite } from "pixi.js";
import { tex, type AssetAlias } from "../assets";

const FOLIAGE: AssetAlias[] = ["foliage_1", "foliage_2", "foliage_3"];

function tintSilhouette(r: number, g: number, b: number): ColorMatrixFilter {
  const f = new ColorMatrixFilter();

  f.matrix = [0, 0, 0, 0, r, 0, 0, 0, 0, g, 0, 0, 0, 0, b, 0, 0, 0, 1, 0];
  return f;
}

export class Island {
  readonly view = new Container();
  readonly x: number;
  readonly y: number;
  readonly halfW: number;
  readonly halfH: number;

  constructor(def: {
    x: number;
    y: number;
    width: number;
    sprite: AssetAlias;
    structure?: "ruins";
  }) {
    const texture = tex(def.sprite);
    const scale = def.width / texture.width;
    const flip = Math.random() < 0.5 ? -1 : 1;

    const foam = new Sprite(texture);
    foam.anchor.set(0.5);
    foam.scale.set(scale * 1.1);
    foam.scale.x *= flip;
    foam.filters = [tintSilhouette(0.62, 0.83, 0.93), new BlurFilter({ strength: 10 })];
    foam.alpha = 0.4;

    const island = new Sprite(texture);
    island.anchor.set(0.5);
    island.scale.set(scale);
    island.scale.x *= flip;

    this.view.addChild(foam, island);

    const w = Math.abs(island.width);
    const h = island.height;
    this.scatterFoliage(def.sprite, w, h);
    if (def.structure === "ruins") this.addRuins(w, h);

    this.view.x = def.x;
    this.view.y = def.y;
    this.x = def.x;
    this.y = def.y;
    this.halfW = w * 0.48;
    this.halfH = h * 0.48;
  }

  private scatterFoliage(sprite: AssetAlias, w: number, h: number): void {
    if (sprite !== "island_grass") return;
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const deco = new Sprite(tex(FOLIAGE[Math.floor(Math.random() * FOLIAGE.length)]));
      deco.anchor.set(0.5);
      const s = 0.35 + Math.random() * 0.4;
      deco.scale.set(s * (Math.random() < 0.5 ? -1 : 1), s);
      deco.rotation = (Math.random() - 0.5) * 0.8;
      deco.x = (Math.random() - 0.5) * w * 0.55;
      deco.y = (Math.random() - 0.5) * h * 0.55;
      this.view.addChild(deco);
    }
  }

  private addRuins(w: number, h: number): void {
    const place = (alias: AssetAlias, rel: number, dx: number, dy: number): void => {
      const tower = new Sprite(tex(alias));
      tower.anchor.set(0.5);
      tower.scale.set((w * rel) / tower.texture.width);
      tower.tint = 0xcad2c2;
      tower.x = dx * w;
      tower.y = dy * h;
      this.view.addChild(tower);
    };
    place("tower_1", 0.34, -0.22, -0.14);
    place("tower_2", 0.24, 0.24, 0.18);
  }
}
