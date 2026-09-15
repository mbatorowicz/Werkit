import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { readViewportOrientation, useViewportOrientation } from "@/hooks/useViewportOrientation";

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

describe("useViewportOrientation", () => {
  it("nie zapętla renderów — getSnapshot jest referencyjnie stabilny", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) =>
        ({
          matches: query.includes("orientation: landscape")
            ? window.innerWidth > window.innerHeight
            : window.innerWidth < 1024,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
          onchange: null,
        }) as MediaQueryList,
    });

    let renders = 0;
    function Probe() {
      renders += 1;
      useViewportOrientation();
      return <span data-testid="renders">{renders}</span>;
    }

    const { getByTestId } = render(<Probe />);
    expect(Number(getByTestId("renders").textContent)).toBeLessThan(5);
    expect(renders).toBeLessThan(5);
  });
});
