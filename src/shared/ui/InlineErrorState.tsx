import { Button } from './Button';

type InlineErrorStateProps = Readonly<{
  message: string;
  onRetry: () => void;
}>;

export function InlineErrorState({ message, onRetry }: InlineErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 text-sm text-[color:var(--danger)]"
    >
      <p>{message}</p>
      <Button variant="ghost" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}
