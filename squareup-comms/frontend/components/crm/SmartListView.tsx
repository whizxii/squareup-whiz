"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useSmartLists,
  useSmartList,
  useSmartListMembers,
  useCreateSmartList,
  useUpdateSmartList,
  useDeleteSmartList,
  useRefreshSmartList,
  useGenerateLookalike,
} from "@/lib/hooks/use-crm-queries";
import type {
  SmartList,
  SmartListCriteria,
  CriteriaOperator,
  Contact,
} from "@/lib/types/crm";
import {
  ListFilter,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Save,
  RefreshCw,
  Users,
  Eye,
  Sparkles,
  XCircle,
  Share2,
  Globe,
  Lock,
} from "lucide-react";

// ─── Criteria field options ─────────────────────────────────────

const FIELD_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "title", label: "Title" },
  { value: "stage", label: "Stage" },
  { value: "lifecycle_stage", label: "Lifecycle Stage" },
  { value: "source", label: "Source" },
  { value: "lead_score", label: "Lead Score" },
  { value: "owner_id", label: "Owner" },
  { value: "created_at", label: "Created At" },
  { value: "updated_at", label: "Updated At" },
  { value: "last_activity_at", label: "Last Activity" },
];

const OPERATOR_OPTIONS: { value: CriteriaOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "gte", label: "at least" },
  { value: "lte", label: "at most" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "in_list", label: "in list" },
  { value: "not_in_list", label: "not in list" },
  { value: "date_before", label: "before" },
  { value: "date_after", label: "after" },
  { value: "date_in_last_days", label: "in last N days" },
];

// ─── Member Table ───────────────────────────────────────────────

