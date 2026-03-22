"use client";

import {
  User,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Clock,
  CheckSquare,
  FileText,
  TrendingUp,
  MapPin,
  Link2,
  Tag,
  AlertCircle,
  ExternalLink,
  Send,
  Pencil,
  Bot,
  ArrowRight,
  Wrench,
  Globe,
  Users,
  Briefcase,
  MessageSquare,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  DealMetricsChart,
  PipelineSummaryChart,
  ContactStatsChart,
} from "./AgentChartWidgets";

// ─── Data Interfaces ──────────────────────────────────────────

interface ContactData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  stage?: string;
  lifecycle_stage?: string;
  value?: number;
  lead_score?: number;
  last_contacted_at?: string;
}

interface DealData {
  id?: string;
  title?: string;
  contact_id?: string;
  stage?: string;
  value?: number;
  probability?: number;
  status?: string;
  deal_health?: string;
  expected_close_date?: string;
  pipeline_id?: string;
}

interface CalendarEventData {
  id?: string;
  title?: string;
  event_type?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  is_all_day?: boolean;
  location?: string;
  meeting_url?: string;
  attendees?: Array<{ email?: string; name?: string }>;
  status?: string;
}

interface TaskData {
  id?: string;
  title?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  tags?: string[];
}

interface EmailDraftData {
  id?: string;
  subject?: string;
  body_text?: string;
  from_address?: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  status?: string;
}

interface DelegationData {
  agent_name?: string;
  response?: string;
  tools_used?: number;
  tool_calls?: Array<{ tool_name?: string; status?: string }>;
  status?: string;
  duration_ms?: number;
}

interface Entity360Data {
  entity_type?: string;
  profile?: Record<string, unknown>;
  company?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  deals?: Array<Record<string, unknown>>;
  activities?: Array<Record<string, unknown>>;
  emails?: Array<Record<string, unknown>>;
  notes?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  contacts?: Array<Record<string, unknown>>;
  mentions?: Array<Record<string, unknown>>;
}

interface EmailChainAnalysisData {
  summary?: string;
  participants?: Array<{
    name?: string;
    email?: string;
    company?: string | null;
    role?: string | null;
  }>;
  action_items?: Array<{
    description?: string;
    owner?: string;
    due_hint?: string | null;
    priority?: string;
  }>;
  key_topics?: string[];
  sentiment?: string;
  suggested_response?: string;
  follow_up_needed?: boolean;
  follow_up_suggestion?: string;
  actions_taken?: Array<{ action?: string; detail?: string }>;
}

interface RelationshipMapData {
  contact?: Record<string, unknown>;
  colleagues?: Array<Record<string, unknown>>;
  shared_deals?: Array<Record<string, unknown>>;
  interaction_frequency?: Record<string, number>;
  relationship_strength?: string;
  total_interactions?: number;
  sentiment_score?: number;
}

// ─── Tool → Widget Mapping ────────────────────────────────────

const TOOL_WIDGET_MAP: Record<string, string> = {
  crm_create_contact: "contact_card",
  crm_get_contact: "contact_card",
  crm_update_contact: "contact_card",
  crm_search_contacts: "contact_list",
  crm_create_deal: "deal_card",
  crm_list_deals: "deal_list",
  crm_update_deal_stage: "deal_card",
  create_calendar_event: "calendar_event",
  update_calendar_event: "calendar_event",
  list_calendar_events: "calendar_list",
  create_task: "task_card",
  list_tasks: "task_list",
  update_task: "task_card",
  complete_task: "task_card",
  draft_email: "email_draft",
  send_email: "email_draft",
  delegate_to_agent: "delegation_result",
  entity_360_view: "entity_360",
  relationship_map: "relationship_map",
  analyze_email_chain: "email_chain_analysis",
  process_email_chain: "email_chain_analysis",
  get_deal_metrics: "deal_metrics_chart",
  get_pipeline_summary: "pipeline_summary_chart",
  get_contact_stats: "contact_stats_chart",
};

/**
 * Attempts to parse tool output and render a rich widget card.
 * Returns null if the tool type isn't mapped or data can't be parsed.
 */
export function renderToolWidget(
  toolName: string,
  outputRaw: string | undefined,
): React.ReactNode | null {
  if (!outputRaw) return null;

  const widgetType = TOOL_WIDGET_MAP[toolName];
  if (!widgetType) return null;

  try {
    const data = typeof outputRaw === "string" ? JSON.parse(outputRaw) : outputRaw;
    return renderWidgetByType(widgetType, data);
  } catch {
    return null;
  }
}

