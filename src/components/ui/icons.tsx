type IconProps = { className?: string; style?: React.CSSProperties };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CheckIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M4.5 10.5 8.2 14 15.5 6" {...stroke} strokeWidth={2.1} />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" {...stroke} />
    </svg>
  );
}

export function ChevronRightIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M7.5 4.5 13 10l-5.5 5.5" {...stroke} />
    </svg>
  );
}

export function CloseIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="m5.5 5.5 9 9m0-9-9 9" {...stroke} />
    </svg>
  );
}

export function ImageIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="1.5" {...stroke} />
      <path d="m3.5 13 3.8-3.6 3.1 2.9 2.6-2.3 3.5 3.2" {...stroke} />
      <circle cx="7.3" cy="7.6" r="1.15" {...stroke} />
    </svg>
  );
}

export function TrashIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M3.75 5.5h12.5M8 5.5V4a.9.9 0 0 1 .9-.9h2.2a.9.9 0 0 1 .9.9v1.5M5.6 5.5l.7 10a1 1 0 0 0 1 .95h5.4a1 1 0 0 0 1-.95l.7-10" {...stroke} />
    </svg>
  );
}

export function ArrowUpIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M10 15.5v-11m0 0L5.5 9M10 4.5 14.5 9" {...stroke} />
    </svg>
  );
}

export function ArrowDownIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M10 4.5v11m0 0L5.5 11M10 15.5 14.5 11" {...stroke} />
    </svg>
  );
}

export function PlusIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" {...stroke} />
    </svg>
  );
}
