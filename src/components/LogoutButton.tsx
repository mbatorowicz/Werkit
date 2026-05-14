"use client";

import { LogOut } from "lucide-react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useRouter } from "next/navigation";

export function LogoutButton({ className, text, iconClass }: { className?: string, text?: string, iconClass?: string }) {
  const router = useRouter();
  const handleLogout = async () => {
    await fetchWithDeviceTelemetry("Auth: logout POST", "/api/auth/logout", { method: "POST" }, { category: "auth" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={handleLogout} className={className}>
      <LogOut className={iconClass || "w-4 h-4"} />
      {text && <span>{text}</span>}
    </button>
  );
}
