import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import GpsWarningModal from "@/features/worker/components/Modals/GpsWarningModal";

vi.mock("@/features/worker/gps/backgroundGeolocationSingleton", () => ({
  backgroundGeolocation: { openSettings: vi.fn() },
}));

describe("GpsWarningModal", () => {
  it("pokazuje disclosure lokalizacji w tle i link do polityki", () => {
    renderWithProviders(
      <GpsWarningModal
        showGpsWarning
        setShowGpsWarning={vi.fn()}
        pendingOrderId={null}
        setPendingOrderId={vi.fn()}
        handleAcceptOrder={vi.fn()}
        dict={plDict.worker.client}
      />
    );

    expect(screen.getByText(plDict.worker.client.gpsBackgroundDisclosure)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: plDict.worker.client.gpsPrivacyPolicy })
    ).toHaveAttribute("href", "/privacy-policy");
  });
});
