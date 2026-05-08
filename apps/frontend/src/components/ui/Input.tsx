import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    const inputId =
      props.id ??
      props.name ??
      (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900",
            "border-slate-200 dark:border-slate-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "text-sm placeholder:text-slate-400",
            error && "border-red-500 focus:ring-red-500",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
