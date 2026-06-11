import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { AppDialogProvider } from "@/components/AppDialogProvider";
import { getDictionary, type Locale } from "@/i18n";

/** Słownik pl — do asercji na teksty UI bez hardkodowania stringów w testach. */
export const plDict = getDictionary("pl");

type ProvidersOptions = RenderOptions & {
  locale?: Locale;
};

function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleProvider locale={locale}>
      <AppDialogProvider>{children}</AppDialogProvider>
    </LocaleProvider>
  );
}

/** Render z LocaleProvider (domyślnie pl) i AppDialogProvider — jak w root layout aplikacji. */
export function renderWithProviders(
  ui: ReactElement,
  { locale = "pl", ...options }: ProvidersOptions = {}
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => <Providers locale={locale}>{children}</Providers>,
    ...options,
  });
}

type FetchResponseSpec = {
  /** Dopasowanie po fragmencie URL (string) lub regexem. */
  url: string | RegExp;
  /** Opcjonalne dopasowanie metody HTTP (domyślnie każda). */
  method?: string;
  status?: number;
  json?: unknown;
};

function matchesSpec(spec: FetchResponseSpec, url: string, method: string): boolean {
  const urlOk = typeof spec.url === "string" ? url.includes(spec.url) : spec.url.test(url);
  const methodOk = !spec.method || spec.method.toUpperCase() === method.toUpperCase();
  return urlOk && methodOk;
}

/**
 * Stubuje globalny fetch listą odpowiedzi dopasowywanych po URL/metodzie.
 * Niedopasowane żądanie zwraca 404 z pustym obiektem (i nie wybucha).
 * Zwraca mock — można sprawdzać wywołania (`expect(fetchMock).toHaveBeenCalledWith(...)`).
 */
export function stubFetch(specs: FetchResponseSpec[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const spec = specs.find((s) => matchesSpec(s, url, method));
    const status = spec?.status ?? (spec ? 200 : 404);
    return new Response(JSON.stringify(spec?.json ?? {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
