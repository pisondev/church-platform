import type { ReactNode } from "react";

import { AppShell } from "@/features/session/app-shell";

// Pages of the admin panel share one header. The editor lives outside this group.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
