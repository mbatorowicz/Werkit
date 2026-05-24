import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getNotificationSoundSettings,
  saveNotificationSoundSettings,
  setNotificationSoundEnabled,
  setNotificationSoundVolume,
  setSoundPresetForKind,
} from "./workerNotificationPrefs";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("workerNotificationPrefs", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  it("returns defaults when storage is empty", () => {
    const settings = getNotificationSoundSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.volume).toBe(85);
    expect(settings.presets.time_overrun).toBe("urgent");
    expect(settings.presets.order_overdue).toBe("bell");
    expect(settings.presets.order_upcoming).toBe("soft");
  });

  it("migrates legacy enabled flag", () => {
    localStorage.setItem("werkit_notification_sound_enabled", "false");
    expect(getNotificationSoundSettings().enabled).toBe(false);
  });

  it("persists volume and presets", () => {
    setNotificationSoundEnabled(false);
    setNotificationSoundVolume(40);
    setSoundPresetForKind("time_overrun", "chime");

    const settings = getNotificationSoundSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.volume).toBe(40);
    expect(settings.presets.time_overrun).toBe("chime");
    expect(localStorage.getItem("werkit_notification_sound_enabled")).toBe("false");
  });

  it("clamps invalid volume", () => {
    saveNotificationSoundSettings({ volume: 150 });
    expect(getNotificationSoundSettings().volume).toBe(100);
    saveNotificationSoundSettings({ volume: -10 });
    expect(getNotificationSoundSettings().volume).toBe(0);
  });
});
