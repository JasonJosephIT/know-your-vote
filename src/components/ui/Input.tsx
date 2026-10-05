import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/* The edge is border-input, not border-strong (a11y audit 2026-10-04,
   fix 10; WCAG 1.4.11 Non-text Contrast): #cfc7b6 was 1.68:1 on white, too
   faint to show where the field is. border-input is 4.03:1. Focus keeps
   design.md's input-text-focus: the edge turns primary and thickens to 2px. */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border border-border-input bg-surface px-[14px] py-3 text-body text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)] focus:outline-none ${className}`}
      {...props}
    />
  );
}
