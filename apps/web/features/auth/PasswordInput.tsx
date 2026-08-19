"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ invalid, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          aria-invalid={invalid}
          className={
            className ??
            "w-full rounded-md border border-border bg-surface-elevated px-3 py-2 pr-9 text-sm text-text outline-none transition-colors focus:border-signal"
          }
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // tabIndex -1: this is a convenience toggle, not a stop on the
          // natural tab order between fields and the submit button.
          tabIndex={-1}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint transition-colors hover:text-text-muted"
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
