export interface GameConfig {
  viewport: {
    width: number;
    height: number;
  };
  arena: {
    width: number;
    height: number;
    background: number;
  };
  player: {
    health: number;
    moveSpeed: number;
    rotationSpeed: number;
    radius: number;
  };
  projectile: {
    speed: number;
    damage: number;
    lifetime: number;
    radius: number;
  };
  weapons: {
    frontCooldown: number;
    lateralCooldown: number;
    lateralSpacing: number;
  };
  enemy: {
    chaser: {
      health: number;
      moveSpeed: number;
      radius: number;
      contactDamage: number;
    };
    shooter: {
      health: number;
      moveSpeed: number;
      radius: number;
      preferredRange: number;
      rangeTolerance: number;
      fireCooldown: number;
      projectileSpeed: number;
      projectileDamage: number;
    };
  };
  spawn: {
    interval: number;
    maxEnemies: number;
    shooterChance: number;
  };
  scoring: {
    pointsPerKill: number;
  };
  match: {
    duration: number;
  };
  islands: {
    x: number;
    y: number;
    width: number;
    sprite: "island_grass" | "island_sand";
    structure?: "ruins";
  }[];
}

export const config: GameConfig = {
  viewport: {
    width: 1280,
    height: 720,
  },
  arena: {
    width: 2200,
    height: 1400,
    background: 0x0a3d62,
  },
  player: {
    health: 100,
    moveSpeed: 240,
    rotationSpeed: 2.8,
    radius: 32,
  },
  projectile: {
    speed: 440,
    damage: 25,
    lifetime: 1.6,
    radius: 8,
  },
  weapons: {
    frontCooldown: 0.35,
    lateralCooldown: 0.7,
    lateralSpacing: 32,
  },
  enemy: {
    chaser: {
      health: 50,
      moveSpeed: 80,
      radius: 32,
      contactDamage: 20,
    },
    shooter: {
      health: 40,
      moveSpeed: 60,
      radius: 32,
      preferredRange: 320,
      rangeTolerance: 40,
      fireCooldown: 1.6,
      projectileSpeed: 300,
      projectileDamage: 12,
    },
  },
  spawn: {
    interval: 3,
    maxEnemies: 14,
    shooterChance: 0.5,
  },
  scoring: {
    pointsPerKill: 1,
  },
  match: {
    duration: 90,
  },
  islands: [
    { x: 330, y: 300, width: 300, sprite: "island_grass" },
    { x: 820, y: 230, width: 220, sprite: "island_sand" },
    { x: 1500, y: 280, width: 320, sprite: "island_grass", structure: "ruins" },
    { x: 1950, y: 560, width: 240, sprite: "island_sand" },
    { x: 250, y: 820, width: 260, sprite: "island_grass" },
    { x: 1120, y: 1080, width: 300, sprite: "island_grass" },
    { x: 620, y: 1150, width: 230, sprite: "island_sand" },
    { x: 1720, y: 1120, width: 320, sprite: "island_grass" },
    { x: 2010, y: 1040, width: 200, sprite: "island_sand" },
  ],
};
