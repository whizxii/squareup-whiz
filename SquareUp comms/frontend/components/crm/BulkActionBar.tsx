"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import {
  useBulkUpdateStage,
  useBulkArchive,
} from "@/lib/hooks/use-crm-queries";
import type { CRMStage } from "@/lib/types/crm";
import {
  X,
  Layers,
  Archive,
  Download,
  Upload,
  GitMerge,
  UserPlus,
} from "lucide-react";

const STAGES: CRMStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const bulkStage = useBulkUpdateStage();
  const bulkArchive = useBulkArchive();
  const [stageMenuOpen, setStageMenuOpen] = useState(false);

  const count = selectedIds.length;

  const handleStageChange = (stage: CRMStage) => {
    bulkStage.mutate(
      { contactIds: selectedIds, stage },
      { onSuccess: () => { setStageMenuOpen(false); onClear(); } }
    );
  };

  const handleArchive = () => {
    if (!confirm(`Archive ${count} contact${count > 1 ? "s" : ""}?`)) return;
    bulkArchive.mutate(selectedIds, { onSuccess: onClear });
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20 shrink-0">
      <span className="text-sm font-medium text-primary mr-1">
        {count} selected
      </span>

      {/* Stage change */}
      <div className="relative">
        <button
          onClick={() => setStageMenuOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-card border border-border hover:bg-accent transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          Stage
        </button>
        {stageMenuOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[120px]">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className="w-full text-left px-3 py-1.5 text-xs rounded-md capitalize hover:bg-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Archive */}
      <button
        onClick={handleArchive}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-card border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
      >
        <Archive className="w-3.5 h-3.5" />
        Archive
      </button>

      {/* Merge (only for 2 selected) */}
      {count === 2 && (
        <button
          onClick={() =>
            openDialog("merge-contacts", {
              primary_id: selectedIds[0],
              secondary_id: selectedIds[1],
            })
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-card border border-border hover:bg-accent transition-colors"
        >
          <GitMerge className="w-3.5 h-3.5" />
          Merge
        </button>
      )}

      {/* Export */}
      <button
        onClick={() => openDialog("export")}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-card border border-border hover:bg-accent transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      <div className="flex-1" />

      {/* Clear selection */}
      <button
        onClick={onClear}
        className="p-1 rounded hover:bg-accent text-muted-foreground"
        title="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
