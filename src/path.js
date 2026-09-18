import { clamp, lerp, pointToSegmentDistance } from './utils.js';

export const PATH_POINTS = Object.freeze([
  { x: -70, y: 170 },
  { x: 300, y: 170 },
  { x: 300, y: 380 },
  { x: 620, y: 380 },
  { x: 620, y: 165 },
  { x: 1000, y: 165 },
  { x: 1000, y: 560 },
  { x: 1260, y: 560 },
  { x: 1260, y: 335 },
  { x: 1462, y: 335 }
]);

export class PathRoute {
  constructor(points = PATH_POINTS, width = 104) {
    this.points = points.map((point) => ({ ...point }));
    this.width = width;
    this.segments = [];
    this.totalLength = 0;
    this.buildSegments();
  }

  buildSegments() {
    this.segments.length = 0;
    this.totalLength = 0;
    for (let i = 0; i < this.points.length - 1; i += 1) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      this.segments.push({ a, b, length, start: this.totalLength });
      this.totalLength += length;
    }
  }

  positionAt(distanceAlong) {
    const d = clamp(distanceAlong, 0, this.totalLength);
    const segment = this.segments.find((item) => d <= item.start + item.length) ?? this.segments.at(-1);
    const t = segment.length === 0 ? 0 : (d - segment.start) / segment.length;
    return {
      x: lerp(segment.a.x, segment.b.x, t),
      y: lerp(segment.a.y, segment.b.y, t),
      angle: Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x)
    };
  }

  distanceFromPoint(x, y) {
    let best = Infinity;
    for (const segment of this.segments) {
      best = Math.min(best, pointToSegmentDistance(x, y, segment.a.x, segment.a.y, segment.b.x, segment.b.y));
    }
    return best;
  }

  containsPoint(x, y, padding = 0) {
    return this.distanceFromPoint(x, y) <= this.width / 2 + padding;
  }

  draw(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.stroke(ctx, this.width + 30, '#4f7348');
    this.stroke(ctx, this.width + 18, '#8f7048');
    this.stroke(ctx, this.width + 8, '#c79a61');
    this.stroke(ctx, this.width, '#d9b278');
    this.stroke(ctx, this.width - 18, '#e1bf87');

    ctx.globalAlpha = .22;
    ctx.setLineDash([4, 13]);
    this.stroke(ctx, this.width - 36, '#b78955');
    ctx.setLineDash([]);

    ctx.globalAlpha = .34;
    ctx.setLineDash([7, 20]);
    this.stroke(ctx, 3, '#8d683e');
    ctx.setLineDash([]);
    ctx.restore();
  }

  stroke(ctx, width, color) {
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i += 1) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}
