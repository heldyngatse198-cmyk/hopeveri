import type { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
