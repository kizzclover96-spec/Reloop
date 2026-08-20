export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface CompressOptions {
  maxDimension?: number;
  maxBytes?: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

let supportedType: string | null = null;
async function pickOutputType(): Promise<string> {
  if (supportedType) return supportedType;
  const probe = document.createElement("canvas");
  probe.width = 2;
  probe.height = 2;
  const blob = await toBlob(probe, "image/webp", 0.8);
  supportedType = blob && blob.type === "image/webp" ? "image/webp" : "image/jpeg";
  return supportedType;
}

/**
 * Resizes an image file to fit within maxDimension and compresses it (WebP,
 * falling back to JPEG) down toward maxBytes by stepping quality down.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, maxBytes = 1.5 * 1024 * 1024 }: CompressOptions = {}
): Promise<CompressedImage> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(img, 0, 0, width, height);

  const type = await pickOutputType();
  let quality = 0.85;
  let blob = await toBlob(canvas, type, quality);

  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.12;
    blob = await toBlob(canvas, type, quality);
  }

  if (!blob) throw new Error("Couldn't process that image.");
  return { blob, width, height };
}
