import type { WorkerAlarmKind } from "@/features/worker/lib/workerAlarmTypes";
import {
  getNotificationSoundSettings,
  isNotificationSoundEnabled,
} from "@/features/worker/lib/workerNotificationPrefs";
import type { NotificationSoundPresetId } from "@/features/worker/lib/workerNotificationSoundPresets";
import { getPublicSoundUrl } from "@/features/worker/lib/workerNotificationSoundPresets";

const LOOP_INTERVAL_MS = 3_500;
const MAX_GAIN = 0.55;

let audioContext: AudioContext | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let loopStopRequested = false;
let htmlAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

function normalizedVolume(): number {
  const { volume } = getNotificationSoundSettings();
  return (volume / 100) * MAX_GAIN;
}

function scheduleTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  gainValue: number,
  type: OscillatorType = "sine",
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0001), startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.05);
}

function playWebAudioPreset(
  ctx: AudioContext,
  presetId: NotificationSoundPresetId,
  gainValue: number,
  when = ctx.currentTime,
): void {
  switch (presetId) {
    case "classic":
      scheduleTone(ctx, 440, when, 0.16, gainValue);
      scheduleTone(ctx, 440, when + 0.28, 0.16, gainValue);
      break;
    case "bell":
      scheduleTone(ctx, 523, when, 0.22, gainValue);
      scheduleTone(ctx, 659, when + 0.24, 0.28, gainValue);
      scheduleTone(ctx, 784, when + 0.52, 0.34, gainValue);
      break;
    case "urgent":
      scheduleTone(ctx, 880, when, 0.12, gainValue, "square");
      scheduleTone(ctx, 880, when + 0.18, 0.12, gainValue, "square");
      scheduleTone(ctx, 880, when + 0.36, 0.12, gainValue, "square");
      scheduleTone(ctx, 660, when + 0.58, 0.2, gainValue * 0.9, "square");
      break;
    case "soft":
      scheduleTone(ctx, 330, when, 0.55, gainValue * 0.85);
      scheduleTone(ctx, 392, when + 0.45, 0.45, gainValue * 0.75);
      break;
    case "chime":
      scheduleTone(ctx, 523, when, 0.18, gainValue);
      scheduleTone(ctx, 659, when + 0.2, 0.18, gainValue);
      scheduleTone(ctx, 784, when + 0.4, 0.18, gainValue);
      scheduleTone(ctx, 988, when + 0.62, 0.28, gainValue);
      break;
    default:
      scheduleTone(ctx, 440, when, 0.16, gainValue);
  }
}

function stopHtmlAudio(): void {
  if (!htmlAudio) return;
  htmlAudio.pause();
  htmlAudio.currentTime = 0;
  htmlAudio = null;
}

export function stopAlarmSound(): void {
  loopStopRequested = true;
  if (loopTimer != null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  stopHtmlAudio();
}

async function playSampleOnce(presetId: NotificationSoundPresetId, gainValue: number): Promise<void> {
  stopHtmlAudio();
  const url = getPublicSoundUrl(presetId);
  const audio = new Audio(url);
  audio.volume = Math.min(1, gainValue / MAX_GAIN);
  htmlAudio = audio;
  try {
    await audio.play();
  } catch {
    const ctx = getAudioContext();
    if (!ctx) return;
    await ctx.resume();
    playWebAudioPreset(ctx, presetId, gainValue);
  }
}

export async function previewAlarmSound(
  kind: WorkerAlarmKind,
  presetOverride?: NotificationSoundPresetId,
): Promise<void> {
  if (!isNotificationSoundEnabled()) return;
  const presetId = presetOverride ?? getNotificationSoundSettings().presets[kind];
  await playSampleOnce(presetId, normalizedVolume());
}

export function startAlarmSoundLoop(kind: WorkerAlarmKind): void {
  stopAlarmSound();
  if (!isNotificationSoundEnabled()) return;

  loopStopRequested = false;
  const presetId = getNotificationSoundSettings().presets[kind];

  const tick = () => {
    if (loopStopRequested) return;
    void playSampleOnce(presetId, normalizedVolume());
    loopTimer = setTimeout(tick, LOOP_INTERVAL_MS);
  };

  tick();
}
