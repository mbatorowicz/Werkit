"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useDictionary } from "@/components/LocaleProvider";
import { SURFACE_CARD, SURFACE_MINT } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";
import {
  fetchCredentialsWithBiometricPrompt,
  hasSavedBiometricCredentials,
  isNativeBiometricContext,
} from "@/lib/biometricLogin";
import { LoginCardContent } from "./LoginCardContent";

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
        <LoginCardContent
          loading={loading}
          error={error}
          bioOffered={bioOffered}
          onBiometricLogin={() => void handleBiometricLogin()}
          onSubmit={handleSubmit}
        />
      </div>

      <p className="text-zinc-600 text-xs mt-10 font-medium">&copy; {new Date().getFullYear()}</p>
    </div>
  );
}
