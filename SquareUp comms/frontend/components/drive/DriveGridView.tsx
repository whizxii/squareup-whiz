"use client";

import { DriveFile } from "@/lib/stores/drive-store";
import { formatBytes } from "@/lib/format";
import { getFileIcon, getFileIconColor } from "@/lib/drive-utils";
import { cn } from "@/lib/utils";

export function DriveGridView({
  files,
  selectedFileId,
  onSelect,
}: {
  files: DriveFile[];
  selectedFileId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {files.map((file) => {
        const Icon = getFileIcon(file.mime_type);
        const iconColor = getFileIconColor(file.mime_type);
        const isSelected = file.id === selectedFileId;

        return (
          <button
            key={file.id}
            onClick={() => onSelect(isSelected ? null : file.id)}
            className={cn(
              "sq-tap sq-hover-breathe sq-focus-ring group flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all duration-150",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/30"
            )}
            aria-pressed={isSelected}
            aria-label={`${file.name}, ${formatBytes(file.size_bytes)}`}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isSelected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5"
              )}
            >
              <Icon className={cn("w-6 h-6", iconColor)} />
            </div>
            <div className="w-full min-w-0">
              <p className="text-sm font-medium truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatBytes(file.size_bytes)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
