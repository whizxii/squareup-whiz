"use client";

import { useState } from "react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { CRMLayout } from "@/components/crm/CRMLayout";
import { CRMHeader } from "@/components/crm/CRMHeader";
import { PipelineView } from "@/components/crm/PipelineView";
import { TableView } from "@/components/crm/TableView";
import { LeadScoringView } from "@/components/crm/LeadScoringView";
import { AICopilotPanel } from "@/components/crm/AICopilotPanel";
import { SequencesView } from "@/components/crm/sequences/SequencesView";
import { WorkflowsView } from "@/components/crm/WorkflowBuilder";
import { SmartListsView } from "@/components/crm/SmartListView";
import { CalendarView } from "@/components/crm/CalendarView";
import { DashboardView } from "@/components/crm/DashboardView";
import { AnalyticsView } from "@/components/crm/AnalyticsView";
import AutomationFeed from "@/components/crm/AutomationFeed";
import WeeklyDigestView from "@/components/crm/WeeklyDigestView";
import { CompaniesView } from "@/components/crm/CompaniesView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContacts } from "@/lib/hooks/use-crm-queries";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import {
  Bot,
  Sparkles,
} from "lucide-react";
import type { CRMView } from "@/lib/types/crm";

// ─── Placeholder view for unimplemented tabs ─────────────────────

function PlaceholderView({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}

// ─── View router ─────────────────────────────────────────────────

function ActiveView({ view }: { view: CRMView }) {
  switch (view) {
    case "dashboard":
      return <DashboardView />;
    case "pipeline":
      return <PipelineView />;
    case "table":
      return <TableView />;
    case "calendar":
      return <CalendarView />;
    case "analytics":
      return <AnalyticsView />;
    case "leads":
      return <LeadScoringView />;
    case "companies":
      return <CompaniesView />;
    case "sequences":
      return <SequencesView />;
    case "workflows":
      return <WorkflowsView />;
    case "smart_lists":
      return <SmartListsView />;
    case "automation":
      return (
        <div className="flex-1 overflow-auto p-4">
          <AutomationFeed />
        </div>
      );
    case "digest":
      return (
        <div className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
          <WeeklyDigestView />
        </div>
      );
    default:
      return <PipelineView />;
  }
}

// ─── Main CRM Page ───────────────────────────────────────────────

export default function CRMPage() {
  const activeView = useCRMUIStore((s) => s.activeView);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const searchQuery = useCRMUIStore((s) => s.searchQuery);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const queryClient = useQueryClient();

  // React Query for contacts — drives empty state check
  const { data: contactsData } = useContacts(undefined, { limit: 1 });
  const hasContacts = (contactsData?.items?.length ?? 0) > 0;
  const showEmptyState = !hasContacts && !searchQuery;

  async function loadDemoData() {
    setSeeding(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      else headers["X-User-Id"] = getCurrentUserId();
      await fetchWithRetry(`${baseUrl}/api/seed/crm-demo`, { method: "POST", headers });
      await queryClient.invalidateQueries();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <CRMLayout>
      <CRMHeader />

      {/* Floating AI Copilot toggle */}
      <button
        onClick={() => setCopilotOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="AI Copilot"
      >
        <Bot className="w-5 h-5" />
      </button>

      <AICopilotPanel
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {showEmptyState ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <EmptyState
                icon={<span className="text-3xl">&#x1F465;</span>}
                title="Your CRM starts here"
                description="Add a contact manually, or send a call recording to @crm-agent and let it do the work."
                action={{
                  label: "Add your first contact",
                  onClick: () => openDialog("create-contact"),
                }}
              />
              <button
                onClick={loadDemoData}
                disabled={seeding}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {seeding ? "Loading demo data…" : "Load demo data to see what SquareUp CRM can do"}
              </button>
            </div>
          ) : (
            <ActiveView view={activeView} />
          )}
        </div>
      </div>

    </CRMLayout>
  );
}
