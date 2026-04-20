"use client";
import dynamic from "next/dynamic";

const DynamicSettingsMap = dynamic(
  () => import("./SettingsMapInner"),
  { ssr: false, loading: () => <div className="w-full h-full bg-zinc-900 animate-pulse rounded-lg flex items-center justify-center text-xs text-zinc-600 font-medium">Ładowanie mapy...</div> }
);

export default function SettingsMap(props: any) {
  return <DynamicSettingsMap {...props} />
}
