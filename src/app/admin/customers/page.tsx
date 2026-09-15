import CustomersClient from "@/features/admin/customers/CustomersClient";
import { PAGE_PAD } from "@/lib/uiTokens";

export default function CustomersPage() {
  return (
    <div className={`${PAGE_PAD} max-w-7xl mx-auto w-full`}>
      <CustomersClient />
    </div>
  );
}
