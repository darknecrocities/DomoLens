import { useId, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "../../lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, hint, error, className, id, ref, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={hint || error ? hintId : undefined}
        className={cn(
          "h-12 rounded-xl border bg-ink-900 px-4 text-base text-fg placeholder:text-fg-faint",
          "transition-[border-color,box-shadow] duration-150 outline-none",
          "focus:border-white focus:shadow-[0_0_0_2px_rgba(255,255,255,0.2)]",
          error ? "border-danger" : "border-ink-600",
          className,
        )}
        {...rest}
      />
      {(hint || error) && (
        <p id={hintId} className={cn("text-sm", error ? "text-danger" : "text-fg-faint")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
