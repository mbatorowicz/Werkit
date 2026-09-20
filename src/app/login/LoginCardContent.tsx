"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { useDictionary } from "@/components/LocaleProvider";
import { formatDict } from "@/i18n";
import { BTN_LOGIN_SUBMIT, BTN_SOFT_PRIMARY } from "@/lib/uiButtons";
import { BRAND_WORDMARK_LG, FIELD_LABEL, PAGE_SUBTITLE } from "@/lib/uiTypography";
import { CONTROL_MIN_H, SURFACE_MINT_INPUT, TEXT_PRIMARY } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";

type Props = {
  loading: boolean;
  error: string;
  bioOffered: boolean;
  onBiometricLogin: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

/** Pole logowania — mocniejsza ramka + emerald focus, czerwony stan błędu. */
function loginInputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border px-4 py-3 text-sm outline-none transition",
    CONTROL_MIN_H,
    SURFACE_MINT_INPUT,
    TEXT_PRIMARY,
    "placeholder-zinc-400 dark:placeholder-zinc-500",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/40 dark:border-red-500/70"
      : "border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-600"
  );
}

export function LoginCardContent({
  loading,
  error,
  bioOffered,
  onBiometricLogin,
  onSubmit,
}: Props) {
  const dict = useDictionary();
  const [showPassword, setShowPassword] = useState(false);
  const errorId = useId();
  const hasError = Boolean(error);

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className={cn(BRAND_WORDMARK_LG, "mb-3")}>{dict.common.app.name.toUpperCase()}</h1>
        <h2 className="text-lg font-medium tracking-tight text-zinc-700 dark:text-zinc-300">
          {dict.login.systemLogin}
        </h2>
        <p className={cn(PAGE_SUBTITLE, "mt-1")}>{dict.login.subtitle}</p>
      </div>

      {bioOffered && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onBiometricLogin}
            className={cn(BTN_SOFT_PRIMARY, "mb-4")}
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
          <p className="mb-4 text-center text-xs uppercase tracking-wider text-zinc-500">
            {dict.login.biometricDivider}
          </p>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className={FIELD_LABEL} htmlFor="username">
            {dict.login.usernameLabel}
          </label>
          <input
            id="username"
            name="usernameEmail"
            type="text"
            required
            aria-invalid={hasError}
            className={loginInputClass(hasError)}
            placeholder={dict.login.usernamePlaceholder}
            autoComplete="username"
          />
        </div>

        <div className="space-y-1.5">
          <label className={FIELD_LABEL} htmlFor="password">
            {dict.login.passwordLabel}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className={cn(loginInputClass(hasError), "pr-11")}
              placeholder={dict.login.passwordPlaceholder}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-1.5 my-auto flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
              aria-label={showPassword ? dict.login.hidePassword : dict.login.showPassword}
              title={showPassword ? dict.login.hidePassword : dict.login.showPassword}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {hasError && (
            <p
              id={errorId}
              role="alert"
              className="text-sm font-medium text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className={cn(BTN_LOGIN_SUBMIT, "mt-1")}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : dict.login.submit}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-1.5">
        <a
          href="/privacy-policy"
          className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {dict.login.privacyPolicy}
        </a>
        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
          {formatDict(dict.login.versionLabel, { version: APP_VERSION })}
        </span>
      </div>
    </>
  );
}
