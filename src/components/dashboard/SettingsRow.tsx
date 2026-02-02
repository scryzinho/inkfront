import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  control,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}
