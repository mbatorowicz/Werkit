/**
 * Generuje ikony PWA (PNG 192/512 + maskable + apple-touch)
 * oraz assety Google Play (`store/google-play/`).
 * Uruchom: npx tsx src/scripts/generate_pwa_icons.ts
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = join(ROOT, "public/icons");

const BG = { r: 9, g: 9, b: 11, a: 255 }; // zinc-950
const ACCENT = { r: 16, g: 185, b: 129, a: 255 }; // emerald-500
const WHITE = { r: 255, g: 255, b: 255, a: 255 };

type Rgba = { r: number; g: number; b: number; a: number };

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    rgba.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function setPx(rgba: Buffer, size: number, x: number, y: number, c: Rgba): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  rgba[i] = c.r;
  rgba[i + 1] = c.g;
  rgba[i + 2] = c.b;
  rgba[i + 3] = c.a;
}

function fillRect(
  rgba: Buffer,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: Rgba
): void {
  const xa = Math.max(0, Math.floor(x0));
  const ya = Math.max(0, Math.floor(y0));
  const xb = Math.min(size - 1, Math.ceil(x1));
  const yb = Math.min(size - 1, Math.ceil(y1));
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      setPx(rgba, size, x, y, c);
    }
  }
}

function fillRoundedRect(
  rgba: Buffer,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  c: Rgba
): void {
  const r = Math.max(0, radius);
  fillRect(rgba, size, x0 + r, y0, x1 - r, y1, c);
  fillRect(rgba, size, x0, y0 + r, x1, y1 - r, c);
  const corners: [number, number][] = [
    [x0 + r, y0 + r],
    [x1 - r, y0 + r],
    [x0 + r, y1 - r],
    [x1 - r, y1 - r],
  ];
  const r2 = r * r;
  for (const [cx, cy] of corners) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) setPx(rgba, size, x, y, c);
      }
    }
  }
}

/** Gruba linia (kwadratowe „pióro”) między dwoma punktami. */
function strokeLine(
  rgba: Buffer,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  c: Rgba
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const steps = Math.ceil(len);
  const hw = width / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    fillRect(rgba, size, x - hw, y - hw, x + hw, y + hw, c);
  }
}

function renderIconRgba(size: number, padRatio: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  fillRect(rgba, size, 0, 0, size - 1, size - 1, BG);

  const pad = size * padRatio;
  const inner = size - pad * 2;
  const radius = inner * 0.22;
  fillRoundedRect(rgba, size, pad, pad, size - pad, size - pad, radius, ACCENT);

  const w = inner;
  const left = pad + w * 0.18;
  const right = pad + w * 0.82;
  const top = pad + w * 0.28;
  const bottom = pad + w * 0.74;
  const midY = pad + w * 0.58;
  const midLeft = pad + w * 0.38;
  const midRight = pad + w * 0.62;
  const stroke = Math.max(3, inner * 0.09);

  strokeLine(rgba, size, left, top, midLeft, bottom, stroke, WHITE);
  strokeLine(rgba, size, midLeft, bottom, (left + right) / 2, midY, stroke, WHITE);
  strokeLine(rgba, size, (left + right) / 2, midY, midRight, bottom, stroke, WHITE);
  strokeLine(rgba, size, midRight, bottom, right, top, stroke, WHITE);

  return rgba;
}

function drawIcon(size: number, padRatio: number): Buffer {
  return encodePng(size, size, renderIconRgba(size, padRatio));
}

function blitSquare(
  dst: Buffer,
  dw: number,
  dh: number,
  src: Buffer,
  ss: number,
  dx: number,
  dy: number
): void {
  for (let y = 0; y < ss; y++) {
    for (let x = 0; x < ss; x++) {
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dw || ty >= dh) continue;
      const si = (y * ss + x) * 4;
      const di = (ty * dw + tx) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
}

/** Baner sklepu Google Play: 1024×500, bez przezroczystości. */
function drawFeatureGraphic(): Buffer {
  const w = 1024;
  const h = 500;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    rgba[o] = BG.r;
    rgba[o + 1] = BG.g;
    rgba[o + 2] = BG.b;
    rgba[o + 3] = 255;
  }
  const iconSize = 280;
  const icon = renderIconRgba(iconSize, 0.12);
  blitSquare(rgba, w, h, icon, iconSize, 88, Math.round((h - iconSize) / 2));
  fillRect(rgba, w, 420, 228, 920, 236, ACCENT);
  return encodePng(w, h, rgba);
}

const files: { name: string; size: number; pad: number }[] = [
  { name: "icon-192.png", size: 192, pad: 0.12 },
  { name: "icon-512.png", size: 512, pad: 0.12 },
  { name: "icon-192-maskable.png", size: 192, pad: 0.2 },
  { name: "icon-512-maskable.png", size: 512, pad: 0.2 },
  { name: "apple-touch-icon.png", size: 180, pad: 0.12 },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const file of files) {
  writeFileSync(join(OUT_DIR, file.name), drawIcon(file.size, file.pad));
}

const storeDir = join(ROOT, "store/google-play");
mkdirSync(storeDir, { recursive: true });
writeFileSync(join(storeDir, "icon-512.png"), drawIcon(512, 0.12));
writeFileSync(join(storeDir, "feature-graphic.png"), drawFeatureGraphic());