/**
 * Renders a widget for the MessageBubble JSON widget format.
 * Expects { widget_type: string, data: object }.
 */
export function renderMessageWidget(
  widgetType: string,
  data: unknown,
): React.ReactNode | null {
  return renderWidgetByType(widgetType, data);
}

function renderWidgetByType(widgetType: string, data: unknown): React.ReactNode | null {
  switch (widgetType) {
    case "contact_card":
      return <ContactCard data={extractContact(data)} />;
    case "contact_list":
      return <ContactListCard data={data} />;
    case "deal_card":
      return <DealCard data={extractDeal(data)} />;
    case "deal_list":
      return <DealListCard data={data} />;
    case "calendar_event":
      return <CalendarEventCard data={extractCalendarEvent(data)} />;
    case "calendar_list":
      return <CalendarListCard data={data} />;
    case "task_card":
      return <TaskCard data={extractTask(data)} />;
    case "task_list":
      return <TaskListCard data={data} />;
    case "email_draft":
      return <EmailDraftCard data={extractEmailDraft(data)} />;
    case "delegation_result":
      return <DelegationResultCard data={data as DelegationData} />;
    case "entity_360":
      return <Entity360Card data={data as Entity360Data} />;
    case "relationship_map":
      return <RelationshipMapCard data={data as RelationshipMapData} />;
    case "email_chain_analysis":
      return <EmailChainAnalysisCard data={extractEmailChainAnalysis(data)} />;
    case "deal_metrics_chart":
      return <DealMetricsChart data={data as Record<string, unknown>} />;
    case "pipeline_summary_chart":
      return <PipelineSummaryChart data={data as Record<string, unknown>} />;
    case "contact_stats_chart":
      return <ContactStatsChart data={data as Record<string, unknown>} />;
    default:
      return null;
  }
}

// ─── Data Extractors ──────────────────────────────────────────

function extractContact(data: unknown): ContactData {
  const d = data as Record<string, unknown>;
  return (d?.contact ?? d) as ContactData;
}

function extractDeal(data: unknown): DealData {
  const d = data as Record<string, unknown>;
  return (d?.deal ?? d) as DealData;
}

function extractCalendarEvent(data: unknown): CalendarEventData {
  const d = data as Record<string, unknown>;
  return (d?.event ?? d) as CalendarEventData;
}

function extractTask(data: unknown): TaskData {
  const d = data as Record<string, unknown>;
  return (d?.task ?? d) as TaskData;
}

function extractEmailDraft(data: unknown): EmailDraftData {
  const d = data as Record<string, unknown>;
  return (d?.email ?? d) as EmailDraftData;
}

function extractEmailChainAnalysis(data: unknown): EmailChainAnalysisData {
  const d = data as Record<string, unknown>;
  // process_email_chain wraps in { analysis, actions_taken }
  const analysis = (d?.analysis ?? d) as Record<string, unknown>;
  const actionsTaken = d?.actions_taken as Array<{ action?: string; detail?: string }> | undefined;
  return { ...analysis, actions_taken: actionsTaken ?? analysis.actions_taken } as EmailChainAnalysisData;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(value: number | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Widget Components ────────────────────────────────────────

const cardBase =
  "rounded-lg border border-border/60 bg-card/80 p-3 text-xs space-y-2 max-w-sm";

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-foreground/70">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function ActionLink({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      <Icon className="w-3 h-3" />
      {children}
    </Link>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
        variant === "default" && "bg-muted text-muted-foreground",
        variant === "success" && "bg-emerald-500/15 text-emerald-600",
        variant === "warning" && "bg-amber-500/15 text-amber-600",
        variant === "danger" && "bg-red-500/15 text-red-600",
      )}
    >
      {children}
    </span>
  );
}

function dealHealthVariant(health: string | undefined): "default" | "success" | "warning" | "danger" {
  if (!health) return "default";
  const h = health.toLowerCase();
  if (h === "healthy" || h === "good") return "success";
  if (h === "at_risk" || h === "at risk") return "warning";
  if (h === "critical" || h === "lost") return "danger";
  return "default";
}