function MemberTable({ listId }: { listId: string }) {
  const { data, isLoading } = useSmartListMembers(listId);
  const members: Contact[] = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        No contacts match this criteria.
      </p>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">Stage</th>
            <th className="px-3 py-2 font-medium text-right">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((c) => (
            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 font-medium">
                {c.name}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{c.email ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{c.company ?? "—"}</td>
              <td className="px-3 py-2">
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted capitalize">
                  {c.stage ?? "—"}
                </span>
              </td>
              <td className="px-3 py-2 text-right">{c.lead_score ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lookalike Results ──────────────────────────────────────────

function LookalikePanel({ listId }: { listId: string }) {
  const mutation = useGenerateLookalike();
  const [results, setResults] = useState<Contact[]>([]);

  const handleGenerate = useCallback(async () => {
    const res = await mutation.mutateAsync({ id: listId, limit: 20 });
    setResults(res?.items ?? []);
  }, [listId, mutation]);

  return (
    <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Lookalike Contacts
        </h4>
        <button
          onClick={handleGenerate}
          disabled={mutation.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Generate
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {results.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 text-xs bg-background rounded-lg">
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">{c.email}</span>
              <span className="text-muted-foreground">{c.company ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && !mutation.isPending && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Click Generate to find similar contacts not in this list.
        </p>
      )}
    </div>
  );
}

// ─── Criteria Row ───────────────────────────────────────────────

function CriteriaRow({
  criteria,
  index,
  onChange,
  onRemove,
}: {
  criteria: SmartListCriteria;
  index: number;
  onChange: (idx: number, c: SmartListCriteria) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {index > 0 && (
        <select
          value={criteria.conjunction}
          onChange={(e) =>
            onChange(index, { ...criteria, conjunction: e.target.value as "and" | "or" })
          }
          className="px-2 py-1.5 text-xs border border-border rounded-md bg-background w-16"
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      )}
      {index === 0 && <div className="w-16 text-xs text-muted-foreground text-center">Where</div>}
      <select
        value={criteria.field}
        onChange={(e) => onChange(index, { ...criteria, field: e.target.value })}
        className="px-2 py-1.5 text-xs border border-border rounded-md bg-background flex-1"
      >
        {FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        value={criteria.operator}
        onChange={(e) => onChange(index, { ...criteria, operator: e.target.value as CriteriaOperator })}
        className="px-2 py-1.5 text-xs border border-border rounded-md bg-background"
      >
        {OPERATOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        value={String(criteria.value ?? "")}
        onChange={(e) => onChange(index, { ...criteria, value: e.target.value })}
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

// ─── Smart List Card ────────────────────────────────────────────

function SmartListCard({
  list,
  onView,
  onEdit,
  onDelete,
}: {
  list: SmartList;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-border rounded-xl p-4 hover:shadow-sm transition-shadow bg-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{list.name}</h3>
            {list.is_shared ? (
              <span title="Shared"><Globe className="w-3 h-3 text-blue-500" /></span>
            ) : (
              <span title="Private"><Lock className="w-3 h-3 text-muted-foreground" /></span>
            )}
          </div>
          {list.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{list.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onView(list.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="View members"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(list.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(list.id)}
            className="p-1.5 rounded-md hover:bg-muted text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{list.member_count} contacts</span>
        </div>
        <div className="flex items-center gap-1">
          <ListFilter className="w-3 h-3" />
          <span>{list.criteria?.length ?? 0} criteria</span>
        </div>
        {list.auto_refresh && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <RefreshCw className="w-3 h-3" />
            <span>Auto-refresh</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editor Form ────────────────────────────────────────────────

interface SmartListEditorState {
  name: string;
  description: string;
  criteria: SmartListCriteria[];
  sort_by: string;
  sort_order: "asc" | "desc";
  columns: string[];
  is_shared: boolean;
  auto_refresh: boolean;
}

const DEFAULT_COLUMNS = ["name", "email", "company", "stage"];

function SmartListEditor({
  initial,
  listId,
  onBack,
}: {
  initial?: SmartList;
  listId?: string;
  onBack: () => void;
}) {
  const createMutation = useCreateSmartList();
  const updateMutation = useUpdateSmartList();

  const [state, setState] = useState<SmartListEditorState>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    criteria: initial?.criteria ?? [],
    sort_by: initial?.sort_by ?? "created_at",
    sort_order: initial?.sort_order ?? "desc",
    columns: initial?.columns ?? DEFAULT_COLUMNS,
    is_shared: initial?.is_shared ?? false,
    auto_refresh: initial?.auto_refresh ?? true,
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSave = useCallback(async () => {
    const payload = {
      name: state.name,
      description: state.description || undefined,
      criteria: state.criteria,
      sort_by: state.sort_by,
      sort_order: state.sort_order,
      columns: state.columns,
      is_shared: state.is_shared,
      auto_refresh: state.auto_refresh,
    };

    if (listId) {
      await updateMutation.mutateAsync({ id: listId, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onBack();
  }, [state, listId, createMutation, updateMutation, onBack]);

  const addCriteria = () => {
    setState((s) => ({
      ...s,
      criteria: [
        ...s.criteria,
        { field: "stage", operator: "equals" as CriteriaOperator, value: "", conjunction: "and" as const },
      ],
    }));
  };

  const updateCriteria = (idx: number, c: SmartListCriteria) => {
    setState((s) => ({
      ...s,
      criteria: s.criteria.map((existing, i) => (i === idx ? c : existing)),
    }));
  };

  const removeCriteria = (idx: number) => {
    setState((s) => ({
      ...s,
      criteria: s.criteria.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold">
            {listId ? "Edit Smart List" : "Create Smart List"}
          </h2>
        </div>

        {/* Name & Description */}
        <div className="space-y-3">
          <input
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            placeholder="Smart list name"
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

        {/* Criteria Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-blue-500" />
              Criteria
            </h3>
            <button
              onClick={addCriteria}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" /> Add filter
            </button>
          </div>
          {state.criteria.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No criteria — list will include all contacts.
            </p>
          )}
          <div className="space-y-2">
            {state.criteria.map((c, i) => (
              <CriteriaRow key={i} criteria={c} index={i} onChange={updateCriteria} onRemove={removeCriteria} />
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.is_shared}
              onChange={(e) => setState((s) => ({ ...s, is_shared: e.target.checked }))}
              className="rounded border-border"
            />
            <Share2 className="w-3.5 h-3.5" />
            Share with team
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.auto_refresh}
              onChange={(e) => setState((s) => ({ ...s, auto_refresh: e.target.checked }))}
              className="rounded border-border"
            />
            <RefreshCw className="w-3.5 h-3.5" />
            Auto-refresh
          </label>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={!state.name.trim() || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {listId ? "Update Smart List" : "Create Smart List"}
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

// ─── Detail View with Members ───────────────────────────────────

function SmartListDetail({
  listId,
  onBack,
  onEdit,
}: {
  listId: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { data } = useSmartList(listId);
  const refreshMutation = useRefreshSmartList();
  const list = data;

  if (!list) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">{list.name}</h2>
              {list.description && (
                <p className="text-xs text-muted-foreground">{list.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshMutation.mutate(listId)}
              disabled={refreshMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
            >
              {refreshMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Refresh
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:brightness-110 transition-all"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="font-medium text-foreground">{list.member_count}</span> contacts
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListFilter className="w-4 h-4" />
            <span>{list.criteria?.length ?? 0}</span> criteria
          </div>
          {list.is_shared && (
            <span className="text-xs text-blue-600 dark:text-blue-400">Shared</span>
          )}
        </div>

        {/* Members */}
        <MemberTable listId={listId} />

        {/* Lookalike */}
        <LookalikePanel listId={listId} />
      </div>
    </div>
  );
}

// ─── Main Smart Lists View ──────────────────────────────────────

export function SmartListsView() {
  const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSmartLists({ search: search || undefined });
  const deleteMutation = useDeleteSmartList();

  const lists: SmartList[] = data?.items ?? [];

  const handleView = useCallback((id: string) => {
    setSelectedId(id);
    setMode("view");
  }, []);

  const handleEdit = useCallback((id: string) => {
    setSelectedId(id);
    setMode("edit");
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this smart list?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const handleBack = useCallback(() => {
    setMode("list");
    setSelectedId(null);
  }, []);

  // Editor modes
  if (mode === "create") {
    return <SmartListEditor onBack={handleBack} />;
  }

  if (mode === "edit" && selectedId) {
    const list = lists.find((l) => l.id === selectedId);
    return (
      <SmartListEditor
        initial={list}
        listId={selectedId}
        onBack={handleBack}
      />
    );
  }

  if (mode === "view" && selectedId) {
    return (
      <SmartListDetail
        listId={selectedId}
        onBack={handleBack}
        onEdit={() => setMode("edit")}
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
            <h2 className="text-lg font-semibold">Smart Lists</h2>
            <p className="text-xs text-muted-foreground">
              Dynamic contact segments with criteria-based membership
            </p>
          </div>
          <button
            onClick={() => setMode("create")}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:brightness-110 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Smart List
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search smart lists..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
        />

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <EmptyState
            icon={<ListFilter className="w-6 h-6" />}
            title="No smart lists yet"
            description="Create dynamic contact segments to organize and target your contacts."
            action={{
              label: "Create Smart List",
              onClick: () => setMode("create"),
            }}
          />
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <SmartListCard
                key={list.id}
                list={list}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
