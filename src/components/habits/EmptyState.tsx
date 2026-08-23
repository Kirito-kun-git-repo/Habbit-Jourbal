"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";

const SEED_ENABLED = process.env.NODE_ENV !== "production";

export function EmptyState({
  onAddHabit,
  onSeeded,
}: {
  onAddHabit: () => void;
  onSeeded: () => void;
}) {
  const { notify } = useToast();
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      const { seedDemoData } = await import("@/lib/seed");
      await seedDemoData();
      onSeeded();
      notify("Demo data loaded.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not load demo data.", "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start px-6 py-24">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
        Start building your routine.
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Add the handful of things you want to do most days. Mark them off as you go, and attach a
        photo or a note when the day is worth remembering.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onAddHabit}>
          <PlusIcon className="h-[16px] w-[16px]" />
          Add your first habit
        </Button>
        {SEED_ENABLED && (
          <Button variant="ghost" onClick={() => void seed()} disabled={seeding}>
            {seeding ? "Loading demo data…" : "Load demo data"}
          </Button>
        )}
      </div>
      {SEED_ENABLED && (
        <p className="mt-3 text-[13.5px] text-muted">
          Demo data is a development convenience and is hidden in production builds.
        </p>
      )}
    </div>
  );
}
