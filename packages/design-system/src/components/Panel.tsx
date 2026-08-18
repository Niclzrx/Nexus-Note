import * as React from "react";
import { cx } from "../cx";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

/** Generic surface used by sidebars, property panels, popovers, floating toolbars. */
export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, elevated, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "rounded-lg border border-border shadow-[0_8px_24px_-8px_rgb(var(--shadow-color)/0.5)]",
        elevated ? "bg-surface-elevated" : "bg-surface",
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = "Panel";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-sm border border-border-strong bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-muted">
      {children}
    </kbd>
  );
}
