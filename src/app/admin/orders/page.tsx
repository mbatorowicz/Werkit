import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/appRoutes";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(params: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const entry of value) qs.append(key, entry);
    }
  }
  const serialized = qs.toString();
  return serialized ? `?${serialized}` : "";
}

/** Legacy alias — dyspozycja jest pod `/admin` (zachowuje `?open=` z Gantta). */
export default async function AdminOrdersLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  redirect(`${adminRoutes.dispatch}${toQueryString(params)}`);
}
