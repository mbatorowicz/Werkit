import MachinesClient from "@/features/admin/machines/MachinesClient";
import { PAGE_PAD } from "@/lib/uiTokens";

export default function MachinesPage() {
  return (
    <div className={`${PAGE_PAD} max-w-7xl mx-auto w-full`}>
      <MachinesClient />
    </div>
  );
}