function priorityVariant(priority: string | undefined): "default" | "success" | "warning" | "danger" {
  if (!priority) return "default";
  const p = priority.toLowerCase();
  if (p === "high" || p === "urgent") return "danger";
  if (p === "medium") return "warning";
  return "default";
}

// ─── Contact Card ─────────────────────────────────────────────

function ContactCard({ data }: { data: ContactData }) {
  if (!data?.name) return null;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">{data.name}</div>
          {data.title && (
            <div className="text-[10px] text-muted-foreground truncate">{data.title}</div>
          )}
        </div>
        {data.stage && <Badge>{data.stage}</Badge>}
      </div>
      <div className="space-y-1">
        <InfoRow icon={Building2} label="Company" value={data.company ?? ""} />
        <InfoRow icon={Mail} label="Email" value={data.email ?? ""} />
        <InfoRow icon={Phone} label="Phone" value={data.phone ?? ""} />
        {data.value != null && data.value > 0 && (
          <InfoRow icon={DollarSign} label="Value" value={formatCurrency(data.value)} />
        )}
        {data.lead_score != null && (
          <InfoRow icon={TrendingUp} label="Lead Score" value={String(data.lead_score)} />
        )}
      </div>
      {data.id && (
        <div className="flex gap-1 pt-1 border-t border-border/30">
          <ActionLink href={`/crm/contacts/${data.id}`} icon={ExternalLink}>View in CRM</ActionLink>
        </div>
      )}
    </div>
  );
}

