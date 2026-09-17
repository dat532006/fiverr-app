type SkeletonProps = Readonly<{ className?: string }>;

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`${className ?? ''} animate-pulse rounded-md bg-[color:var(--panel-2)]`}
    />
  );
}
