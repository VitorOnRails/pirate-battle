export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export function circleRectOverlap(
  cx: number,
  cy: number,
  cr: number,
  rx: number,
  ry: number,
  hw: number,
  hh: number,
): boolean {
  const dx = Math.abs(cx - rx) - hw;
  const dy = Math.abs(cy - ry) - hh;
  if (dx > cr || dy > cr) return false;
  if (dx <= 0 || dy <= 0) return true;
  return dx * dx + dy * dy <= cr * cr;
}

export function pushOutOfRect(
  px: number,
  py: number,
  pr: number,
  rx: number,
  ry: number,
  hw: number,
  hh: number,
): { x: number; y: number } {
  const ex = hw + pr;
  const ey = hh + pr;
  const dx = px - rx;
  const dy = py - ry;
  if (Math.abs(dx) >= ex || Math.abs(dy) >= ey) return { x: px, y: py };

  const penX = ex - Math.abs(dx);
  const penY = ey - Math.abs(dy);
  if (penX < penY) {
    return { x: rx + (dx < 0 ? -ex : ex), y: py };
  }
  return { x: px, y: ry + (dy < 0 ? -ey : ey) };
}
