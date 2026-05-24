import { afterEach, describe, expect, it, vi } from "vitest";
import { computeFloatingPanelStyle } from "@/lib/floatingPanelPosition";

function mockViewport(height: number) {
  vi.stubGlobal("window", {
    visualViewport: { height },
    innerHeight: height,
  });
}

describe("computeFloatingPanelStyle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens downward when there is enough space below", () => {
    mockViewport(800);
    const style = computeFloatingPanelStyle({
      top: 100,
      bottom: 140,
      left: 16,
      right: 300,
      width: 284,
      height: 40,
      x: 16,
      y: 100,
      toJSON: () => ({}),
    });

    expect(style.top).toBe(144);
    expect(style.bottom).toBeUndefined();
    expect(style.maxHeight).toBeGreaterThan(80);
  });

  it("opens upward when space below is tight and above is larger", () => {
    mockViewport(700);
    const style = computeFloatingPanelStyle({
      top: 620,
      bottom: 660,
      left: 16,
      right: 300,
      width: 284,
      height: 40,
      x: 16,
      y: 620,
      toJSON: () => ({}),
    });

    expect(style.bottom).toBeDefined();
    expect(style.top).toBeUndefined();
    expect(style.maxHeight).toBeLessThanOrEqual(224);
  });
});
