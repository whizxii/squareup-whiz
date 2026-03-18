"use client";

import { useState, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload, FileUp, Check, AlertCircle } from "lucide-react";
import { crmApi } from "@/lib/api/crm-api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// ─── Constants ─────────────────────────────────────────────────────

const CRM_FIELDS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "title", label: "Title" },
  { value: "stage", label: "Stage" },
  { value: "source", label: "Source" },
  { value: "value", label: "Deal Value" },
  { value: "currency", label: "Currency" },
  { value: "notes", label: "Notes" },
  { value: "tags", label: "Tags" },
  { value: "__skip__", label: "Skip this column" },
] as const;

type ImportStep = "upload" | "mapping" | "result";

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── Component ─────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Reset ─────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setCsvHeaders([]);
    setPreviewRows([]);
    setMappings({});
    setImporting(false);
    setResult(null);
    setError(null);
  }, []);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetState();
      onOpenChange(isOpen);
    },
    [onOpenChange, resetState]
  );

  // ─── File parsing ──────────────────────────────────────────────

  const parseCSV = useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) return { headers: [] as string[], rows: [] as string[][] };

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1, 6).map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );
    return { headers, rows };
  }, []);

  const handleFileDrop = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Only CSV files are supported");
        return;
      }

      setError(null);
      setFile(selectedFile);

      const text = await selectedFile.text();
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0) {
        setError("Could not parse CSV headers");
        return;
      }

      setCsvHeaders(headers);
      setPreviewRows(rows);

      // Auto-map columns by name similarity
      const autoMap: Record<string, string> = {};
      for (const header of headers) {
        const normalized = header.toLowerCase().replace(/[\s_-]/g, "");
        const match = CRM_FIELDS.find(
          (f) => f.value !== "__skip__" && f.value.toLowerCase().replace(/_/g, "") === normalized
        );
        autoMap[header] = match ? match.value : "__skip__";
      }
      setMappings(autoMap);
      setStep("mapping");
    },
    [parseCSV]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileDrop(f);
    },
    [handleFileDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer.files[0];
      if (f) handleFileDrop(f);
    },
    [handleFileDrop]
  );

  // ─── Mapping update ────────────────────────────────────────────

  const updateMapping = useCallback((csvCol: string, crmField: string) => {
    setMappings((prev) => ({ ...prev, [csvCol]: crmField }));
  }, []);

  // ─── Import ────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    // Filter out skipped columns
    const activeMappings: Record<string, string> = {};
    for (const [csvCol, crmField] of Object.entries(mappings)) {
      if (crmField !== "__skip__") {
        activeMappings[csvCol] = crmField;
      }
    }

    try {
      const res = await crmApi.importContacts(file, activeMappings);
      setResult(res);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["crm"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-display font-bold mb-4">
            {step === "upload" && "Import Contacts"}
            {step === "mapping" && "Map Columns"}
            {step === "result" && "Import Complete"}
          </Dialog.Title>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Drop a CSV file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                First row should contain column headers
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Map CSV columns to CRM fields. {file?.name} &mdash;{" "}
                {csvHeaders.length} columns detected.
              </p>

              <div className="space-y-2 mb-4">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="text-sm w-1/3 truncate font-mono text-muted-foreground">
                      {header}
                    </span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <select
                      value={mappings[header] || "__skip__"}
                      onChange={(e) => updateMapping(header, e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      {CRM_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {previewRows.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Preview (first {previewRows.length} rows)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          {csvHeaders.map((h) => (
                            <th
                              key={h}
                              className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate"
                              >
                                {cell || "\u2014"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => { setStep("upload"); setFile(null); }}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? "Importing..." : "Import Contacts"}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Result */}
          {step === "result" && result && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {result.created}
                  </p>
                  <p className="text-xs text-muted-foreground">Created</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {result.updated}
                  </p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-950/30 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">
                      {result.errors.length} warnings
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/50 p-2 space-y-1">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => handleClose(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  <Check className="w-4 h-4" />
                  Done
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 mt-3">{error}</p>
          )}

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
