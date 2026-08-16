"use client";

import type { ReactNode } from "react";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Optional extra classes (appended after variant classes). */
  className?: string;
}

const VARIANT_CLASSES: Record<
  NonNullable<ButtonProps["variant"]>,
  string
> = {
  primary: "bg-accent-solid text-accent-fg hover:bg-accent-solid-hover",
  secondary:
    "border border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
  ghost: "text-accent hover:bg-accent-soft",
};

export function Button({
  variant = "primary",
  type = "button",
  onClick,
  disabled,
  children,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-field px-5 text-base font-medium",
        "transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
