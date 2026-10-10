import {
  coverCrop,
  DEFAULT_JPEG_QUALITY,
  DEFAULT_MAX_EDGE,
  fitWithin,
  type Rect,
  type Size,
} from "@/lib/image/geometry";

// Browser-only canvas I/O. The size math is in geometry.ts and unit tested;
// this file is exercised by the Playwright run.

interface Decoded {
  source: CanvasImageSource;
  size: Size;
  close(): void;
}

async function decodeImage(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // from-image applies EXIF orientation, so portrait shots stay upright.
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bitmap, size: { width: bitmap.width, height: bitmap.height }, close: () => bitmap.close() };
    } catch {
      // Older Safari: fall through to <img>.
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return { source: img, size: { width: img.naturalWidth, height: img.naturalHeight }, close: () => {} };
}

async function renderToJpeg(source: CanvasImageSource, crop: Rect, target: Size, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, target.width, target.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("JPEG encode failed"))), "image/jpeg", quality),
    );
  } finally {
    // iOS keeps canvas memory until the size drops to zero.
    canvas.width = 0;
    canvas.height = 0;
  }
}

// Always re-encode: turns HEIC into JPEG, bakes in orientation, drops GPS EXIF.
export async function downscaleToJpeg(blob: Blob, maxEdge = DEFAULT_MAX_EDGE): Promise<Blob> {
  const image = await decodeImage(blob);
  try {
    const full = { x: 0, y: 0, ...image.size };
    return await renderToJpeg(image.source, full, fitWithin(image.size, maxEdge), DEFAULT_JPEG_QUALITY);
  } finally {
    image.close();
  }
}

// Grab exactly what the worker saw: the object-cover crop of the live view.
export async function captureVideoFrame(video: HTMLVideoElement, aspect: number): Promise<Blob> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
    throw new Error("Camera not ready");
  }
  // Read at capture time: iOS swaps these when the phone rotates.
  const crop = coverCrop({ width: video.videoWidth, height: video.videoHeight }, aspect);
  return renderToJpeg(video, crop, fitWithin(crop, DEFAULT_MAX_EDGE), DEFAULT_JPEG_QUALITY);
}
