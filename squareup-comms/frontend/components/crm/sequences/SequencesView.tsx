"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useSequences,
  useCreateSequence,
  useUpdateSequence,
  usePauseSequence,
  useActivateSequence,
} from "@/lib/hooks/use-crm-queries";
import { SequenceBuilder } from "./SequenceBuilder";
import { EnrollmentList } from "./EnrollmentList";
import type { EmailSequence, SequenceStep } from "@/lib/types/crm";
import { formatRelativeTime } from "@/lib/format";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Pencil,
  Users,
  Mail,
  CheckCircle2,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";

// ─── Sequence Stats ──────────────────────────────────────────────

function SequenceStats({ sequence }: { sequence: EmailSequence }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Users className="w-3 h-3" />
        <span>{sequence.total_enrolled} enrolled</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        <span>{sequence.total_completed} completed</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
        <MessageSquare className="w-3 h-3" />
        <span>{sequence.total_replied} replied</span>
      </div>
    </div>
  );
}

// ─── Sequence Card ───────────────────────────────────────────────

function SequenceCard({
  sequence,
  onEdit,
  onToggleStatus,
  isTogglingStatus,
}: {
  sequence: EmailSequence;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  isTogglingStatus: boolean;
}) {
  const statusConfig: Record<string, { className: string; label: string }> = {
    active: {
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      label: "Active",
    },
    paused: {
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      label: "Paused",
    },
    archived: {
      className: "bg-muted text-muted-foreground",
      label: "Archived",
    },
  };

  const sc = statusConfig[sequence.status] ?? statusConfig.paused;

  return (
    <div className="rounded-lg border border-border p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate">{sequence.name}</h3>
            <span
              className={cn(
                "text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                sc.className
              )}
            >
              {sc.label}
            </span>
          </div>

          {sequence.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {sequence.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <SequenceStats sequence={sequence} />
            <span className="text-[10px] text-muted-foreground/50">&middot;</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span>{sequence.steps.length} steps</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Created {formatRelativeTime(sequence.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {sequence.status !== "archived" && (
            <button
              onClick={() => onToggleStatus(sequence.id, sequence.status)}
              disabled={isTogglingStatus}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title={sequence.status === "active" ? "Pause" : "Activate"}
            >
              {isTogglingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : sequence.status === "active" ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={() => onEdit(sequence.id)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit Form ──────────────────────────────────────────

interface SequenceFormProps {
  initialName?: string;
  initialDescription?: string;
  initialSteps?: SequenceStep[];
  isPending: boolean;
  onSubmit: (data: {
    name: string;
    description: string;
    steps: SequenceStep[];
  }) => void;
  onCancel: () => void;
  submitLabel: string;
}

function SequenceForm({
  initialName = "",
  initialDescription = "",
  initialSteps = [],
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
}: SequenceFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), steps });
  }, [name, description, steps, onSubmit]);

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sequences
      </button>

      {/* Name + description */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Sequence Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Hot Lead Follow-up"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this sequence"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
          />
        </div>
      </div>

      {/* Steps builder */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Steps ({steps.length})
        </p>
        <SequenceBuilder steps={steps} onChange={setSteps} />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Sequences View ──────────────────────────────────────────────

type ViewState =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; sequenceId: string };

export function SequencesView() {
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading } = useSequences();
  const createSequence = useCreateSequence();
  const updateSequence = useUpdateSequence();
  const pauseSequence = usePauseSequence();
  const activateSequence = useActivateSequence();

  const sequences: EmailSequence[] = data?.data ?? [];

  const handleCreate = useCallback(
    (formData: { name: string; description: string; steps: SequenceStep[] }) => {
      createSequence.mutate(formData, {
        onSuccess: () => setView({ mode: "list" }),
      });
    },
    [createSequence]
  );

  const handleUpdate = useCallback(
    (formData: { name: string; description: string; steps: SequenceStep[] }) => {
      if (view.mode !== "edit") return;
      updateSequence.mutate(
        { id: view.sequenceId, data: formData },
        { onSuccess: () => setView({ mode: "list" }) }
      );
    },
    [view, updateSequence]
  );

  const handleToggleStatus = useCallback(
    (id: string, currentStatus: string) => {
      setTogglingId(id);
      const mutation = currentStatus === "active" ? pauseSequence : activateSequence;
      mutation.mutate(id, {
        onSettled: () => setTogglingId(null),
      });
    },
    [pauseSequence, activateSequence]
  );

  // Loading
  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={90} className="rounded-lg" />
        ))}
      </div>
    );
  }

  // Create form
  if (view.mode === "create") {
    return (
      <div className="p-6">
        <SequenceForm
          isPending={createSequence.isPending}
          onSubmit={handleCreate}
          onCancel={() => setView({ mode: "list" })}
          submitLabel="Create Sequence"
        />
      </div>
    );
  }

  // Edit form
  if (view.mode === "edit") {
    const seq = sequences.find((s) => s.id === view.sequenceId);
    if (!seq) {
      return (
        <div className="p-6">
          <EmptyState
            icon={<Workflow className="w-6 h-6" />}
            title="Sequence not found"
            action={{
              label: "Back to list",
              onClick: () => setView({ mode: "list" }),
            }}
          />
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <SequenceForm
          key={view.sequenceId}
          initialName={seq.name}
          initialDescription={seq.description}
          initialSteps={seq.steps}
          isPending={updateSequence.isPending}
          onSubmit={handleUpdate}
          onCancel={() => setView({ mode: "list" })}
          submitLabel="Save Changes"
        />

        {/* Enrollments for this sequence */}
        <div className="border-t border-border pt-6">
          <EnrollmentList sequenceId={view.sequenceId} />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Email Sequences</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Automate multi-step email outreach
          </p>
        </div>
        <button
          onClick={() => setView({ mode: "create" })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Sequence
        </button>
      </div>

      {/* Sequence list */}
      {sequences.length === 0 ? (
        <EmptyState
          icon={<Workflow className="w-6 h-6" />}
          title="No sequences yet"
          description="Create email sequences to automate follow-ups and outreach campaigns."
          action={{
            label: "Create Sequence",
            onClick: () => setView({ mode: "create" }),
          }}
          className="min-h-[300px]"
        />
      ) : (
        <div className="space-y-2">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              onEdit={(id) => setView({ mode: "edit", sequenceId: id })}
              onToggleStatus={handleToggleStatus}
              isTogglingStatus={togglingId === seq.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
