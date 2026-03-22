"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCompany360 } from "@/lib/hooks/use-crm-queries";
import type {
  Company360Response,
  Contact,
  Deal,
  Company360PipelineSummary,
  Company360ContactSummary,
  Company,
} from "@/lib/types/crm";
import {
  Building2,
  Globe,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  BarChart3,
  Trophy,
  XCircle,
  ExternalLink,
  User,
  Briefcase,
} from "lucide-react";

// ─── Tab config ─────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: "contacts", label: "Contacts", icon: <Users className="w-3.5 h-3.5" /> },
  { id: "deals", label: "Deals", icon: <TrendingUp className="w-3.5 h-3.5" /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HEALTH_COLORS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

// ─── Loading skeleton ───────────────────────────────────────────

function Company360Skeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="border-b border-border px-6 py-4 space-y-3">
        <Skeleton width="15%" height={12} />
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={48} />
          <div className="space-y-2">
            <Skeleton width={200} height={20} />
            <Skeleton width={140} height={14} />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="border-b border-border px-6">
        <div className="flex gap-4 py-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={80} height={28} className="rounded-md" />
          ))}
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Summary Card ──────────────────────────────────────

function PipelineSummaryCards({ summary }: { summary: Company360PipelineSummary }) {
  const cards = [
    {
      label: "Pipeline Value",
      value: formatCurrency(summary.total_pipeline_value),
      sub: `${summary.open_count} open`,
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-blue-600",
    },
    {
      label: "Won Revenue",
      value: formatCurrency(summary.total_won_value),
      sub: `${summary.won_count} deals`,
      icon: <Trophy className="w-4 h-4" />,
      color: "text-emerald-600",
    },
    {
      label: "Win Rate",
      value: `${summary.win_rate}%`,
      sub: `${summary.won_count}W / ${summary.lost_count}L`,
      icon: <BarChart3 className="w-4 h-4" />,
      color: "text-violet-600",
    },
    {
      label: "Avg Deal",
      value: formatCurrency(summary.avg_deal_value),
      sub: `${summary.total_count} total`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card p-3 space-y-1"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={card.color}>{card.icon}</span>
            {card.label}
          </div>
          <p className="text-lg font-semibold">{card.value}</p>
          <p className="text-[11px] text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Company Header ─────────────────────────────────────────────

function CompanyHeader({
  company,
  contactSummary,
  onBack,
}: {
  company: Company;
  contactSummary: Company360ContactSummary;
  onBack: () => void;
}) {
  return (
    <div className="border-b border-border px-6 py-4 space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to Companies
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <Building2 className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{company.name}</h1>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {company.industry && (
              <span className="px-2 py-0.5 rounded-full bg-muted">{company.industry}</span>
            )}
            {company.size && <span>{company.size} employees</span>}
            {contactSummary.total_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {contactSummary.total_count} contacts
              </span>
            )}
            {contactSummary.avg_lead_score > 0 && (
              <span>Avg score: {contactSummary.avg_lead_score}</span>
            )}
          </div>

          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
            >
              <Globe className="w-3 h-3" />
              {company.domain ?? company.website}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        {company.annual_revenue != null && company.annual_revenue > 0 && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Annual Revenue</p>
            <p className="text-sm font-semibold">{formatCurrency(company.annual_revenue)}</p>
          </div>
        )}
      </div>

      {company.description && (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          {company.description}
        </p>
      )}
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────

function OverviewTab({
  data,
}: {
  data: Company360Response;
}) {
  const recentDeals = [...data.deals]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const recentContacts = [...data.contacts]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <PipelineSummaryCards summary={data.pipeline_summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              Recent Deals
              {data.deals.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  ({data.deals.length})
                </span>
              )}
            </h3>
          </div>
          {recentDeals.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">
              No deals yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentDeals.map((deal) => (
                <div key={deal.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deal.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {deal.stage} &middot; {formatDate(deal.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deal.value != null && (
                      <span className="text-xs font-medium">
                        {formatCurrency(deal.value)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        STATUS_COLORS[deal.status] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {deal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Key Contacts */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Key Contacts
              {data.contacts.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  ({data.contacts.length})
                </span>
              )}
            </h3>
          </div>
          {recentContacts.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">
              No contacts linked
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentContacts.map((contact) => (
                <div key={contact.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {contact.title ?? contact.email ?? "--"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {contact.lead_score > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium">
                        Score: {contact.lead_score}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {contact.lifecycle_stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contacts Tab ───────────────────────────────────────────────

function ContactsTab({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No contacts"
          description="No contacts are linked to this company yet."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Name
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
              Title
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
              Email
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
              Stage
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr
              key={c.id}
              className="border-b border-border hover:bg-accent/40 transition-colors"
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                {c.title ?? "--"}
              </td>
              <td className="px-3 py-2.5 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                {c.email ?? "--"}
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {c.lifecycle_stage}
                </span>
              </td>
              <td className="px-3 py-2.5 text-sm text-right font-medium">
                {c.lead_score > 0 ? c.lead_score : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Deals Tab ──────────────────────────────────────────────────

function DealsTab({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <EmptyState
          icon={<Briefcase className="w-6 h-6" />}
          title="No deals"
          description="No deals are associated with this company."
        />
      </div>
    );
  }

  const sorted = [...deals].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="p-6">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Deal
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
              Stage
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
              Health
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
              Value
            </th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right hidden md:table-cell">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr
              key={d.id}
              className="border-b border-border hover:bg-accent/40 transition-colors"
            >
              <td className="px-3 py-2.5">
                <p className="text-sm font-medium truncate">{d.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(d.expected_close_date ?? d.updated_at)}
                </p>
              </td>
              <td className="px-3 py-2.5 text-sm text-muted-foreground hidden md:table-cell">
                {d.stage}
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    HEALTH_COLORS[d.deal_health] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {d.deal_health}
                </span>
              </td>
              <td className="px-3 py-2.5 text-sm font-medium text-right">
                {d.value != null ? formatCurrency(d.value) : "--"}
              </td>
              <td className="px-3 py-2.5 text-right hidden md:table-cell">
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Company 360 Page ───────────────────────────────────────────

interface Company360PageProps {
  companyId: string;
  onBack: () => void;
}

export function Company360Page({ companyId, onBack }: Company360PageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { data, isLoading, error } = useCompany360(companyId);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  if (isLoading) {
    return <Company360Skeleton />;
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6" />}
          title="Company not found"
          description={
            error?.message || "This company doesn't exist or has been removed."
          }
          action={{ label: "Go Back", onClick: onBack }}
        />
      </div>
    );
  }

  // Normalize backend nulls
  const c360: Company360Response = {
    ...data,
    contacts: data.contacts ?? [],
    deals: data.deals ?? [],
    company: {
      ...data.company,
      social_profiles: data.company.social_profiles ?? {},
      enrichment_data: data.company.enrichment_data ?? {},
    },
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <CompanyHeader
        company={c360.company}
        contactSummary={c360.contact_summary}
        onBack={onBack}
      />

      {/* Tab bar */}
      <div className="border-b border-border px-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "contacts" && c360.contacts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                  {c360.contacts.length}
                </span>
              )}
              {tab.id === "deals" && c360.deals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                  {c360.deals.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === "overview" && <OverviewTab data={c360} />}
        {activeTab === "contacts" && <ContactsTab contacts={c360.contacts} />}
        {activeTab === "deals" && <DealsTab deals={c360.deals} />}
      </div>
    </div>
  );
}
