import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/biometricLogin", () => ({
  isNativeBiometricContext: () => false,
  hasSavedBiometricCredentials: vi.fn(async () => false),
  fetchCredentialsWithBiometricPrompt: vi.fn(async () => null),
}));

import LoginPage from "@/app/login/page";

async function fillAndSubmit(usernameEmail: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(plDict.login.usernameLabel), usernameEmail);
  await user.type(screen.getByLabelText(plDict.login.passwordLabel), password);
  await user.click(screen.getByRole("button", { name: plDict.login.submit }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    router.replace.mockClear();
    router.refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderuje formularz logowania z etykietami i18n", () => {
    stubFetch([]);
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(plDict.login.systemLogin)).toBeInTheDocument();
    expect(screen.getByText(plDict.login.subtitle)).toBeInTheDocument();
    expect(screen.getByLabelText(plDict.login.usernameLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(plDict.login.passwordLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: plDict.login.submit })).toBeInTheDocument();
  });

  it("wymaga loginu i hasła (puste pola nie wysyłają żądania)", async () => {
    const fetchMock = stubFetch([]);
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(plDict.login.usernameLabel)).toBeRequired();
    expect(screen.getByLabelText(plDict.login.passwordLabel)).toBeRequired();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: plDict.login.submit }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("po sukcesie z rolą worker wysyła POST /api/auth/login i przekierowuje na /worker", async () => {
    const fetchMock = stubFetch([
      { url: "/api/auth/login", method: "POST", json: { user: { role: "worker" } } },
    ]);
    renderWithProviders(<LoginPage />);

    await fillAndSubmit("janek_k", "1234");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/worker"));
    expect(router.refresh).toHaveBeenCalled();

    const loginCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/api/auth/login")
    );
    expect(loginCall).toBeDefined();
    const init = loginCall?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      usernameEmail: "janek_k",
      password: "1234",
    });
  });

  it("po sukcesie z rolą admin przekierowuje na /admin", async () => {
    stubFetch([{ url: "/api/auth/login", method: "POST", json: { user: { role: "admin" } } }]);
    renderWithProviders(<LoginPage />);

    await fillAndSubmit("szef", "tajne");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
  });

  it("przy błędnych danych pokazuje komunikat z apiErrors i nie przekierowuje", async () => {
    stubFetch([
      {
        url: "/api/auth/login",
        method: "POST",
        status: 401,
        json: { error: "invalid_credentials" },
      },
    ]);
    renderWithProviders(<LoginPage />);

    await fillAndSubmit("janek_k", "zle-haslo");

    expect(await screen.findByText(plDict.apiErrors.invalid_credentials)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("przy nieznanym kodzie błędu pokazuje komunikat generyczny", async () => {
    stubFetch([{ url: "/api/auth/login", method: "POST", status: 500, json: {} }]);
    renderWithProviders(<LoginPage />);

    await fillAndSubmit("janek_k", "1234");

    expect(await screen.findByText(plDict.common.errors.generic)).toBeInTheDocument();
  });

  it("przy błędzie sieci pokazuje komunikat o braku połączenia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    renderWithProviders(<LoginPage />);

    await fillAndSubmit("janek_k", "1234");

    expect(await screen.findByText(plDict.common.errors.network)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
