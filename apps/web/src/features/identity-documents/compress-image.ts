// Long edge and JPEG quality keep small print on ID cards legible for hotel
// staff while bringing a typical 3–6 MB phone photo down to a few hundred KB.
export const MAX_IMAGE_EDGE = 2000;
export const JPEG_QUALITY = 0.85;

export const UPLOADABLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class ImageDecodeError extends Error {
  constructor() {
    super("This photo format is not supported. Use a JPEG or PNG photo.");
    this.name = "ImageDecodeError";
  }
}

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// The original only wins when it is both smaller and a type the server accepts;
// otherwise the re-encoded JPEG is the only uploadable option.
export function pickSmallerFile(original: File, compressed: File): File {
  return UPLOADABLE_IMAGE_TYPES.has(original.type) &&
    original.size <= compressed.size
    ? original
    : compressed;
}

export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageDecodeError();
  }

  try {
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      MAX_IMAGE_EDGE,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    // JPEG has no alpha channel; paint transparent PNG areas white, not black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    const compressed = new File([blob], jpegFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    return pickSmallerFile(file, compressed);
  } finally {
    bitmap.close();
  }
}

function jpegFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "document";
  return `${base}.jpg`;
}
