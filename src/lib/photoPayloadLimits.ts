/** Limity zdjęć sesji (S2) — zdekodowane bajty + allowlista MIME + magic bytes. */

export const PHOTO_MAX_DECODED_BYTES = 4 * 1024 * 1024;

/** Górne ograniczenie długości części base64 (4/3 + padding), zanim wołamy `atob`. */
export const PHOTO_MAX_BASE64_CHARS = Math.ceil(PHOTO_MAX_DECODED_BYTES * (4 / 3)) + 4;

export const PHOTO_ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export type SniffedImageMime = "image/jpeg" | "image/png" | "image/webp";

export function sniffImageMime(bytes: Uint8Array): SniffedImageMime | null {
  if (isJpegMagic(bytes)) return "image/jpeg";
  if (isPngMagic(bytes)) return "image/png";
  if (isWebpMagic(bytes)) return "image/webp";
  return null;
}

function isJpegMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPngMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isWebpMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function canonicalDeclaredMime(declared: string): SniffedImageMime | null {
  if (declared === "image/jpeg" || declared === "image/jpg") return "image/jpeg";
  if (declared === "image/png") return "image/png";
  if (declared === "image/webp") return "image/webp";
  return null;
}

export function photoExtensionForMime(mime: SniffedImageMime): "jpg" | "png" | "webp" {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export type ValidatedPhotoBytes = {
  mimeType: SniffedImageMime;
  bytes: Uint8Array;
  ext: "jpg" | "png" | "webp";
};

export function assertValidatedPhotoBytes(
  declaredMime: string,
  bytes: Uint8Array
): ValidatedPhotoBytes {
  if (!PHOTO_ALLOWED_MIME.has(declaredMime) || bytes.length === 0) {
    throw new Error("invalid_photo_data");
  }
  if (bytes.length > PHOTO_MAX_DECODED_BYTES) {
    throw new Error("invalid_photo_data");
  }
  const sniffed = sniffImageMime(bytes);
  const declared = canonicalDeclaredMime(declaredMime);
  if (!sniffed || !declared || sniffed !== declared) {
    throw new Error("invalid_photo_data");
  }
  return { mimeType: sniffed, bytes, ext: photoExtensionForMime(sniffed) };
}

export function parseAndValidatePhotoDataUrl(base64DataUrl: string): ValidatedPhotoBytes {
  const matches = base64DataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!matches || !matches[1] || !matches[2]) {
    throw new Error("invalid_photo_data");
  }
  const mimeType = matches[1].toLowerCase();
  const b64 = matches[2];
  if (b64.length > PHOTO_MAX_BASE64_CHARS) {
    throw new Error("invalid_photo_data");
  }

  let binaryStr: string;
  try {
    binaryStr = atob(b64);
  } catch {
    throw new Error("invalid_photo_data");
  }

  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return assertValidatedPhotoBytes(mimeType, bytes);
}
