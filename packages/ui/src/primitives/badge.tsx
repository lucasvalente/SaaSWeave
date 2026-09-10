import * as React from "react";
import { cn } from "../utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-slate-700 text-slate-100",
      success: "bg-emerald-900/60 text-emerald-400 border border-emerald-800",
      warning: "bg-amber-900/60 text-amber-400 border border-amber-800",
      danger: "bg-red-900/60 text-red-400 border border-red-800",
    }[variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
          variantStyles,
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";
