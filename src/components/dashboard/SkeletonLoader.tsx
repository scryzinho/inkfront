import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "card" | "stat" | "table-row";
  count?: number;
}

export function SkeletonLoader({
  className,
  variant = "text",
  count = 1,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return (
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-xl animate-pulse" />
            </div>
          </div>
        );
      case "stat":
        return (
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="space-y-3">
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        );
      case "table-row":
        return (
          <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse flex-1" />
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
          </div>
        );
      default:
        return (
          <div className={cn("h-4 bg-white/10 rounded animate-pulse", className)} />
        );
    }
  };

  return (
    <>
      {items.map((i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-72 bg-white/5 rounded animate-pulse" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonLoader variant="stat" count={4} />
      </div>

      {/* Content card */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-6" />
        <SkeletonLoader variant="table-row" count={5} />
      </div>
    </div>
  );
}
