"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SequenceStep } from "@/lib/types/crm";
import {
  Plus,
  GripVertical,
  Trash2,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

// ─── Step Card ───────────────────────────────────────────────────

interface StepCardProps {
  step: SequenceStep;
  index: number;
  totalSteps: number;
  onUpdate: (index: number, updated: SequenceStep) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function StepCard({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleFieldChange = useCallback(
    (field: keyof SequenceStep, value: string | number) => {
      onUpdate(index, { ...step, [field]: value });
    },
    [step, index, onUpdate]
  );

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle + order */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <GripVertical className="w-3.5 h-3.5 cursor-grab" />
          <span className="text-[10px] font-mono w-4 text-center">
            {index + 1}
          </span>
        </div>

        {/* Delay indicator */}
        {index > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[9px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            {step.delay_days > 0 ? `${step.delay_days}d` : ""}
            {step.delay_hours > 0 ? `${step.delay_hours}h` : ""}
            {step.delay_days === 0 && step.delay_hours === 0 ? "Immediately" : ""}
          </div>
        )}

        {/* Subject preview */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Mail className="w-3 h-3 text-blue-500 shrink-0" />
          <p className="text-xs truncate">
            {step.template_subject || "No subject"}
          </p>
        </div>

        {/* Stop on reply indicator */}
        {step.send_on_reply === "stop" && (
          <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full shrink-0">
            Stop on reply
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalSteps - 1}
            className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
          {/* Delay */}
          {index > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-[10px] text-muted-foreground font-medium w-16">
                Wait
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={step.delay_days}
                  onChange={(e) =>
                    handleFieldChange("delay_days", parseInt(e.target.value) || 0)
                  }
                  className="w-16 px-2 py-1 rounded-md border border-border bg-background text-xs text-center focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <span className="text-[10px] text-muted-foreground">days</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={step.delay_hours}
                  onChange={(e) =>
                    handleFieldChange("delay_hours", parseInt(e.target.value) || 0)
                  }
                  className="w-16 px-2 py-1 rounded-md border border-border bg-background text-xs text-center focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <span className="text-[10px] text-muted-foreground">hours</span>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-start gap-3">
            <label className="text-[10px] text-muted-foreground font-medium w-16 mt-1.5">
              Subject
            </label>
            <input
              type="text"
              value={step.template_subject}
              onChange={(e) =>
                handleFieldChange("template_subject", e.target.value)
              }
              placeholder="Email subject (supports {first_name}, {company})"
              className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
            />
          </div>

          {/* Body */}
          <div className="flex items-start gap-3">
            <label className="text-[10px] text-muted-foreground font-medium w-16 mt-1.5">
              Body
            </label>
            <textarea
              value={step.template_body}
              onChange={(e) =>
                handleFieldChange("template_body", e.target.value)
              }
              placeholder="Email body (supports merge fields: {first_name}, {company}, {deal_value})"
              className="flex-1 min-h-[100px] px-2 py-1.5 rounded-md border border-border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
            />
          </div>

          {/* Stop on reply */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-muted-foreground font-medium w-16">
              On reply
            </label>
            <div className="flex items-center gap-2">
              {(["stop", "continue"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => handleFieldChange("send_on_reply", option)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors",
                    step.send_on_reply === option
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option === "stop" ? "Stop sequence" : "Continue sending"}
                </button>
              ))}
            </div>
          </div>

          {/* Merge fields help */}
          <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-muted/50">
            <AlertCircle className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              Merge fields: {"{first_name}"}, {"{last_name}"}, {"{company}"},{" "}
              {"{deal_value}"}, {"{title}"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sequence Builder ────────────────────────────────────────────

interface SequenceBuilderProps {
  steps: SequenceStep[];
  onChange: (steps: SequenceStep[]) => void;
}

export function SequenceBuilder({ steps, onChange }: SequenceBuilderProps) {
  const handleAdd = useCallback(() => {
    const newStep: SequenceStep = {
      order: steps.length + 1,
      delay_days: steps.length === 0 ? 0 : 2,
      delay_hours: 0,
      template_subject: "",
      template_body: "",
      send_on_reply: "stop",
    };
    onChange([...steps, newStep]);
  }, [steps, onChange]);

  const handleUpdate = useCallback(
    (index: number, updated: SequenceStep) => {
      const next = steps.map((s, i) => (i === index ? updated : s));
      onChange(next);
    },
    [steps, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 }));
      onChange(next);
    },
    [steps, onChange]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...steps];
      const temp = next[index - 1];
      next[index - 1] = { ...next[index], order: index };
      next[index] = { ...temp, order: index + 1 };
      onChange(next);
    },
    [steps, onChange]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === steps.length - 1) return;
      const next = [...steps];
      const temp = next[index + 1];
      next[index + 1] = { ...next[index], order: index + 2 };
      next[index] = { ...temp, order: index + 1 };
      onChange(next);
    },
    [steps, onChange]
  );

  return (
    <div className="space-y-2">
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Mail className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            No steps yet. Add your first email step to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index}>
              {/* Delay connector line */}
              {index > 0 && (
                <div className="flex items-center gap-2 py-1 pl-5">
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />
                    Wait{" "}
                    {step.delay_days > 0 ? `${step.delay_days} day${step.delay_days > 1 ? "s" : ""}` : ""}
                    {step.delay_days > 0 && step.delay_hours > 0 ? " " : ""}
                    {step.delay_hours > 0 ? `${step.delay_hours}h` : ""}
                    {step.delay_days === 0 && step.delay_hours === 0 ? "immediately" : ""}
                  </div>
                </div>
              )}
              <StepCard
                step={step}
                index={index}
                totalSteps={steps.length}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add step button */}
      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent/30 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Step
      </button>
    </div>
  );
}
