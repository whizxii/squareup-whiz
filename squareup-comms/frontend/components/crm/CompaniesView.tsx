"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { useCompanies, useCreateCompany } from "@/lib/hooks/use-crm-queries";
import type { Company } from "@/lib/types/crm";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/format";

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(APP_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  });
}

// ─── Row ─────────────────────────────────────────────────────────

function CompanyRow({
  company,
  onClick,
}: {
  company: Company;
  onClick: (c: Company) => void;
}) {
  return (
    <tr
      className="border-b border-border hover:bg-accent/40 cursor-pointer transition-colors"
      onClick={() => onClick(company)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="font-medium text-sm">{company.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
        {company.domain ?? company.website ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
        {company.industry ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
        {company.size ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
        {formatDate((company as unknown as Record<string, string>).created_at)}
      </td>
    </tr>
  );
}

// ─── CompaniesView ────────────────────────────────────────────────

export function CompaniesView() {
  const { data, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const companies: Company[] = (data as unknown as { items?: Company[] })?.items ?? (Array.isArray(data) ? (data as Company[]) : []);

  async function handleCreate() {
    if (!newName.trim()) return;
    await createCompany.mutateAsync({ name: newName.trim() });
    setNewName("");
    setShowCreate(false);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main table */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">
            Companies
            {companies.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({companies.length})
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Company
          </button>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <div className="px-4 py-2 border-b border-border bg-accent/30 flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreate(false);
              }}
              placeholder="Company name…"
              className="flex-1 text-sm bg-background border border-input rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleCreate}
              disabled={createCompany.isPending}
              className="text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createCompany.isPending ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs px-2 py-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : companies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No companies yet. Add one to get started.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Company
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border">
              <tr>
                <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Domain
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Industry
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                  Size
                </th>
                <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <CompanyRow
                  key={c.id}
                  company={c}
                  onClick={(company) => router.push(`/crm/companies/${company.id}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
