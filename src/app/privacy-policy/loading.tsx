import { RouteLoading } from "@/components/RouteLoading";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";

export default async function Loading() {
  const t = getDictionary(await getServerLocale()).routeLoading;
  return <RouteLoading title={t.title} subtitle={t.staticPage} />;
}
