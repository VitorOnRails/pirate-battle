import { Assets, Texture } from "pixi.js";

export const ASSET_URLS = {
  water: "/assets/png/default/tiles/tile_73.png",
  island_grass: "/assets/islands/island_grass.png",
  island_sand: "/assets/islands/island_sand.png",
  foliage_1: "/assets/decorations/foliage_1.png",
  foliage_2: "/assets/decorations/foliage_2.png",
  foliage_3: "/assets/decorations/foliage_3.png",
  tower_1: "/assets/structures/tower_1.png",
  tower_2: "/assets/structures/tower_2.png",
  ship_player: "/assets/png/default/ships/ship_1.png",
  ship_chaser: "/assets/png/default/ships/ship_8.png",
  ship_shooter: "/assets/png/default/ships/ship_15.png",
  cannonball: "/assets/png/default/ship_parts/cannon_ball.png",
  explosion_1: "/assets/png/default/effects/explosion_1.png",
  explosion_2: "/assets/png/default/effects/explosion_2.png",
  explosion_3: "/assets/png/default/effects/explosion_3.png",
} as const;

export type AssetAlias = keyof typeof ASSET_URLS;

export const SHIP_SPRITE_OFFSET = -Math.PI / 2;

let registered = false;

export async function loadAssets(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!registered) {
    Assets.add(
      Object.entries(ASSET_URLS).map(([alias, src]) => ({ alias, src })),
    );
    registered = true;
  }
  await Assets.load(Object.keys(ASSET_URLS), onProgress);
}

export function tex(alias: AssetAlias): Texture {
  return Assets.get(alias);
}
