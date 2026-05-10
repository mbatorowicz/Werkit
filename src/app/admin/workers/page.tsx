import { redirect } from "next/navigation";

export default function LegacyWorkersRedirectPage() {
  redirect("/admin/users");
}
