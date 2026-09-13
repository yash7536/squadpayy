import { cn } from "@/lib/utils/cn";
import { Icon } from "./Icon";
import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: string;
}

export function TextField({ label, icon, id, className, ...rest }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-label-sm text-on-surface">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={inputId}
          className={cn(
            "w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface text-body-md",
            "focus:outline-none focus:bg-surface-container-lowest focus-ring border border-transparent",
            icon && "pr-11",
            className,
          )}
          {...rest}
        />
        {icon && (
          <Icon
            name={icon}
            className="absolute right-4 text-outline pointer-events-none"
            size={20}
          />
        )}
      </div>
    </div>
  );
}
