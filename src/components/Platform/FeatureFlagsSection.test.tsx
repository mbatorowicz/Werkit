import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/types/featureFlags";
import { PLAN_PRESET_FLAGS } from "@/lib/companyLifecycle";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const dict = plDict.platform.settings;

function flagsResponse(overrides: Partial<FeatureFlags> = {}) {
  return { flags: { ...DEFAULT_FEATURE_FLAGS, ...overrides } };
}

/** Checkboxy w kolejności renderu: 5 GPS + 1 DUR. */
async function findToggles() {
  await screen.findByText(dict.subtitle);
  const checkboxes = screen.getAllByRole("checkbox");
  return {
    tracking: checkboxes[0],
    map: checkboxes[1],
    geofence: checkboxes[2],
    route: checkboxes[3],
    nav: checkboxes[4],
    dur: checkboxes[5],
  };
}

describe("FeatureFlagsSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pobiera flagi GET-em i renderuje niezależne przełączniki GPS", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
    ]);
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { tracking, map, geofence, dur } = await findToggles();
    expect(tracking).toBeChecked();
    expect(map).toBeChecked();
    expect(geofence).toBeChecked();
    expect(dur).not.toBeChecked();
    expect(screen.getByText(dict.gpsTrackingEnabled)).toBeInTheDocument();
    expect(screen.getByText(dict.geofencingEnabled)).toBeInTheDocument();
    expect(screen.getByText(dict.durEnabledHint)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/platform/feature-flags/5",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("GET z wyłączonym śledzeniem odznacza tylko GPS tracking", async () => {
    stubFetch([
      {
        url: "/api/platform/feature-flags/5",
        method: "GET",
        json: flagsResponse({ gpsTrackingEnabled: false }),
      },
    ]);
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { tracking, map, geofence } = await findToggles();
    expect(tracking).not.toBeChecked();
    expect(map).toBeChecked();
    expect(geofence).toBeChecked();
  });

  it("GET z wyłączonym geofence zostawia śledzenie włączone", async () => {
    stubFetch([
      {
        url: "/api/platform/feature-flags/5",
        method: "GET",
        json: flagsResponse({ geofencingEnabled: false }),
      },
    ]);
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { tracking, geofence } = await findToggles();
    expect(tracking).toBeChecked();
    expect(geofence).not.toBeChecked();
  });

  it("przełączenie modułu DUR wysyła PUT z patchem i pokazuje komunikat sukcesu", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { dur } = await findToggles();
    await user.click(dur);

    expect(await screen.findByText(dict.saveSuccess)).toBeInTheDocument();
    expect(dur).toBeChecked();

    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      durEnabled: true,
      planKey: "custom",
    });
  });

  it("wyłączenie geofence wysyła PUT tylko z geofencingEnabled", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { geofence, tracking } = await findToggles();
    await user.click(geofence);

    await screen.findByText(dict.saveSuccess);
    expect(tracking).toBeChecked();
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      geofencingEnabled: false,
      planKey: "custom",
    });
  });

  it("przy błędzie PUT wycofuje zmianę flagi i pokazuje komunikat błędu", async () => {
    stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", status: 500, json: {} },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { dur } = await findToggles();
    await user.click(dur);

    expect(await screen.findByText(dict.saveError)).toBeInTheDocument();
    await waitFor(() => expect(dur).not.toBeChecked());
  });

  it("przy błędzie PUT ze znanym kodem pokazuje komunikat z apiErrors", async () => {
    stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      {
        url: "/api/platform/feature-flags/5",
        method: "PUT",
        status: 400,
        json: { error: "save_error" },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { dur } = await findToggles();
    await user.click(dur);

    expect(await screen.findByText(plDict.apiErrors.save_error)).toBeInTheDocument();
  });

  it("preset yard wysyła pełny zestaw flag DUR on / GPS off i planKey", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    await screen.findByText(dict.subtitle);
    await user.click(screen.getByRole("button", { name: dict.planYard }));

    expect(await screen.findByText(dict.saveSuccess)).toBeInTheDocument();
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      ...PLAN_PRESET_FLAGS.yard,
      planKey: "yard",
    });
  });
});
