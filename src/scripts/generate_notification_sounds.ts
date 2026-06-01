/**
 * Generuje pliki WAV dla presetów powiadomień (Android res/raw + public/sounds).
 * Uruchom: npx tsx src/scripts/generate_notification_sounds.ts
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NATIVE_SOUND_FILES,
  NOTIFICATION_SOUND_PRESET_IDS,
  type NotificationSoundPresetId,
} from "../features/worker/lib/workerNotificationSoundPresets";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ANDROID_RAW = join(ROOT, "android/app/src/main/res/raw");
const PUBLIC_SOUNDS = join(ROOT, "public/sounds");

const SAMPLE_RATE = 22_050;

type Tone = {
  freq: number;
  startSec: number;
  durationSec: number;
  gain?: number;
  type?: "sine" | "square";
};

function presetTones(presetId: NotificationSoundPresetId): Tone[] {
  switch (presetId) {
    case "classic":
      return [
        { freq: 440, startSec: 0, durationSec: 0.16 },
        { freq: 440, startSec: 0.28, durationSec: 0.16 },
      ];
    case "bell":
      return [
        { freq: 523, startSec: 0, durationSec: 0.22 },
        { freq: 659, startSec: 0.24, durationSec: 0.28 },
        { freq: 784, startSec: 0.52, durationSec: 0.34 },
      ];
    case "urgent":
      return [
        { freq: 880, startSec: 0, durationSec: 0.12, type: "square" },
        { freq: 880, startSec: 0.18, durationSec: 0.12, type: "square" },
        { freq: 880, startSec: 0.36, durationSec: 0.12, type: "square" },
        { freq: 660, startSec: 0.58, durationSec: 0.2, type: "square", gain: 0.85 },
      ];
    case "soft":
      return [
        { freq: 330, startSec: 0, durationSec: 0.55, gain: 0.75 },
        { freq: 392, startSec: 0.45, durationSec: 0.45, gain: 0.65 },
      ];
    case "chime":
      return [
        { freq: 523, startSec: 0, durationSec: 0.18 },
        { freq: 659, startSec: 0.2, durationSec: 0.18 },
        { freq: 784, startSec: 0.4, durationSec: 0.18 },
        { freq: 988, startSec: 0.62, durationSec: 0.28 },
      ];
    default:
      return [{ freq: 440, startSec: 0, durationSec: 0.16 }];
  }
}

function renderPreset(presetId: NotificationSoundPresetId): Float32Array {
  const durationSec =
    Math.max(...presetTones(presetId).map((t) => t.startSec + t.durationSec)) + 0.08;
  const length = Math.ceil(durationSec * SAMPLE_RATE);
  const buffer = new Float32Array(length);

  for (const tone of presetTones(presetId)) {
    const startSample = Math.floor(tone.startSec * SAMPLE_RATE);
    const durationSamples = Math.floor(tone.durationSec * SAMPLE_RATE);
    const peak = tone.gain ?? 0.55;
    for (let i = 0; i < durationSamples; i += 1) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 6);
      const phase = 2 * Math.PI * tone.freq * t;
      const sample =
        tone.type === "square"
          ? Math.sign(Math.sin(phase)) * peak * env
          : Math.sin(phase) * peak * env;
      const idx = startSample + i;
      if (idx < buffer.length) buffer[idx] += sample;
    }
  }

  let max = 0;
  for (const v of buffer) max = Math.max(max, Math.abs(v));
  if (max > 0.98) {
    const scale = 0.98 / max;
    for (let i = 0; i < buffer.length; i += 1) buffer[i] *= scale;
  }
  return buffer;
}

function encodeWav(samples: Float32Array): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

function main(): void {
  mkdirSync(ANDROID_RAW, { recursive: true });
  mkdirSync(PUBLIC_SOUNDS, { recursive: true });

  for (const presetId of NOTIFICATION_SOUND_PRESET_IDS) {
    const filename = NATIVE_SOUND_FILES[presetId];
    const androidPath = join(ANDROID_RAW, filename);
    const publicPath = join(PUBLIC_SOUNDS, filename);

    if (presetId === "classic" && existsSync(androidPath)) {
      copyFileSync(androidPath, publicPath);
      console.log(`Skopiowano istniejący ${filename} → public/sounds/`);
      continue;
    }

    const wav = encodeWav(renderPreset(presetId));
    writeFileSync(androidPath, wav);
    writeFileSync(publicPath, wav);
    console.log(`Wygenerowano ${filename}`);
  }
}

main();
