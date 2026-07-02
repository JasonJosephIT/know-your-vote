import type { HTMLAttributes } from "react";

type ChipProps = HTMLAttributes<HTMLSpanElement>;

export function Chip({ className = "", ...props }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary-muted px-3 py-1 text-caption text-primary-hover ${className}`}
      {...props}
    />
  );
}
