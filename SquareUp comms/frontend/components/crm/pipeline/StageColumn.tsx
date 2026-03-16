"use client";

import type { Deal, PipelineStage } from "@/lib/types/crm";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Plus } from "lucide-react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { DealCard } from "./DealCard";

interface StageColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  index: number;
}

export function StageColumn({ stage, deals, index }: StageColumnProps) {
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const activePipelineId = useCRMUIStore((s) => s.activePipelineId);

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const openDeals = deals.filter((d) => d.status === "open");

  const handleAddDeal = () => {
    openDialog("create-deal", {
      stage: stage.id,
      pipeline_id: activePipelineId,
    });
  };

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      {/* Stage header */}
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-sm font-semibold">{stage.label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {openDeals.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalValue > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatCurrency(totalValue)}
            </span>
          )}
          <button
            onClick={handleAddDeal}
            title="Add deal"
            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 rounded-lg p-1 transition-colors min-h-[100px]",
              snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20"
            )}
          >
            {deals.map((deal, dealIndex) => (
              <Draggable key={deal.id} draggableId={deal.id} index={dealIndex}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <DealCard deal={deal} isDragging={dragSnapshot.isDragging} />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">No deals</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
