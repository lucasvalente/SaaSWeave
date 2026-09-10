import * as React from "react";
import { cn } from "../utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";

    const variantStyles = {
      primary: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500",
      secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600 focus-visible:ring-slate-400",
      outline:
        "border border-slate-600 text-slate-200 hover:bg-slate-800 focus-visible:ring-slate-400",
      danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
