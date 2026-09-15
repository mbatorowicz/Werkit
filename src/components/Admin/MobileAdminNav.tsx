"use client";
import { useState } from "react";
import { Menu, X, Users } from "lucide-react";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";

import { usePathname } from "next/navigation";

import type { AppDictionary } from "@/i18n/types";
import { buildAdminNavLinks } from "./adminNavLinks";
import { isAdminDispatchNavActive } from "./adminNavActive";
import { OrgShellBrand } from "@/components/OrgShellBrand";
import { LOGOUT_ROW, ICON_BTN_GHOST } from "@/lib/uiChrome";

export function MobileAdminNav({
  companyName,
  productName,
  version,
  dict,
  durDict,
  durEnabled = false,
  scopedViewer = false,
  loggedInUser,
}: {
  companyName: string;
  productName: string;
  version: string;
  dict: AppDictionary["admin"];
  durDict: AppDictionary["dur"];
  durEnabled?: boolean;
  scopedViewer?: boolean;
  loggedInUser?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();
  const closeMenu = () => setIsOpen(false);

  const links = buildAdminNavLinks(dict, durDict, { durEnabled, scopedViewer });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${ICON_BTN_GHOST} -mr-1`}
        aria-label={dict.ui.menu}
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMenu} />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white pb-[1.5cm] box-border dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-left duration-200">
            <div className="h-[72px] flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
              <OrgShellBrand
                companyName={companyName}
                productName={productName}
                version={version}
                className="max-w-[200px]"
              />
              <button
                type="button"
                onClick={closeMenu}
                className={ICON_BTN_GHOST}
                aria-label={dict.ui.closeModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex-1 py-4 px-2 space-y-1.5 ${INLINE_SCROLL_PANEL_CLASS}`}>
              {links.map((link, idx) => {
                if (link.kind === "section") {
                  return (
                    <div key={`section-${idx}`} className="pt-4 pb-2 px-3">
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        {link.label}
                      </p>
                    </div>
                  );
                }

                const Icon = link.icon;
                const isActive = isAdminDispatchNavActive(pathname, link.href);
                const isSettings = link.href === "/admin/settings";
                const shouldHighlight = isActive && !isSettings;

                return (
                  <Link
                    key={link.href}
                    onClick={closeMenu}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      shouldHighlight
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${shouldHighlight ? "text-zinc-900 dark:text-white" : "text-zinc-500"}`}
                    />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
              {loggedInUser && (
                <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="truncate font-medium">{loggedInUser}</span>
                  </div>
                  <LocaleSwitcher variant="embedded" />
                </div>
              )}
              <LogoutButton
                className={LOGOUT_ROW}
                iconClass="w-4 h-4"
                text={dict.sidebar.logoutSession}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
