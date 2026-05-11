import { RouteLoading } from "@/components/RouteLoading";
import { getDictionary } from "@/i18n";

export default function Loading() {
  const t = getDictionary().routeLoading;
  return <RouteLoading title={t.title} subtitle={t.staticPage} />;
}
