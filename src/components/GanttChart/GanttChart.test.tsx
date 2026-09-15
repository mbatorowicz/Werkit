import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import GanttChart from "@/components/GanttChart/GanttChart";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

describe("GanttChart", () => {
  it("montuje wykres bez pętli renderów", () => {
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

    renderWithProviders(<GanttChart workers={[]} machines={[]} unifiedItems={[]} />);

    expect(screen.getAllByText(plDict.admin.gantt.groupByWorker).length).toBeGreaterThan(0);
  });
});