function ContactListCard({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const contacts = (d?.contacts ?? []) as ContactData[];
  const count = (d?.count ?? contacts.length) as number;
  if (contacts.length === 0) return null;

  return (
    <div className={cn(cardBase, "max-w-md")}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <User className="w-3 h-3" />
        <span className="font-medium text-foreground">{count} contact{count !== 1 ? "s" : ""} found</span>
      </div>
      <div className="space-y-1.5">
        {contacts.slice(0, 5).map((c, i) => (
          <div key={c.id ?? i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
              {(c.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate text-[11px]">{c.name}</div>
              {c.company && (
                <div className="text-[10px] text-muted-foreground truncate">{c.company}</div>
              )}
            </div>
            {c.email && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{c.email}</span>}
          </div>
        ))}
        {contacts.length > 5 && (
          <div className="text-[10px] text-muted-foreground text-center">
            +{contacts.length - 5} more
          </div>
        )}
      </div>
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={ExternalLink}>View All in CRM</ActionLink>
      </div>
    </div>
  );
}

// ─── Deal Card ────────────────────────────────────────────────

function DealCard({ data }: { data: DealData }) {
  if (!data?.title) return null;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{data.title}</div>
          {data.stage && (
            <div className="text-[10px] text-muted-foreground">{data.stage}</div>
          )}
        </div>
        {data.value != null && (
          <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(data.value)}</span>
        )}
      </div>
      <div className="space-y-1">
        {data.probability != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(data.probability * 100, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(data.probability * 100)}%
            </span>
          </div>
        )}
        {data.deal_health && (
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <Badge variant={dealHealthVariant(data.deal_health)}>
              {data.deal_health.replace(/_/g, " ")}
            </Badge>
          </div>
        )}
        {data.expected_close_date && (
          <InfoRow icon={Calendar} label="Close" value={formatDate(data.expected_close_date)} />
        )}
      </div>
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={ExternalLink}>View Pipeline</ActionLink>
        {data.contact_id && (
          <ActionLink href={`/crm/contacts/${data.contact_id}`} icon={User}>View Contact</ActionLink>
        )}
      </div>
    </div>
  );
}

function DealListCard({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const deals = (d?.deals ?? []) as DealData[];
  if (deals.length === 0) return null;

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);

  return (
    <div className={cn(cardBase, "max-w-md")}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span className="font-medium text-foreground">{deals.length} deal{deals.length !== 1 ? "s" : ""}</span>
        </div>
        {totalValue > 0 && (
          <span className="font-medium text-emerald-600 text-[11px]">{formatCurrency(totalValue)} total</span>
        )}
      </div>
      <div className="space-y-1.5">
        {deals.slice(0, 5).map((d2, i) => (
          <div key={d2.id ?? i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate text-[11px]">{d2.title}</div>
              {d2.stage && <div className="text-[10px] text-muted-foreground">{d2.stage}</div>}
            </div>
            {d2.value != null && (
              <span className="text-[11px] font-medium text-emerald-600">{formatCurrency(d2.value)}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={ExternalLink}>View Pipeline</ActionLink>
      </div>
    </div>
  );
}

// ─── Calendar Event Card ──────────────────────────────────────

function CalendarEventCard({ data }: { data: CalendarEventData }) {
  if (!data?.title) return null;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{data.title}</div>
          {data.event_type && (
            <div className="text-[10px] text-muted-foreground">{data.event_type.replace(/_/g, " ")}</div>
          )}
        </div>
        {data.status && <Badge>{data.status}</Badge>}
      </div>
      <div className="space-y-1">
        {data.start_at && (
          <InfoRow icon={Clock} label="Start" value={formatDateTime(data.start_at)} />
        )}
        {data.end_at && (
          <InfoRow icon={Clock} label="End" value={formatDateTime(data.end_at)} />
        )}
        {data.location && (
          <InfoRow icon={MapPin} label="Location" value={data.location} />
        )}
        {data.meeting_url && (
          <InfoRow icon={Link2} label="Link" value={data.meeting_url} />
        )}
        {data.attendees && data.attendees.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3 h-3 shrink-0" />
            <span className="text-foreground/70">Attendees:</span>
            <span className="text-foreground truncate">
              {data.attendees.map((a) => a.name ?? a.email).join(", ")}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={Calendar}>View Calendar</ActionLink>
        {data.meeting_url && (
          <a
            href={data.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Link2 className="w-3 h-3" />
            Join Meeting
          </a>
        )}
      </div>
    </div>
  );
}

function CalendarListCard({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const events = (d?.events ?? []) as CalendarEventData[];
  if (events.length === 0) return null;

  return (
    <div className={cn(cardBase, "max-w-md")}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Calendar className="w-3 h-3" />
        <span className="font-medium text-foreground">{events.length} event{events.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-1.5">
        {events.slice(0, 5).map((e, i) => (
          <div key={e.id ?? i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
            <Clock className="w-3 h-3 text-blue-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate text-[11px]">{e.title}</div>
              {e.start_at && (
                <div className="text-[10px] text-muted-foreground">{formatDateTime(e.start_at)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────

function TaskCard({ data }: { data: TaskData }) {
  if (!data?.title) return null;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
          <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{data.title}</div>
          {data.description && (
            <div className="text-[10px] text-muted-foreground truncate">{data.description}</div>
          )}
        </div>
        {data.priority && <Badge variant={priorityVariant(data.priority)}>{data.priority}</Badge>}
      </div>
      <div className="space-y-1">
        {data.status && (
          <InfoRow icon={CheckSquare} label="Status" value={data.status.replace(/_/g, " ")} />
        )}
        {data.assigned_to && (
          <InfoRow icon={User} label="Assigned" value={data.assigned_to} />
        )}
        {data.due_date && (
          <InfoRow icon={Calendar} label="Due" value={formatDate(data.due_date)} />
        )}
        {data.tags && data.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
            {data.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/tasks" icon={ExternalLink}>View Tasks</ActionLink>
      </div>
    </div>
  );
}

function TaskListCard({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const tasks = (d?.tasks ?? []) as TaskData[];
  if (tasks.length === 0) return null;

  return (
    <div className={cn(cardBase, "max-w-md")}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <CheckSquare className="w-3 h-3" />
        <span className="font-medium text-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-1.5">
        {tasks.slice(0, 5).map((t, i) => (
          <div key={t.id ?? i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
            <CheckSquare className={cn(
              "w-3 h-3 shrink-0",
              t.status === "completed" ? "text-emerald-500" : "text-muted-foreground",
            )} />
            <div className="min-w-0 flex-1">
              <div className={cn(
                "font-medium truncate text-[11px]",
                t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground",
              )}>
                {t.title}
              </div>
            </div>
            {t.priority && <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Email Draft Card ─────────────────────────────────────────

function EmailDraftCard({ data }: { data: EmailDraftData }) {
  if (!data?.subject) return null;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{data.subject}</div>
          <div className="text-[10px] text-muted-foreground">
            {data.status === "draft" ? "Draft" : data.status ?? "Draft"}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {data.to_addresses && data.to_addresses.length > 0 && (
          <InfoRow icon={Mail} label="To" value={data.to_addresses.join(", ")} />
        )}
        {data.cc_addresses && data.cc_addresses.length > 0 && (
          <InfoRow icon={Mail} label="CC" value={data.cc_addresses.join(", ")} />
        )}
        {data.body_text && (
          <div className="mt-1.5 p-2 rounded bg-muted/50 text-[11px] text-foreground/80 line-clamp-4 whitespace-pre-wrap">
            {data.body_text}
          </div>
        )}
      </div>
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={Pencil}>Edit Draft</ActionLink>
        <ActionLink href="/crm" icon={Send}>Send Now</ActionLink>
      </div>
    </div>
  );
}

// ─── Delegation Result Card ──────────────────────────────────

function DelegationResultCard({ data }: { data: DelegationData }) {
  if (!data?.agent_name) return null;
  const isSuccess = data.status === "success";
  const durationSec = data.duration_ms ? (data.duration_ms / 1000).toFixed(1) : null;

  return (
    <div className={cardBase}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center",
            isSuccess ? "bg-sq-agent/10" : "bg-red-500/10"
          )}
        >
          <Bot className={cn("w-3.5 h-3.5", isSuccess ? "text-sq-agent" : "text-red-500")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            {data.agent_name}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            <span>{isSuccess ? "Completed" : data.status ?? "Unknown"}</span>
            {durationSec && <span>{durationSec}s</span>}
            {typeof data.tools_used === "number" && (
              <span className="flex items-center gap-0.5">
                <Wrench className="w-2.5 h-2.5" />
                {data.tools_used} tool{data.tools_used !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
      {data.response && (
        <div className="mt-1.5 p-2 rounded bg-muted/50 text-[11px] text-foreground/80 line-clamp-6 whitespace-pre-wrap">
          {data.response}
        </div>
      )}
      {data.tool_calls && data.tool_calls.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {data.tool_calls.slice(0, 5).map((tc, i) => (
            <span
              key={i}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full",
                tc.status === "success"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-500"
              )}
            >
              {tc.tool_name ?? "tool"}
            </span>
          ))}
          {data.tool_calls.length > 5 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{data.tool_calls.length - 5} more
            </span>
          )}
        </div>
      )}
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/agents" icon={Bot}>View Agents</ActionLink>
      </div>
    </div>
  );
}

// ─── Entity 360° View Card ──────────────────────────────────

function Entity360Card({ data }: { data: Entity360Data }) {
  const profile = data.profile ?? {};
  const entityType = data.entity_type ?? "contact";
  const name =
    (profile.name as string) ??
    (profile.full_name as string) ??
    (profile.title as string) ??
    "Unknown";

  const IconForType =
    entityType === "company" ? Building2 : entityType === "deal" ? Briefcase : User;

  const sections: Array<{ label: string; icon: React.ElementType; count: number }> = [];
  if (data.deals?.length) sections.push({ label: "Deals", icon: DollarSign, count: data.deals.length });
  if (data.contacts?.length) sections.push({ label: "Contacts", icon: Users, count: data.contacts.length });
  if (data.activities?.length) sections.push({ label: "Activities", icon: Activity, count: data.activities.length });
  if (data.emails?.length) sections.push({ label: "Emails", icon: Mail, count: data.emails.length });
  if (data.notes?.length) sections.push({ label: "Notes", icon: FileText, count: data.notes.length });
  if (data.tasks?.length) sections.push({ label: "Tasks", icon: CheckSquare, count: data.tasks.length });
  if (data.mentions?.length) sections.push({ label: "Mentions", icon: MessageSquare, count: data.mentions.length });

  const companyName =
    (data.company as Record<string, unknown>)?.name as string | undefined;
  const contactName =
    (data.contact as Record<string, unknown>)?.name as string | undefined;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 max-w-sm text-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <IconForType className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-muted-foreground" />
            360° — {name}
          </div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {entityType}
            {companyName && ` · ${companyName}`}
            {contactName && ` · ${contactName}`}
          </div>
        </div>
      </div>

      {sections.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {sections.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 text-[11px]"
            >
              <s.icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground font-medium">{s.count}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {typeof profile.email === "string" && profile.email && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {profile.email}
        </div>
      )}

      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={User}>View in CRM</ActionLink>
      </div>
    </div>
  );
}

// ─── Relationship Map Card ──────────────────────────────────

function RelationshipMapCard({ data }: { data: RelationshipMapData }) {
  const contactName =
    (data.contact?.name as string) ??
    (data.contact?.full_name as string) ??
    "Unknown";

  const strength = data.relationship_strength ?? "unknown";
  const strengthColor =
    strength === "strong"
      ? "text-emerald-600 bg-emerald-500/10"
      : strength === "moderate"
        ? "text-amber-600 bg-amber-500/10"
        : "text-red-500 bg-red-500/10";

  const freqEntries = Object.entries(data.interaction_frequency ?? {});
  const totalInteractions = data.total_interactions ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 max-w-sm text-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-violet-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">
            Relationships — {contactName}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-medium", strengthColor)}>
              {strength}
            </span>
            {totalInteractions > 0 && (
              <span>{totalInteractions} interaction{totalInteractions !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </div>

      {data.colleagues && data.colleagues.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Colleagues ({data.colleagues.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {data.colleagues.slice(0, 6).map((c, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground"
              >
                {(c.name as string) ?? (c.full_name as string) ?? "Contact"}
              </span>
            ))}
            {data.colleagues.length > 6 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{data.colleagues.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {data.shared_deals && data.shared_deals.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Shared Deals ({data.shared_deals.length})
          </div>
          <div className="space-y-0.5">
            {data.shared_deals.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px]">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span className="truncate text-foreground">{(d.title as string) ?? "Deal"}</span>
                {typeof d.stage === "string" && d.stage && (
                  <span className="text-[9px] text-muted-foreground ml-auto">
                    {d.stage}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {freqEntries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {freqEntries.map(([type, count]) => (
            <span
              key={type}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {type}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={User}>View in CRM</ActionLink>
      </div>
    </div>
  );
}

// ─── Email Chain Analysis Card ───────────────────────────────

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-600",
  negative: "bg-red-500/10 text-red-500",
  mixed: "bg-amber-500/10 text-amber-600",
  neutral: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-muted text-muted-foreground",
};

function EmailChainAnalysisCard({ data }: { data: EmailChainAnalysisData }) {
  const participants = data.participants ?? [];
  const actionItems = data.action_items ?? [];
  const topics = data.key_topics ?? [];
  const actionsTaken = data.actions_taken ?? [];
  const sentiment = data.sentiment ?? "neutral";

  return (
    <div className="space-y-2 p-2 rounded-lg bg-card/50 border border-border/40 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground text-[11px]">
            Email Chain Analysis
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full capitalize",
              SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral,
            )}
          >
            {sentiment}
          </span>
          {participants.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {participants.length} participant{participants.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {data.summary}
        </p>
      )}

      {/* Participants */}
      {participants.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Participants
          </div>
          <div className="space-y-0.5">
            {participants.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px]">
                <User className="w-3 h-3 text-primary/60" />
                <span className="text-foreground truncate">
                  {p.name ?? p.email ?? "Unknown"}
                </span>
                {p.company && (
                  <span className="text-[9px] text-muted-foreground ml-auto truncate max-w-[80px]">
                    {p.company}
                  </span>
                )}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="text-[9px] text-muted-foreground">
                +{participants.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Action Items ({actionItems.length})
          </div>
          <div className="space-y-0.5">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" />
                <span className="text-foreground flex-1">
                  {item.description ?? "Action item"}
                </span>
                {item.priority && (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded shrink-0",
                      PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.medium,
                    )}
                  >
                    {item.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Topics */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topics.map((topic, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Suggested Response */}
      {data.suggested_response && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Suggested Response
          </div>
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded p-1.5 leading-relaxed line-clamp-4">
            {data.suggested_response}
          </p>
        </div>
      )}

      {/* Actions Taken (from process_email_chain) */}
      {actionsTaken.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Actions Taken ({actionsTaken.length})
          </div>
          <div className="space-y-0.5">
            {actionsTaken.map((a, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-foreground">{a.detail ?? a.action ?? "Done"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {data.follow_up_needed && data.follow_up_suggestion && (
        <div className="flex items-start gap-1 p-1.5 rounded bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-[10px] text-amber-600">
            {data.follow_up_suggestion}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-1 pt-1 border-t border-border/30">
        <ActionLink href="/crm" icon={User}>Contacts</ActionLink>
        <ActionLink href="/tasks" icon={CheckCircle2}>Tasks</ActionLink>
      </div>
    </div>
  );
}
