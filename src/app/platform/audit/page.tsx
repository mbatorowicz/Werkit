import { PlatformAuditLog } from "@/components/Platform/PlatformAuditLog";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";

export const dynamic = "force-dynamic";

export default async function PlatformAuditPage() {
  const dict = getDictionary(await getServerLocale());
  return <PlatformAuditLog dict={dict.platform} />;
}
