import { useId, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

// What the control needs to be wired to its label and message. The consumer spreads it on
// a native `input` / `select` / `textarea`; `Field` never knows which control it wraps.
export type FieldControlProps = Readonly<{
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  className: string;
}>;

type FieldProps = Readonly<{
  label: string;
  // Text shown (and announced through `aria-describedby`) when the field is invalid.
  error?: string | undefined;
  help?: string | undefined;
  children: (control: FieldControlProps) => ReactNode;
}>;

const CONTROL_CLASS =
  'min-h-11 w-full min-w-0 rounded-md border bg-[color:var(--panel)] px-3 text-sm text-[color:var(--ink)] ' +
  'placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[color:var(--accent)]';

// Domain-free: a label, one control slot and a help/error region. The region always
// reserves one line of height so showing or clearing a message never shifts the layout.
export function Field({ label, error, help, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? help;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[color:var(--ink)]">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': message ? messageId : undefined,
        'aria-invalid': error ? true : undefined,
        className: `${CONTROL_CLASS} ${
          error ? 'border-[color:var(--danger)]' : 'border-[color:var(--line-strong)]'
        }`,
      })}
      <div id={messageId} className="min-h-5 text-xs leading-5 text-[color:var(--ink)]">
        {error ? (
          <p className="flex items-start gap-1.5">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--danger)]"
            />
            <span>{error}</span>
          </p>
        ) : help ? (
          <p className="text-[color:var(--muted)]">{help}</p>
        ) : null}
      </div>
    </div>
  );
}
