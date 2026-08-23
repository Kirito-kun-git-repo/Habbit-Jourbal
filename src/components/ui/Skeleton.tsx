export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xs ${className}`} aria-hidden="true" />;
}

export function GridSkeleton() {
  return (
    <div className="space-y-2 p-5" aria-label="Loading habits" role="status">
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-10 w-44 shrink-0" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  );
}
