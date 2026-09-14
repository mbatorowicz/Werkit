import { describe, expect, it } from "vitest";
import {
  PHOTO_MAX_BASE64_CHARS,
  parseAndValidatePhotoDataUrl,
  sniffImageMime,
} from "@/lib/photoPayloadLimits";

function toDataUrl(mime: string, bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:${mime};base64,${btoa(binary)}`;
}

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const svgish = new Uint8Array([0x3c, 0x73, 0x76, 0x67]); // "<svg"

describe("photoPayloadLimits", () => {
  it("rozpoznaje magic bytes JPEG / PNG / WEBP", () => {
    expect(sniffImageMime(jpegBytes)).toBe("image/jpeg");
    expect(sniffImageMime(pngBytes)).toBe("image/png");
    expect(sniffImageMime(webpBytes)).toBe("image/webp");
    expect(sniffImageMime(svgish)).toBeNull();
  });

  it("akceptuje jpeg/png/webp z zgodnymi magic bytes", () => {
    expect(parseAndValidatePhotoDataUrl(toDataUrl("image/jpeg", jpegBytes)).mimeType).toBe(
      "image/jpeg"
    );
    expect(parseAndValidatePhotoDataUrl(toDataUrl("image/png", pngBytes)).mimeType).toBe(
      "image/png"
    );
    expect(parseAndValidatePhotoDataUrl(toDataUrl("image/webp", webpBytes)).mimeType).toBe(
      "image/webp"
    );
  });

  it("odrzuca image/svg i niespójny MIME vs magic bytes", () => {
    expect(() => parseAndValidatePhotoDataUrl(toDataUrl("image/svg", svgish))).toThrow(
      "invalid_photo_data"
    );
    expect(() => parseAndValidatePhotoDataUrl(toDataUrl("image/svg+xml", svgish))).toThrow(
      "invalid_photo_data"
    );
    expect(() => parseAndValidatePhotoDataUrl(toDataUrl("image/png", jpegBytes))).toThrow(
      "invalid_photo_data"
    );
  });

  it("odrzuca za długi string base64 (ponad 4 MiB zdekodowane)", () => {
    const huge = `data:image/jpeg;base64,${"A".repeat(PHOTO_MAX_BASE64_CHARS + 1)}`;
    expect(() => parseAndValidatePhotoDataUrl(huge)).toThrow("invalid_photo_data");
  });
});
