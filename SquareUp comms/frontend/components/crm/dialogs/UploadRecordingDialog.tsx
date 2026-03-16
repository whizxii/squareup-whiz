"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useUploadRecording } from "@/lib/hooks/use-crm-queries";
import {
  X,
  Mic,
  Upload,
  FileAudio,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

interface UploadRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContactId?: string;
  defaultDealId?: string;
}

interface FormState {
  title: string;
  contact_id: string;
  deal_id: string;
  file: File | null;
}

const INITIAL_FORM = (defaults?: Partial<UploadRecordingDialogProps>): FormState => ({
  title: "",
  contact_id: defaults?.defaultContactId ?? "",
  deal_id: defaults?.defaultDealId ?? "",
  file: null,
});

const ACCEPTED_TYPES = ".mp3,.wav,.webm,.m4a,.ogg,.mp4,.flac";
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/webm", "audio/x-m4a",
  "audio/ogg", "audio/flac", "audio/mp4",
  "video/mp4", "video/webm",
]);

// ─── Component ──────────────────────────────────────────────────

export function UploadRecordingDialog({
  open,
  onOpenChange,
  defaultContactId,
  defaultDealId,
}: UploadRecordingDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    INITIAL_FORM({ defaultContactId, defaultDealId })
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRecording = useUploadRecording();

  // Reset form when dialog opens or default props change
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM({ defaultContactId, defaultDealId }));
      setSubmitError(null);
      setFileError(null);
    }
  }, [open, defaultContactId, defaultDealId]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(`File too large (${sizeMB} MB). Maximum allowed: 500 MB.`);
      return;
    }

    // Validate MIME type (if available)
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      setFileError(`Unsupported file type: ${file.type}. Use MP3, WAV, WebM, M4A, OGG, MP4, or FLAC.`);
      return;
    }

    setForm((prev) => ({
      ...prev,
      file,
      title: prev.title || file.name.replace(/\.[^.]+$/, ""),
    }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.file || !form.contact_id.trim()) return;

      setSubmitError(null);

      try {
        await uploadRecording.mutateAsync({
          file: form.file,
          metadata: {
            contact_id: form.contact_id,
            deal_id: form.deal_id || undefined,
            title: form.title.trim() || undefined,
          },
        });
        onOpenChange(false);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to upload recording. Please try again."
        );
      }
    },
    [form, uploadRecording, onOpenChange]
  );

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600";

  const fileSizeMB = form.file ? (form.file.size / (1024 * 1024)).toFixed(1) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Upload Recording
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload a call recording for AI-powered transcription and analysis.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : form.file
                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {form.file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileAudio className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium truncate max-w-[250px]">{form.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fileSizeMB} MB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag & drop an audio file, or click to browse
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    MP3, WAV, WebM, M4A, OGG, MP4, FLAC
                  </p>
                </>
              )}
            </div>

            {/* File validation error */}
            {fileError && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                {fileError}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. Discovery call with Jane"
                className={inputClass}
              />
            </div>

            {/* Contact ID */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact ID *
              </label>
              <input
                type="text"
                value={form.contact_id}
                onChange={(e) => updateField("contact_id", e.target.value)}
                placeholder="Contact ID"
                className={inputClass}
                required
              />
            </div>

            {/* Deal ID (optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deal ID
              </label>
              <input
                type="text"
                value={form.deal_id}
                onChange={(e) => updateField("deal_id", e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>

            {/* Error display */}
            {submitError && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadRecording.isPending || !form.file || !form.contact_id.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {uploadRecording.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload & Analyze"
                )}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
