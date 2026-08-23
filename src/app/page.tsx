"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { SettingsSync } from "@/components/SettingsSync";
import { HabitTracker } from "@/components/HabitTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { store, type SessionUser } from "@/lib/data";

export default function Page() {
  return (
    <ToastProvider>
      <SettingsSync />
      <SessionGate />
    </ToastProvider>
  );
}

function SessionGate() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void store
      .getUser()
      .then((session) => {
        if (!cancelled) setUser(session);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) return <GridSkeleton />;
  if (!user) return <AuthPanel onAuthenticated={setUser} />;
  // Remounting on user change keeps one user's data from leaking into the next.
  return <HabitTracker key={user.id} user={user} onSignedOut={() => setUser(null)} />;
}
