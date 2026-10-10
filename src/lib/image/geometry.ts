// Pure size math for the image pipeline. Canvas work lives in canvasJpeg.ts.

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

// The server resizes to ~1,500 px; 2,000 px keeps uploads small without
// throwing away detail it would still use.
export const DEFAULT_MAX_EDGE = 2000;
export const DEFAULT_JPEG_QUALITY = 0.85;

function assertPositive(value: number, name: string): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
}

export function fitWithin(size: Size, maxEdge: number): Size {
  assertPositive(size.width, "width");
  assertPositive(size.height, "height");
  assertPositive(maxEdge, "maxEdge");
  const scale = Math.min(1, maxEdge / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

// The centred region `object-fit: cover` shows for a box of this aspect.
export function coverCrop(source: Size, aspect: number): Rect {
  assertPositive(source.width, "width");
  assertPositive(source.height, "height");
  assertPositive(aspect, "aspect");
  const sourceAspect = source.width / source.height;
  if (sourceAspect > aspect) {
    const width = Math.round(source.height * aspect);
    return { x: Math.round((source.width - width) / 2), y: 0, width, height: source.height };
  }
  const height = Math.round(source.width / aspect);
  return { x: 0, y: Math.round((source.height - height) / 2), width: source.width, height };
}
