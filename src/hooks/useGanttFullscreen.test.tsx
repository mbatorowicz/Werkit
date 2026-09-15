import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGanttFullscreen } from "@/hooks/useGanttFullscreen";

describe("useGanttFullscreen", () => {
  it("otwiera overlay automatycznie na wąskim ekranie w poziomie", () => {
    const { result } = renderHook(() => useGanttFullscreen(true, true, false));
    expect(result.current.fullscreenOpen).toBe(true);
  });

  it("w pionie zostaje zamknięty, dopóki użytkownik nie otworzy ręcznie", () => {
    const { result } = renderHook(() => useGanttFullscreen(true, false, true));
    expect(result.current.fullscreenOpen).toBe(false);
    act(() => result.current.openFullscreen());
    expect(result.current.fullscreenOpen).toBe(true);
  });

  it("zamknięcie w poziomie blokuje auto-otwarcie do zmiany orientacji", () => {
    const { result, rerender } = renderHook(
      ({ landscape, portrait }) => useGanttFullscreen(true, landscape, portrait),
      { initialProps: { landscape: true, portrait: false } }
    );
    expect(result.current.fullscreenOpen).toBe(true);
    act(() => result.current.closeFullscreen());
    expect(result.current.fullscreenOpen).toBe(false);

    rerender({ landscape: false, portrait: true });
    rerender({ landscape: true, portrait: false });
    expect(result.current.fullscreenOpen).toBe(true);
  });

  it("na desktopie (nie-narrow) overlay jest wyłączony", () => {
    const { result } = renderHook(() => useGanttFullscreen(false, true, false));
    expect(result.current.fullscreenOpen).toBe(false);
  });
});
