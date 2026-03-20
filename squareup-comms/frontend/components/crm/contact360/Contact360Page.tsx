"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContact360 } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { ContactHeader } from "./ContactHeader";
import { OverviewTab } from "./OverviewTab";
import { TimelineTab } from "./TimelineTab";
import { NotesTab } from "./NotesTab";
import { EmailsTab } from "./EmailsTab";
import { CalendarTab } from "./CalendarTab";
import { RecordingsTab } from "./RecordingsTab";
import { ChatHistoryTab } from "./ChatHistoryTab";
import {
  LayoutDashboard,
  Clock,
  TrendingUp,
  FileText,
  Mail,
  Mic,
  Calendar,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";

// ─── Tab config ─────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: "timeline", label: "Timeline", icon: <Clock className="w-3.5 h-3.5" /> },
  { id: "deals", label: "Deals", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: "emails", label: "Emails", icon: <Mail className="w-3.5 h-3.5" /> },
  { id: "notes", label: "Notes", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "recordings", label: "Recordings", icon: <Mic className="w-3.5 h-3.5" /> },
  { id: "chat", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Loading skeleton ───────────────────────────────────────────

function Contact360Skeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="border-b border-border px-6 py-4 space-y-4">
        <Skeleton width="30%" height={12} />
        <div className="flex items-start gap-4">
          <Skeleton variant="circle" width={56} />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height={20} />
            <Skeleton width="25%" height={14} />
            <div className="flex gap-2 mt-1">
              <Skeleton width={70} height={22} className="rounded-full" />
              <Skeleton width={36} height={22} className="rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="border-b border-border px-6">
        <div className="flex gap-4 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={70} height={28} className="rounded-md" />
          ))}
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contact 360 Page ───────────────────────────────────────────

interface Contact360PageProps {
  contactId: string;
  onBack: () => void;
}

export function Contact360Page({ contactId, onBack }: Contact360PageProps) {
  const activeTab = useCRMUIStore((s) => s.activeTab) as TabId;
  const setActiveTab = useCRMUIStore((s) => s.setActiveTab);

  const { data, isLoading, error } = useContact360(contactId);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
    },
    [setActiveTab]
  );

  // Loading state
  if (isLoading) {
    return <Contact360Skeleton />;
  }

  // Error state
  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6" />}
          title="Contact not found"
          description={
            error?.message || "This contact doesn't exist or has been archived."
          }
          action={{ label: "Go Back", onClick: onBack }}
        />
      </div>
    );
  }

  // Normalize: backend may return null for array fields despite TypeScript types
  const c360 = {
    ...data,
    notes: data.notes ?? [],
    deals: data.deals ?? [],
    activities: data.activities ?? [],
    recordings: data.recordings ?? [],
    calendar_events: data.calendar_events ?? [],
    follow_up_suggestions: data.follow_up_suggestions ?? [],
    contact: {
      ...data.contact,
      tags: data.contact.tags ?? [],
      custom_fields: data.contact.custom_fields ?? {},
    },
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <ContactHeader
        contact={c360.contact}
        company={c360.company}
        leadScore={c360.lead_score}
        relationship={c360.relationship}
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
              {tab.id === "notes" && c360.notes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                  {c360.notes.length}
                </span>
              )}
              {tab.id === "deals" && c360.deals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                  {c360.deals.length}
                </span>
              )}
              {tab.id === "calendar" && c360.calendar_events.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                  {c360.calendar_events.length}
                </span>
              )}
              {tab.id === "recordings" && c360.recordings.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                  {c360.recordings.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === "overview" && (
          <OverviewTab
            contact={c360.contact}
            company={c360.company}
            deals={c360.deals}
            activities={c360.activities}
            leadScore={c360.lead_score}
            relationship={c360.relationship}
            enrichment={c360.enrichment}
            followUpSuggestions={c360.follow_up_suggestions}
            calendarEvents={c360.calendar_events}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineTab
            activities={c360.activities}
            contactId={contactId}
          />
        )}

        {activeTab === "deals" && (
          <DealsTabPlaceholder
            deals={c360.deals}
            contactId={contactId}
          />
        )}

        {activeTab === "emails" && (
          <EmailsTab contactId={contactId} />
        )}

        {activeTab === "notes" && (
          <NotesTab notes={c360.notes} contactId={contactId} />
        )}

        {activeTab === "calendar" && (
          <CalendarTab contactId={contactId} />
        )}

        {activeTab === "recordings" && (
          <RecordingsTab contactId={contactId} />
        )}

        {activeTab === "chat" && (
          <ChatHistoryTab contactId={contactId} />
        )}
      </div>
    </div>
  );
}

// ─── Placeholder tabs (to be expanded in later phases) ──────────

function DealsTabPlaceholder({
  deals,
  contactId,
}: {
  deals: { id: string; title: string; stage: string; value?: number; currency: string; probability: number; status: string }[];
  contactId: string;
}) {
  const openDialog = useCRMUIStore((s) => s.openDialog);

  if (deals.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<TrendingUp className="w-6 h-6" />}
          title="No deals yet"
          description="Create a deal to start tracking revenue for this contact."
          action={{
            label: "Create Deal",
            onClick: () =>
              openDialog("create-deal", { contact_id: contactId }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {deals.map((deal) => (
        <div
          key={deal.id}
          className="rounded-lg border border-border p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium">{deal.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs capitalize text-muted-foreground">
                {deal.stage}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {deal.probability}% probability
              </span>
            </div>
          </div>
          {deal.value != null && (
            <span className="text-sm font-mono font-semibold text-primary">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: deal.currency,
                maximumFractionDigits: 0,
              }).format(deal.value)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

