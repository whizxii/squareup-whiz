"use client";

import { usePipelines, useDefaultPipeline } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { cn } from "@/lib/utils";
import { ChevronDown, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PipelineSelector() {
  const { data: pipelinesRes } = usePipelines();
  const { data: defaultRes } = useDefaultPipeline();

  const pipelines = pipelinesRes?.data ?? [];
  const defaultPipeline = defaultRes?.data ?? null;

  const activePipelineId = useCRMUIStore((s) => s.activePipelineId);
  const setActivePipelineId = useCRMUIStore((s) => s.setActivePipelineId);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-select default pipeline on first load
  useEffect(() => {
    if (!activePipelineId && defaultPipeline?.id) {
      setActivePipelineId(defaultPipeline.id);
    }
  }, [activePipelineId, defaultPipeline?.id, setActivePipelineId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? defaultPipeline;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
          "border border-border bg-card hover:bg-muted transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/30"
        )}
      >
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="truncate max-w-[200px]">
          {activePipeline?.name ?? "Select Pipeline"}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && pipelines.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePipelineId(p.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors",
                "flex items-center justify-between",
                p.id === activePipelineId && "bg-muted font-medium"
              )}
            >
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {p.stages.length} stages
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
