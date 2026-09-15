import PeopleClient from "@/features/admin/organization/PeopleClient";
import { PAGE_PAD } from "@/lib/uiTokens";

export default function OrganizationPage() {
  return (
    <div className={`${PAGE_PAD} max-w-7xl mx-auto w-full`}>
      <PeopleClient />
    </div>
  );
}
