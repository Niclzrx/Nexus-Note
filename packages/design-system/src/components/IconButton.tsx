"use client";

import * as React from "react";
import { cx } from "../cx";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: "sm" | "md" | "lg";
  label: string;
}

const sizeClasses = {
  sm: "h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
  lg: "h-11 w-11 [&_svg]:h-5 [&_svg]:w-5",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, active, size = "md", label, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cx(
          "inline-flex items-center justify-center rounded-md transition-colors duration-fast ease-out-expo",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60",
          active
            ? "bg-signal/15 text-signal"
            : "text-text-muted hover:bg-surface-elevated hover:text-text",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";
