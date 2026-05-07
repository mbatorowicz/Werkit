"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useRouter, usePathname } from "next/navigation";

export function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Nasłuchuj sprzętowego przycisku wstecz (tylko na urządzeniach mobilnych, np. Android)
    const listener = App.addListener("backButton", () => {
      const isRootPage = ["/worker", "/worker/history", "/worker/profile", "/worker/help"].includes(pathname || "");
      
      if (!isRootPage) {
        router.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      // Usuń listener przy odmontowaniu
      listener.then(l => l.remove()).catch(() => {});
    };
  }, [router, pathname]);

  return null;
}
