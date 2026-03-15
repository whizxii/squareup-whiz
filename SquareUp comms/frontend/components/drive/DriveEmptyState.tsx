"use client";

import { Upload } from "lucide-react";

export function DriveEmptyState({
  hasSearch,
  onUpload,
}: {
  hasSearch: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[320px]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">{hasSearch ? "\uD83D\uDD0D" : "\uD83D\uDCC1"}</span>
        </div>
        <h3 className="text-lg font-display font-bold">
          {hasSearch ? "No files found" : "No files yet"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasSearch
            ? "Try a different search term or browse a different folder."
            : "Upload files or share them in chat."}
        </p>
        {!hasSearch && (
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload your first file
          </button>
        )}
      </div>
    </div>
  );
}
