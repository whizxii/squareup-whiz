"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useContacts } from "@/lib/hooks/use-crm-queries";
import { BulkActionBar } from "@/components/crm/BulkActionBar";
import type { Contact, CRMStage } from "@/lib/types/crm";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────

const STAGE_COLORS: Record<CRMStage, string> = {
  lead: "bg-gray-400 text-white",
  qualified: "bg-blue-500 text-white",
  proposal: "bg-yellow-500 text-black",
  negotiation: "bg-orange-500 text-white",
  won: "bg-green-500 text-white",
  lost: "bg-red-500 text-white",
};

type SortField = "name" | "company" | "email" | "stage" | "value" | "lead_score" | "created_at";
type SortDir = "asc" | "desc";

interface ColumnConfig {
  id: SortField;
  label: string;
  className?: string;
  hiddenBelow?: "md" | "lg" | "xl";
}

const COLUMNS: ColumnConfig[] = [
  { id: "name", label: "Name" },
  { id: "company", label: "Company", hiddenBelow: "md" },
  { id: "email", label: "Email", hiddenBelow: "lg" },
  { id: "stage", label: "Stage" },
  { id: "lead_score", label: "Score", hiddenBelow: "xl" },
  { id: "value", label: "Value", className: "text-right" },
  { id: "created_at", label: "Created", hiddenBelow: "xl" },
];

const PAGE_SIZE = 50;

// ─── Helpers ────────────────────────────────────────────────────────

function getSortedContacts(
  contacts: Contact[],
  sortField: SortField,
  sortDir: SortDir
): Contact[] {
  return [...contacts].sort((a, b) => {
    let cmp = 0;
    const av = a[sortField];
    const bv = b[sortField];
    if (av == null && bv == null) cmp = 0;
    else if (av == null) cmp = -1;
    else if (bv == null) cmp = 1;
    else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "\u2014";
  }
}

function hiddenClass(below?: "md" | "lg" | "xl"): string {
  if (!below) return "";
  if (below === "md") return "hidden md:table-cell";
  if (below === "lg") return "hidden lg:table-cell";
  return "hidden xl:table-cell";
}

// ─── Component ──────────────────────────────────────────────────────

export function TableView() {
  const router = useRouter();
  const searchQuery = useCRMUIStore((s) => s.searchQuery);
  const filters = useCRMUIStore((s) => s.filters);
  const setSelectedContactId = useCRMUIStore((s) => s.setSelectedContactId);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  // Build filters for API
  const contactFilters = useMemo(() => ({
    search: searchQuery || undefined,
    stage: filters.stages.length === 1 ? filters.stages[0] : undefined,
    source: filters.sources.length === 1 ? filters.sources[0] : undefined,
    owner_id: filters.owners.length === 1 ? filters.owners[0] : undefined,
  }), [searchQuery, filters]);

  const { data, isLoading } = useContacts(
    contactFilters,
    { limit: 200 },
    { sort_by: sortField, sort_order: sortDir }
  );
  const allContacts = data?.items ?? [];

  // Client-side sort + paginate
  const sorted = useMemo(
    () => getSortedContacts(allContacts, sortField, sortDir),
    [allContacts, sortField, sortDir]
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageContacts = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === pageContacts.length) return new Set();
      return new Set(pageContacts.map((c) => c.id));
    });
  }, [pageContacts]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  const handleRowClick = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id);
    router.push(`/crm/contacts/${contact.id}`);
  }, [router, setSelectedContactId]);

  const allOnPageSelected =
    pageContacts.length > 0 && selectedIds.size === pageContacts.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          onClear={clearSelection}
        />
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {/* Checkbox */}
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.id)}
                  className={cn(
                    "text-left px-4 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors",
                    col.className,
                    hiddenClass(col.hiddenBelow)
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortField === col.id ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center py-12 text-muted-foreground">
                  Loading contacts...
                </td>
              </tr>
            ) : pageContacts.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center py-12 text-muted-foreground">
                  No contacts found.
                </td>
              </tr>
            ) : (
              pageContacts.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b border-border hover:bg-accent/30 cursor-pointer transition-all duration-150 group",
                    selectedIds.has(c.id) && "bg-primary/5"
                  )}
                >
                  <td className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-border"
                    />
                  </td>
                  <td
                    className="px-4 py-3 font-medium"
                    onClick={() => handleRowClick(c)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{c.name}</span>
                    </div>
                  </td>
                  <td
                    className={cn("px-4 py-3 text-muted-foreground", hiddenClass("md"))}
                    onClick={() => handleRowClick(c)}
                  >
                    {c.company || "\u2014"}
                  </td>
                  <td
                    className={cn("px-4 py-3 text-muted-foreground", hiddenClass("lg"))}
                    onClick={() => handleRowClick(c)}
                  >
                    {c.email || "\u2014"}
                  </td>
                  <td className="px-4 py-3" onClick={() => handleRowClick(c)}>
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        STAGE_COLORS[c.stage]
                      )}
                    >
                      {c.stage}
                    </span>
                  </td>
                  <td
                    className={cn("px-4 py-3 text-muted-foreground", hiddenClass("xl"))}
                    onClick={() => handleRowClick(c)}
                  >
                    {c.lead_score != null ? (
                      <span
                        className={cn(
                          "font-mono text-xs",
                          c.lead_score >= 70
                            ? "text-green-600"
                            : c.lead_score >= 40
                              ? "text-yellow-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {c.lead_score}
                      </span>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono"
                    onClick={() => handleRowClick(c)}
                  >
                    {c.value
                      ? formatCurrency(c.value, c.currency || "INR")
                      : "\u2014"}
                  </td>
                  <td
                    className={cn("px-4 py-3 text-muted-foreground text-xs", hiddenClass("xl"))}
                    onClick={() => handleRowClick(c)}
                  >
                    {formatDate(c.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card shrink-0">
          <span className="text-xs text-muted-foreground">
            {sorted.length} contacts \u2014 Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
