"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilePreview, type UploadFile } from "./FilePreview";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface FileUploadProps {
  files: UploadFile[];
  onFilesChange: (files: UploadFile[]) => void;
  onRemoveFile: (id: string) => void;
}

export function FileUpload({
  files,
  onFilesChange,
  onRemoveFile,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > MAX_FILE_SIZE) {
        return `${file.name} exceeds 10MB limit`;
      }
      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
        return `${file.name}: unsupported file type`;
      }
      return null;
    },
    []
  );

  const processFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: UploadFile[] = [];
      const errors: string[] = [];

      Array.from(fileList).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
          return;
        }

        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        newFiles.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          progress: 0,
          status: "pending",
        });
      });

      if (errors.length > 0) {
        console.warn("File validation errors:", errors);
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
    },
    [files, onFilesChange, validateFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCountRef.current = 0;

      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [processFiles]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Full-window drag overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 bg-primary/5 backdrop-blur-sm flex items-center justify-center animate-fade-in-up"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary/40 bg-card/90 shadow-lg">
            <Upload className="w-10 h-10 text-primary animate-bounce" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Drop files here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, PDFs, documents up to 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drag zone listeners on parent (chat window) */}
      <div
        className="contents"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* File previews above composer */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-border/50 bg-card/50">
            {files.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => onRemoveFile(file.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expose openFilePicker for toolbar button */}
      <button
        onClick={openFilePicker}
        className="hidden"
        data-file-upload-trigger
        aria-hidden="true"
      />
    </>
  );
}

// Export for use in MessageComposer
export { type UploadFile };
