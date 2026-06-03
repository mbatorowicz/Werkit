"use client";

import { useCallback, useState } from "react";
import { WorkerOrderDetailsModal } from "@/features/worker/components/WorkerOrderDetailsModal";
import type { WorkerOrderDetailsData } from "@/features/worker/lib/workerOrderDetails";

export function useWorkerOrderDetailsModal() {
  const [data, setData] = useState<WorkerOrderDetailsData | null>(null);

  const openOrderDetails = useCallback((details: WorkerOrderDetailsData) => {
    setData(details);
  }, []);

  const closeOrderDetails = useCallback(() => {
    setData(null);
  }, []);

  const orderDetailsModal = (
    <WorkerOrderDetailsModal
      open={data !== null}
      onClose={closeOrderDetails}
      data={data}
    />
  );

  return { openOrderDetails, closeOrderDetails, orderDetailsModal };
}
