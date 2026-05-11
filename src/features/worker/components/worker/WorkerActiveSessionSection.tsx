"use client";

import type { ComponentProps } from "react";
import ActiveSessionDashboard from "@/features/worker/components/ActiveSessionDashboard";

export function WorkerActiveSessionSection(props: ComponentProps<typeof ActiveSessionDashboard>) {
  return <ActiveSessionDashboard {...props} />;
}
