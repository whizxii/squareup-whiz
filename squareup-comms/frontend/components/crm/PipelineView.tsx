"use client";

import { useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import {
  useDefaultPipeline,
  usePipelines,
  useDealsPipeline,
  useMoveDealStage,
} from "@/lib/hooks/use-crm-queries";
import { PipelineSelector } from "./pipeline/PipelineSelector";
import { StageColumn } from "./pipeline/StageColumn";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Layers } from "lucide-react";
import type { Deal, PipelineStage } from "@/lib/types/crm";

export function PipelineView() {
  const activePipelineId = useCRMUIStore((s) => s.activePipelineId);
  const setActivePipelineId = useCRMUIStore((s) => s.setActivePipelineId);

  const { data: defaultRes, isLoading: loadingDefault } = useDefaultPipeline();
  const { data: pipelinesRes } = usePipelines();

  const defaultPipeline = defaultRes ?? null;
  const pipelines = pipelinesRes ?? [];

  // Use active pipeline or fall back to default
  const effectivePipelineId = activePipelineId ?? defaultPipeline?.id ?? "";

  // Auto-select default on first load
  if (!activePipelineId && defaultPipeline?.id) {
    setActivePipelineId(defaultPipeline.id);
  }

  // Find the active pipeline object to get its stages
  const activePipeline =
    pipelines.find((p) => p.id === effectivePipelineId) ?? defaultPipeline;

  const { data: dealsRes, isLoading: loadingDeals } = useDealsPipeline(
    effectivePipelineId
  );
  const moveDealStage = useMoveDealStage();

  const dealsByStage: Record<string, Deal[]> = dealsRes ?? {};

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId) return;
      moveDealStage.mutate({ id: draggableId, stage: destination.droppableId });
    },
    [moveDealStage]
  );

  if (loadingDefault || loadingDeals) {
    return <PipelineLoading />;
  }

  if (!defaultPipeline && !activePipelineId) {
    return (
      <EmptyState
        icon={<Layers className="h-6 w-6" />}
        title="No pipelines yet"
        description="Create your first pipeline to start tracking deals."
      />
    );
  }

  const stages: PipelineStage[] = activePipeline?.stages
    ? [...activePipeline.stages].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline selector */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
        <PipelineSelector />
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 overflow-x-auto flex-1 scrollbar-thin">
          {stages.map((stage, index) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] ?? []}
              index={index}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

function PipelineLoading() {
  return (
    <div className="flex gap-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="min-w-[280px] w-[280px] space-y-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
