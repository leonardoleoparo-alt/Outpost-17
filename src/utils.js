export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const distanceSq = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};
export const distance = (ax, ay, bx, by) => Math.sqrt(distanceSq(ax, ay, bx, by));

export function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return distance(px, py, ax, ay);
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
  return distance(px, py, ax + abx * t, ay + aby * t);
}

export function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function formatMoney(value) {
  return `$${Math.floor(value).toLocaleString('en-US')}`;
}

export function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function circlesOverlap(a, b, padding = 0) {
  const radius = a.radius + b.radius + padding;
  return distanceSq(a.x, a.y, b.x, b.y) < radius * radius;
}
