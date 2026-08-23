"use client";

export const VIEWS = ["grid", "journal", "weekly", "consistency"] as const;
export type ViewKey = (typeof VIEWS)[number];

const LABELS: Record<ViewKey, string> = {
  grid: "Grid",
  journal: "Journal",
  weekly: "Weekly",
  consistency: "Consistency",
};

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-flex rounded-sm border border-line-strong bg-sunken p-0.5"
    >
      {VIEWS.map((view) => {
        const active = view === value;
        return (
          <button
            key={view}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(view)}
            className={`rounded-xs px-3 py-1.5 text-[14px] font-medium transition-colors duration-150 ${
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(38,35,31,0.08)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {LABELS[view]}
          </button>
        );
      })}
    </div>
  );
}
