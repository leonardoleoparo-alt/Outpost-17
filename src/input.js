export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = { x: 0, y: 0, inside: false };
    this.onPrimary = null;
    this.onCancel = null;
    this.onEscape = null;
    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointermove', (event) => {
      const point = this.toCanvasPoint(event.clientX, event.clientY);
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.inside = point.inside;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.mouse.inside = false;
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const point = this.toCanvasPoint(event.clientX, event.clientY);
      this.onPrimary?.(point);
    });

    this.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.onCancel?.();
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.onEscape?.();
      }
    });
  }

  toCanvasPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / this.canvas.width, rect.height / this.canvas.height);
    const renderedWidth = this.canvas.width * scale;
    const renderedHeight = this.canvas.height * scale;
    const offsetX = rect.left + (rect.width - renderedWidth) / 2;
    const offsetY = rect.top + (rect.height - renderedHeight) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale,
      inside: clientX >= offsetX && clientX <= offsetX + renderedWidth && clientY >= offsetY && clientY <= offsetY + renderedHeight
    };
  }
}
