"use client";

export function NotesEditor({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  return (
    <section className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted"
      >
        Notes
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder="What actually happened?"
        className="w-full resize-y rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-accent"
      />
    </section>
  );
}
