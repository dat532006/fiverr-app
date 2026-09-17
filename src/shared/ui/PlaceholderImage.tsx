type PlaceholderImageProps = Readonly<{
  caption: string;
  aspectRatio?: string;
  className?: string | undefined;
}>;

export function PlaceholderImage({
  caption,
  aspectRatio = '4 / 3',
  className,
}: PlaceholderImageProps) {
  return (
    <div
      role="img"
      aria-label={caption}
      style={{
        aspectRatio,
        backgroundImage:
          'repeating-linear-gradient(45deg, var(--stripe), var(--stripe) 1px, transparent 1px, transparent 10px)',
      }}
      className={`${className ?? ''} flex items-center justify-center bg-[color:var(--panel-2)] p-2 text-center`}
    >
      <span className="font-mono text-[11px] text-[color:var(--muted)]">{caption}</span>
    </div>
  );
}
