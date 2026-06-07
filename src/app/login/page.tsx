"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Fingerprint } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useDictionary } from "@/components/LocaleProvider";
import { BTN_LOGIN_SUBMIT } from "@/lib/uiButtons";
import { FIELD_LABEL, PAGE_SUBTITLE } from "@/lib/uiTypography";
import { INPUT_BASE, SURFACE_CARD, SURFACE_MINT } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";
import {
  fetchCredentialsWithBiometricPrompt,
  hasSavedBiometricCredentials,
  isNativeBiometricContext,
} from "@/lib/biometricLogin";

export default function LoginPage() {
  const router = useRouter();
  const dict = useDictionary();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bioOffered, setBioOffered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isNativeBiometricContext()) return;
      const saved = await hasSavedBiometricCredentials();
      if (!cancelled) setBioOffered(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveApiError = (code?: string) => {
    const apiErrors = dict.apiErrors as Record<string, string>;
    return (code && apiErrors[code]) || code || dict.common.errors.generic;
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const creds = await fetchCredentialsWithBiometricPrompt({
        reason: dict.login.biometricPromptReason,
        title: dict.login.biometricPromptTitle,
        subtitle: dict.login.biometricPromptSubtitle,
        cancel: dict.common.actions.cancel,
      });
      if (!creds) {
        setLoading(false);
        return;
      }
      const res = await fetchWithDeviceTelemetry(
        "Auth: login POST (biometric)",
        "/api/auth/login",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usernameEmail: creds.username,
            password: creds.password,
          }),
        },
        { category: "auth" }
      );
      const data = (await res.json()) as { error?: string; user?: { role?: string } };
      if (res.ok) {
        router.refresh();
        router.replace(data.user?.role === "admin" ? "/admin" : "/worker");
      } else {
        setError(resolveApiError(data.error));
      }
    } catch {
      setError(dict.common.errors.network);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const usernameEmail = formData.get("usernameEmail");
    const password = formData.get("password");

    try {
      const res = await fetchWithDeviceTelemetry(
        "Auth: login POST (form)",
        "/api/auth/login",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameEmail, password }),
        },
        { category: "auth" }
      );

      const data = (await res.json()) as { error?: string; user?: { role?: string } };

      if (res.ok) {
        router.refresh();
        router.replace(data.user?.role === "admin" ? "/admin" : "/worker");
      } else {
        setError(resolveApiError(data.error));
      }
    } catch {
      setError(dict.common.errors.network);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col justify-center items-center p-4 selection:bg-zinc-800 relative",
        SURFACE_MINT
      )}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div
        className={cn(
          "w-full max-w-md border rounded-lg shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] p-8",
          SURFACE_CARD,
          "border-zinc-200 dark:border-zinc-700"
        )}
      >
        <div className="mb-8 text-center pt-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">
              WERKIT
            </h1>
            <span className="text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold mt-1">
              v{APP_VERSION}
            </span>
          </div>
          <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 tracking-tight">
            {dict.login.systemLogin}
          </h2>
          <p className={cn(PAGE_SUBTITLE, "mt-1")}>{dict.login.subtitle}</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {bioOffered && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleBiometricLogin()}
              className="w-full mb-6 flex justify-center items-center gap-2 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium rounded-lg px-4 py-3.5 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  {dict.login.biometricLogin}
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500 mb-6 uppercase tracking-wider">
              {dict.login.biometricDivider}
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className={FIELD_LABEL} htmlFor="username">
              {dict.login.usernameLabel}
            </label>
            <input
              id="username"
              name="usernameEmail"
              type="text"
              required
              className={cn(INPUT_BASE, "py-3.5 placeholder-zinc-500")}
              placeholder={dict.login.usernamePlaceholder}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <label className={FIELD_LABEL} htmlFor="password">
              {dict.login.passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={cn(INPUT_BASE, "py-3.5 placeholder-zinc-500")}
              placeholder={dict.login.passwordPlaceholder}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className={cn(BTN_LOGIN_SUBMIT, "mt-2")}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : dict.login.submit}
          </button>
        </form>
      </div>

      <p className="text-zinc-600 text-xs mt-10 font-medium">&copy; {new Date().getFullYear()}</p>
    </div>
  );
}
