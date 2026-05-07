"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { useRouter, usePathname } from "next/navigation";

export function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let listenerHandle: any = null;
    
    // Ustawienie listenera tylko raz na cykl życia aplikacji
    App.addListener("backButton", () => {
      const currentPath = pathnameRef.current || "";
      const isRootPage = [
        "/worker", 
        "/worker/history", 
        "/worker/profile", 
        "/worker/help",
        "/worker/wizard"
      ].includes(currentPath);
      
      if (!isRootPage) {
        router.back();
      } else {
        App.exitApp();
      }
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [router]);

  return null;
}
