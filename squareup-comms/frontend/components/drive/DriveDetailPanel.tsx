"use client";

import { DriveFile } from "@/lib/stores/drive-store";
import { formatBytes, formatDate } from "@/lib/format";
import { getFileIcon, getFileIconColor } from "@/lib/drive-utils";
import { X, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DriveDetailPanel({
  file,
  onClose,
  onDelete,
}: {
  file: DriveFile;
  onClose: () => void;
  onDelete: () => void;
}) {
  const Icon = getFileIcon(file.mime_type);
  const iconColor = getFileIconColor(file.mime_type);

  return (
    <aside
      className="w-72 shrink-0 border-l border-border bg-card flex flex-col animate-slide-in-right"
      role="complementary"
      aria-label="File details"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-display font-bold truncate">
          File Details
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent transition-colors"
          aria-label="Close details panel"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Icon + name */}
      <div className="flex flex-col items-center gap-3 p-6 border-b border-border">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className={cn("w-8 h-8", iconColor)} />
        </div>
        <p className="text-sm font-medium text-center break-all leading-snug">
          {file.name}
        </p>
      </div>

      {/* Metadata */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <MetaRow label="Type" value={file.mime_type.split("/").pop() ?? "unknown"} />
        <MetaRow label="Size" value={formatBytes(file.size_bytes)} />
        <MetaRow label="Folder" value={file.folder === "/" ? "All Files" : file.folder.slice(1).charAt(0).toUpperCase() + file.folder.slice(2)} />
        <MetaRow label="Uploaded" value={formatDate(file.created_at)} />
        <MetaRow
          label="Uploaded by"
          value={file.uploaded_by}
          highlight={file.uploaded_by_type === "agent"}
        />
        {file.channel_id && <MetaRow label="Channel" value={file.channel_id} />}
        {file.contact_id && <MetaRow label="Contact" value={file.contact_id} />}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label={`Download ${file.name}`}
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete file"
          aria-label={`Delete ${file.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

function MetaRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-right break-all",
          highlight ? "text-sq-agent font-medium" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
