"use client";

import { DriveFile } from "@/lib/stores/drive-store";
import { formatBytes, formatDate } from "@/lib/format";
import { getFileIcon, getFileIconColor } from "@/lib/drive-utils";
import { cn } from "@/lib/utils";

export function DriveListView({
  files,
  selectedFileId,
  onSelect,
}: {
  files: DriveFile[];
  selectedFileId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="overflow-auto" role="table" aria-label="Files list">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">
              Name
            </th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">
              Folder
            </th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
              Size
            </th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden lg:table-cell">
              Uploaded by
            </th>
            <th className="text-right px-4 py-2 font-medium text-muted-foreground">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const Icon = getFileIcon(file.mime_type);
            const iconColor = getFileIconColor(file.mime_type);
            const isSelected = file.id === selectedFileId;

            return (
              <tr
                key={file.id}
                onClick={() => onSelect(isSelected ? null : file.id)}
                className={cn(
                  "border-b border-border cursor-pointer transition-all duration-150 sq-tap sq-focus-ring group",
                  isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-accent/30 hover:border-primary/20"
                )}
                role="row"
                aria-selected={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(isSelected ? null : file.id);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-muted capitalize">
                    {file.folder === "/" ? "root" : file.folder.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">
                  {formatBytes(file.size_bytes)}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span
                    className={cn(
                      "text-xs",
                      file.uploaded_by_type === "agent"
                        ? "text-sq-agent font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {file.uploaded_by}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {formatDate(file.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
