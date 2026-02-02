import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function Chip({ label, onRemove, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground/90",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
