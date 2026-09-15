import { describe, expect, it } from "vitest";
import { readViewportOrientation } from "@/hooks/useViewportOrientation";

function fakeWin(
  width: number,
  height: number,
  landscapeMq: boolean
): Pick<Window, "innerWidth" | "innerHeight" | "matchMedia"> {
  return {
    innerWidth: width,
    innerHeight: height,
    matchMedia: (query: string) =>
      ({
        matches: query.includes("orientation: landscape") ? landscapeMq : width < 1024,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }) as MediaQueryList,
  };
}

describe("readViewportOrientation", () => {
  it("traktuje szeroki ekran jako desktop (nie-narrow)", () => {
    expect(readViewportOrientation(fakeWin(1280, 800, true))).toEqual({
      isNarrow: false,
      isLandscape: true,
      isPortrait: false,
    });
  });

  it("telefon w pionie jest narrow + portrait", () => {
    expect(readViewportOrientation(fakeWin(390, 844, false))).toEqual({
      isNarrow: true,
      isLandscape: false,
      isPortrait: true,
    });
  });

  it("telefon w poziomie jest narrow + landscape", () => {
    expect(readViewportOrientation(fakeWin(844, 390, true))).toEqual({
      isNarrow: true,
      isLandscape: true,
      isPortrait: false,
    });
  });
});
