"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "../../features/shell/Sidebar";
import { CommandPalette } from "../../features/shell/CommandPalette";
import { OnboardingOverlay } from "../../features/shell/OnboardingOverlay";
import { useWorkspaceStore } from "../../stores/workspace-store";
import { useUiStore } from "../../stores/ui-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = useWorkspaceStore((s) => s.bootstrap);
  const hydrateTheme = useUiStore((s) => s.hydrateTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([bootstrap(), hydrateTheme()]).then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <CommandPalette />
      <OnboardingOverlay />
    </div>
  );
}
