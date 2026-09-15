import MaterialsClient from "@/features/admin/materials/MaterialsClient";
import { PAGE_PAD } from "@/lib/uiTokens";

export default function MaterialsPage() {
  return (
    <div className={`${PAGE_PAD} max-w-7xl mx-auto w-full`}>
      <MaterialsClient />
    </div>
  );
}
