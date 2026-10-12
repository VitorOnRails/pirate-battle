export interface Obstacle {
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

const LOOKAHEAD = 160;
const SAMPLES = 5;

const TURN_OFFSETS = [0, 0.3, -0.3, 0.6, -0.6, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1];

function feelerClear(
  x: number,
  y: number,
  heading: number,
  obstacles: readonly Obstacle[],
  margin: number,
): boolean {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  for (let i = 1; i <= SAMPLES; i++) {
    const d = (LOOKAHEAD / SAMPLES) * i;
    const px = x + cos * d;
    const py = y + sin * d;
    for (const o of obstacles) {
      if (Math.abs(px - o.x) <= o.halfW + margin && Math.abs(py - o.y) <= o.halfH + margin) {
        return false;
      }
    }
  }
  return true;
}

export function steerAround(
  x: number,
  y: number,
  desired: number,
  obstacles: readonly Obstacle[],
  margin: number,
): number {
  for (const off of TURN_OFFSETS) {
    const heading = desired + off;
    if (feelerClear(x, y, heading, obstacles, margin)) return heading;
  }
  return desired;
}
