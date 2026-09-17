import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Readonly<{ variant?: ButtonVariant }>;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-[color:var(--accent)] text-white hover:opacity-90 px-4 py-2',
  ghost:
    'border border-[color:var(--line-strong)] text-[color:var(--ink)] hover:bg-[color:var(--panel-2)] px-4 py-2',
  icon: 'p-2 text-[color:var(--ink)] hover:bg-[color:var(--panel-2)]',
};

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition ${VARIANT_CLASS[variant]} ${className ?? ''}`}
      {...rest}
    />
  );
}
