import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const base =
  "inline-flex w-fit items-center justify-center rounded-md px-[20px] py-3 text-label transition-colors disabled:cursor-not-allowed";

const variants = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-on-surface-muted disabled:hover:bg-surface-muted",
  secondary:
    "border border-border-strong bg-surface text-primary hover:border-primary hover:bg-primary-muted hover:text-primary-hover disabled:border-border disabled:bg-surface-muted disabled:text-on-surface-muted",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
