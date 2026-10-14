import type { ComponentProps } from "react";

/* ComponentProps, not InputHTMLAttributes, so `ref` is part of the props:
   React 19 passes it through the spread below, and LocationEntry uses it to
   hand focus back to the field when it reports an error. */
type InputProps = ComponentProps<"input">;

/* The edge is border-input, not border-strong (a11y audit 2026-10-04,
   fix 10; WCAG 1.4.11 Non-text Contrast): #cfc7b6 was 1.68:1 on white, too
   faint to show where the field is. border-input is 4.03:1.

   Focus is the global :focus-visible ring (globals.css: 2px focus-ring,
   offset 2px) plus the edge turning primary. There used to be
   focus:outline-none and a 1px inset shadow instead (interface review
   2026-10-05): outline-none has no forced-colors fallback and forced colors
   drop box-shadow, so in Windows High Contrast the field kept no focus cue
   but the caret. Same change fix 10 made for the /candidates search box and
   the /news selects.

   A field that reports itself invalid (aria-invalid) keeps an error edge,
   focused or not, so on a phone the field with the problem stands out, not
   just the red line under it (Mobbin catalog 2026-10-12, AD1 Square). */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border border-border-input bg-surface px-[14px] py-3 text-body text-on-surface placeholder:text-on-surface-muted focus:border-primary aria-[invalid=true]:border-error aria-[invalid=true]:focus:border-error ${className}`}
      {...props}
    />
  );
}
