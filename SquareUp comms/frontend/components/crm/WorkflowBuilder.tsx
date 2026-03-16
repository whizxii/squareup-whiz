"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useActivateWorkflow,
  useDeactivateWorkflow,
  useTestWorkflow,
  useWorkflowHistory,
} from "@/lib/hooks/use-crm-queries";
import type {
  Workflow,
  WorkflowTrigger,
  WorkflowTriggerType,
  WorkflowAction,
  WorkflowActionType,
  WorkflowCondition,
} from "@/lib/types/crm";
import {
  Workflow as WorkflowIcon,
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Save,
  Zap,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Trigger / Action config ────────────────────────────────────

const TRIGGER_OPTIONS: { type: WorkflowTriggerType; label: string; description: string }[] = [
  { type: "contact.created", label: "Contact Created", description: "When a new contact is added" },
  { type: "deal.stage_changed", label: "Deal Stage Changed", description: "When a deal moves to a new stage" },
  { type: "activity.logged", label: "Activity Logged", description: "When an activity is recorded" },
  { type: "score.changed", label: "Score Changed", description: "When a lead score is updated" },
  { type: "field.updated", label: "Field Updated", description: "When a contact or deal field changes" },
  { type: "manual", label: "Manual Trigger", description: "Execute manually or via API" },
];

const ACTION_OPTIONS: { type: WorkflowActionType; label: string }[] = [
  { type: "update_field", label: "Update Field" },
  { type: "create_activity", label: "Create Activity" },
  { type: "send_notification", label: "Send Notification" },
  { type: "add_tag", label: "Add Tag" },
  { type: "move_stage", label: "Move Stage" },
  { type: "assign_owner", label: "Assign Owner" },
  { type: "send_email", label: "Send Email" },
  { type: "enroll_sequence", label: "Enroll in Sequence" },
  { type: "create_task", label: "Create Task" },
  { type: "webhook", label: "Webhook" },
];

// ─── Workflow Execution History ─────────────────────────────────

function ExecutionHistory({ workflowId }: { workflowId: string }) {
  const { data, isLoading } = useWorkflowHistory(workflowId);
  const items = data?.data?.items ?? [];

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">No executions yet.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {items.map((ex: { id: string; status: string; trigger_event: string; actions_executed: number; actions_failed: number; executed_at: string }) => (
        <div
          key={ex.id}
          className="flex items-center justify-between px-3 py-2 text-xs bg-muted/40 rounded-lg"
        >
          <div className="flex items-center gap-2">
            {ex.status === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : ex.status === "failed" ? (
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="capitalize">{ex.status}</span>
            <span className="text-muted-foreground">
              {ex.actions_executed} executed, {ex.actions_failed} failed
            </span>
          </div>
          <span className="text-muted-foreground">
            {new Date(ex.executed_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Workflow Card ───────────────────────────────────────────────

function WorkflowCard({
  workflow,
  onEdit,
  onToggleStatus,
  onDelete,
  isToggling,
}: {
  workflow: Workflow;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isToggling: boolean;
}) {
  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.type === workflow.trigger?.type)?.label ?? workflow.trigger?.type ?? "—";

  return (
    <div className="border border-border rounded-xl p-4 hover:shadow-sm transition-shadow bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{workflow.name}</h3>
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                workflow.is_active
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {workflow.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {workflow.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{workflow.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleStatus(workflow.id, workflow.is_active)}
            disabled={isToggling}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title={workflow.is_active ? "Deactivate" : "Activate"}
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : workflow.is_active ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onEdit(workflow.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(workflow.id)}
            className="p-1.5 rounded-md hover:bg-muted text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>{triggerLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          <span>{workflow.actions?.length ?? 0} actions</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>{workflow.execution_count} runs</span>
        </div>
      </div>
    </div>
  );
}

// ─── Condition Builder ──────────────────────────────────────────

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: WorkflowCondition;
  index: number;
  onChange: (idx: number, c: WorkflowCondition) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={condition.field}
        onChange={(e) => onChange(index, { ...condition, field: e.target.value })}
        placeholder="Field name"
        className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background"
      />
      <select
        value={condition.operator}
        onChange={(e) => onChange(index, { ...condition, operator: e.target.value as WorkflowCondition["operator"] })}
        className="px-2 py-1.5 text-xs border border-border rounded-md bg-background"
      >
        <option value="equals">equals</option>
        <option value="not_equals">not equals</option>
        <option value="contains">contains</option>
        <option value="gt">greater than</option>
        <option value="lt">less than</option>
        <option value="gte">gte</option>
        <option value="lte">lte</option>
        <option value="is_empty">is empty</option>
        <option value="is_not_empty">is not empty</option>
      </select>
      <input
        value={String(condition.value ?? "")}
        onChange={(e) => onChange(index, { ...condition, value: e.target.value })}
        placeholder="Value"
        className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background"
      />
      <button
        onClick={() => onRemove(index)}
        className="p-1 text-red-500 hover:bg-muted rounded-md"
      >
        <XCircle className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Action Builder ─────────────────────────────────────────────

function ActionRow({
  action,
  index,
  onChange,
  onRemove,
}: {
  action: WorkflowAction;
  index: number;
  onChange: (idx: number, a: WorkflowAction) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="border border-border rounded-lg p-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <select
          value={action.type}
          onChange={(e) =>
            onChange(index, { ...action, type: e.target.value as WorkflowActionType })
          }
          className="px-2 py-1.5 text-xs border border-border rounded-md bg-background font-medium"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.type} value={opt.type}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onRemove(index)}
          className="p-1 text-red-500 hover:bg-muted rounded-md"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <textarea
        value={JSON.stringify(action.params ?? {}, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(index, { ...action, params: parsed });
          } catch {
            // Allow invalid JSON while typing
          }
        }}
        rows={3}
        className="w-full px-2 py-1.5 text-xs font-mono border border-border rounded-md bg-background resize-none"
        placeholder='{ "field": "stage", "value": "qualified" }'
      />
    </div>
  );
}

// ─── Editor Form ────────────────────────────────────────────────

interface EditorState {
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_active: boolean;
}

function WorkflowEditor({
  initial,
  workflowId,
  onBack,
}: {
  initial?: Workflow;
  workflowId?: string;
  onBack: () => void;
}) {
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const testMutation = useTestWorkflow();

  const [state, setState] = useState<EditorState>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    triggerType: initial?.trigger?.type ?? "contact.created",
    conditions: initial?.trigger?.conditions ?? [],
    actions: initial?.actions ?? [],
    is_active: initial?.is_active ?? false,
  });

  const [testContext, setTestContext] = useState("{}");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSave = useCallback(async () => {
    const payload = {
      name: state.name,
      description: state.description || undefined,
      trigger: {
        type: state.triggerType,
        conditions: state.conditions,
      },
      actions: state.actions,
      is_active: state.is_active,
    };

    if (workflowId) {
      await updateMutation.mutateAsync({ id: workflowId, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onBack();
  }, [state, workflowId, createMutation, updateMutation, onBack]);

  const handleTest = useCallback(async () => {
    if (!workflowId) return;
    try {
      const ctx = JSON.parse(testContext);
      const result = await testMutation.mutateAsync({ id: workflowId, context: ctx });
      setTestResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : "Invalid JSON"}`);
    }
  }, [workflowId, testContext, testMutation]);

  const addCondition = () => {
    setState((s) => ({
      ...s,
      conditions: [...s.conditions, { field: "", operator: "equals" as const, value: "" }],
    }));
  };

  const updateCondition = (idx: number, c: WorkflowCondition) => {
    setState((s) => ({
      ...s,
      conditions: s.conditions.map((existing, i) => (i === idx ? c : existing)),
    }));
  };

  const removeCondition = (idx: number) => {
    setState((s) => ({
      ...s,
      conditions: s.conditions.filter((_, i) => i !== idx),
    }));
  };

  const addAction = () => {
    setState((s) => ({
      ...s,
      actions: [...s.actions, { type: "update_field" as const, params: {} }],
    }));
  };

  const updateAction = (idx: number, a: WorkflowAction) => {
    setState((s) => ({
      ...s,
      actions: s.actions.map((existing, i) => (i === idx ? a : existing)),
    }));
  };

  const removeAction = (idx: number) => {
    setState((s) => ({
      ...s,
      actions: s.actions.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold">
            {workflowId ? "Edit Workflow" : "Create Workflow"}
          </h2>
        </div>

        {/* Name & Description */}
        <div className="space-y-3">
          <input
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            placeholder="Workflow name"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-medium"
          />
          <textarea
            value={state.description}
            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none"
          />
        </div>

        {/* Trigger */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Trigger
          </h3>
          <select
            value={state.triggerType}
            onChange={(e) => setState((s) => ({ ...s, triggerType: e.target.value as WorkflowTriggerType }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label} — {t.description}
              </option>
            ))}
          </select>
        </div>

        {/* Conditions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Conditions</h3>
            <button
              onClick={addCondition}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" /> Add condition
            </button>
          </div>
          {state.conditions.length === 0 && (
            <p className="text-xs text-muted-foreground">No conditions — workflow runs on every trigger match.</p>
          )}
          <div className="space-y-2">
            {state.conditions.map((c, i) => (
              <ConditionRow key={i} condition={c} index={i} onChange={updateCondition} onRemove={removeCondition} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-500" />
              Actions
            </h3>
            <button
              onClick={addAction}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" /> Add action
            </button>
          </div>
          {state.actions.length === 0 && (
            <p className="text-xs text-muted-foreground">No actions configured yet.</p>
          )}
          <div className="space-y-3">
            {state.actions.map((a, i) => (
              <ActionRow key={i} action={a} index={i} onChange={updateAction} onRemove={removeAction} />
            ))}
          </div>
        </div>

        {/* Test (only for existing workflows) */}
        {workflowId && (
          <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-500" />
                Test Workflow
              </h3>
              <button
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run Test
              </button>
            </div>
            <textarea
              value={testContext}
              onChange={(e) => setTestContext(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-xs font-mono border border-border rounded-lg bg-background resize-none"
              placeholder='{ "contact_id": "...", "stage": "qualified" }'
            />
            {testResult && (
              <pre className="px-3 py-2 text-xs font-mono bg-background rounded-lg border border-border overflow-auto max-h-32">
                {testResult}
              </pre>
            )}
          </div>
        )}

        {/* Execution History */}
        {workflowId && (
          <div className="space-y-3">
            <button
              onClick={() => setShowHistory((h) => !h)}
              className="flex items-center gap-2 text-sm font-semibold"
            >
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Execution History
            </button>
            {showHistory && <ExecutionHistory workflowId={workflowId} />}
          </div>
        )}

        {/* Save */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={!state.name.trim() || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {workflowId ? "Update Workflow" : "Create Workflow"}
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Workflows View ────────────────────────────────────────

export function WorkflowsView() {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useWorkflows({ search: search || undefined });
  const activateMutation = useActivateWorkflow();
  const deactivateMutation = useDeactivateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const workflows: Workflow[] = data?.data?.items ?? [];

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setMode("edit");
  }, []);

  const handleToggleStatus = useCallback(
    (id: string, isActive: boolean) => {
      if (isActive) {
        deactivateMutation.mutate(id);
      } else {
        activateMutation.mutate(id);
      }
    },
    [activateMutation, deactivateMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this workflow?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const handleBack = useCallback(() => {
    setMode("list");
    setEditingId(null);
  }, []);

  // Editor modes
  if (mode === "create") {
    return <WorkflowEditor onBack={handleBack} />;
  }

  if (mode === "edit" && editingId) {
    const workflow = workflows.find((w) => w.id === editingId);
    return (
      <WorkflowEditor
        initial={workflow}
        workflowId={editingId}
        onBack={handleBack}
      />
    );
  }

  // List mode
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Workflow Automation</h2>
            <p className="text-xs text-muted-foreground">
              Create trigger → condition → action rules to automate your CRM
            </p>
          </div>
          <button
            onClick={() => setMode("create")}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:brightness-110 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflows..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
        />

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={<WorkflowIcon className="w-6 h-6" />}
            title="No workflows yet"
            description="Create your first workflow to automate repetitive CRM tasks."
            action={{
              label: "Create Workflow",
              onClick: () => setMode("create"),
            }}
          />
        ) : (
          <div className="space-y-3">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                isToggling={
                  activateMutation.isPending || deactivateMutation.isPending
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
