import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rectangle" | "circle" | "text";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = "rectangle",
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";

  if (variant === "circle") {
    return (
      <div
        className={cn(baseClasses, "rounded-full", className)}
        style={{
          width: width ?? 40,
          height: height ?? width ?? 40,
        }}
      />
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(baseClasses, "h-4 rounded")}
            style={{
              width: i === lines - 1 && lines > 1 ? "75%" : (width ?? "100%"),
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, "rounded-lg", className)}
      style={{ width: width ?? "100%", height: height ?? 20 }}
    />
  );
}

// ─── Prebuilt skeleton layouts ───────────────────────────────────

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-gray-200 p-4 dark:border-gray-700", className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" className="mt-1" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} className="mt-4" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="flex gap-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} height={12} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
