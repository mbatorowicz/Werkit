"use client";
import dynamic from "next/dynamic";
import { MapLoadingFallback } from "./MapLoadingFallback";

const DynamicSettingsMap = dynamic(() => import("./SettingsMapInner"), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

export default function SettingsMap(props: {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}) {
  return <DynamicSettingsMap {...props} />;
}
