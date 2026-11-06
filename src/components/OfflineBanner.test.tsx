import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OfflineBanner } from "./OfflineBanner";
import { offlineActionQueue } from "@/lib/offlineActionQueue";
import { getDictionary } from "@/i18n";
vi.mock("@/hooks/useOnlineStatus", () => ({ useOnlineStatus: () => ({ isOnline: true }) }));
vi.mock("@/components/LocaleProvider", () => ({ useDictionary: () => getDictionary("pl") }));
vi.mock("@/components/AppDialogProvider", () => ({
  useAppDialog: () => ({ confirm: async () => true }),
}));
vi.mock("@/lib/offlineActionQueue", () => ({
  offlineActionQueue: {
    getCount: vi.fn(async () => 1),
    getAll: vi.fn(async () => [
      {
        id: "conflict",
        type: "save_note",
        protocolVersion: 2,
        payload: { sessionId: 5 },
        retryCount: 5,
        maxRetries: 5,
      },
    ]),
    remove: vi.fn(async () => {}),
    updateRetry: vi.fn(async () => {}),
    flushAll: vi.fn(async () => {}),
  },
}));
describe("OfflineBanner", () => {
  it("shows an online conflict and discards only after confirmation", async () => {
    render(<OfflineBanner />);
    await screen.findByText("Synchronizacja wymaga uwagi");
    expect(screen.getByText("Zapisz kopię")).toBeTruthy();
    fireEvent.click(screen.getByText("Odrzuć"));
    await waitFor(() => expect(offlineActionQueue.remove).toHaveBeenCalledWith("conflict"));
  });
});
