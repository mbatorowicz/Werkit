"use client";

import type { ComponentProps } from "react";
import PendingOrdersList from "@/features/worker/components/PendingOrdersList";

export function WorkerPendingOrdersSection(props: ComponentProps<typeof PendingOrdersList>) {
  return <PendingOrdersList {...props} />;
}
