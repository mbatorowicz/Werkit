"use client";

import { Loader2, Fingerprint } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { useDictionary } from "@/components/LocaleProvider";
import { BTN_LOGIN_SUBMIT, BTN_SOFT_PRIMARY } from "@/lib/uiButtons";
import { BRAND_WORDMARK_LG } from "@/lib/uiTypography";
import { FIELD_LABEL, PAGE_SUBTITLE } from "@/lib/uiTypography";
import { INPUT_BASE } from "@/lib/uiTokens";
import { ALERT_DANGER, VERSION_BADGE } from "@/lib/uiChrome";
import { cn } from "@/lib/cn";

type Props = {
  loading: boolean;
  error: string;
  bioOffered: boolean;
  onBiometricLogin: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function LoginCardContent({
  loading,
  error,
  bioOffered,
  onBiometricLogin,
  onSubmit,
}: Props) {
  const dict = useDictionary();

  return (
    <>
      <div className="mb-8 text-center pt-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h1 className={BRAND_WORDMARK_LG}>{dict.common.app.name.toUpperCase()}</h1>
          <span className={cn("mt-1 text-[11px]", VERSION_BADGE)}>v{APP_VERSION}</span>
        </div>
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 tracking-tight">
          {dict.login.systemLogin}
        </h2>
        <p className={cn(PAGE_SUBTITLE, "mt-1")}>{dict.login.subtitle}</p>
      </div>

      {error && <div className={cn(ALERT_DANGER, "mb-6 text-center")}>{error}</div>}

      {bioOffered && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onBiometricLogin}
            className={cn(BTN_SOFT_PRIMARY, "mb-6")}
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

      <form onSubmit={onSubmit} className="space-y-5">
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
    </>
  );
}
