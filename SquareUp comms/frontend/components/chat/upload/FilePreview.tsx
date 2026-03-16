"use client";

import { X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface FilePreviewProps {
  file: UploadFile;
  onRemove: () => void;
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const isImage = file.type.startsWith("image/");

  return (
    <div
      className={cn(
        "relative group flex items-center gap-2 px-3 py-2 rounded-lg border bg-card transition-colors",
        file.status === "error"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border hover:border-border/80"
      )}
    >
      {/* Thumbnail or icon */}
      {isImage && file.preview ? (
        <div className="w-10 h-10 rounded overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
          {isImage ? (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      )}

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate max-w-[150px]">
          {file.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {file.status === "error"
            ? file.error ?? "Upload failed"
            : formatBytes(file.size)}
        </p>
      </div>

      {/* Upload progress */}
      {file.status === "uploading" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}

      {/* Status indicator */}
      {file.status === "uploading" && (
        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${file.name}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
