"use client";

import { useState } from "react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
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
import { AIActivityView } from "@/components/crm/AIActivityView";
import WeeklyDigestView from "@/components/crm/WeeklyDigestView";
import { CompaniesView } from "@/components/crm/CompaniesView";
import { RelationshipGraphView } from "@/components/crm/RelationshipGraphView";
import { useContacts } from "@/lib/hooks/use-crm-queries";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import {
  CRMOnboardingWizard,
  useCRMOnboardingComplete,
} from "@/components/crm/CRMOnboardingWizard";
import { FeatureDiscoveryProvider } from "@/components/crm/FeatureDiscovery";
import { Bot } from "lucide-react";
import type { CRMView } from "@/lib/types/crm";

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
          <AIActivityView />
        </div>
      );
    case "digest":
      return (
        <div className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
          <WeeklyDigestView />
        </div>
      );
    case "graph":
      return <RelationshipGraphView />;
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
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const onboardingComplete = useCRMOnboardingComplete();
  const queryClient = useQueryClient();

  // React Query for contacts — drives empty state check
  const { data: contactsData } = useContacts(undefined, { limit: 1 });
  const hasContacts = (contactsData?.items?.length ?? 0) > 0;
  const showOnboarding = !hasContacts && !searchQuery && !onboardingComplete && !wizardDismissed;

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
    <>
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

      {/* Progressive feature discovery toasts */}
      <FeatureDiscoveryProvider />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {showOnboarding ? (
            <CRMOnboardingWizard
              onComplete={() => setWizardDismissed(true)}
              onAddContact={() => openDialog("create-contact")}
              onImportCSV={() => openDialog("import")}
              onLoadDemo={loadDemoData}
              onOpenCopilot={() => setCopilotOpen(true)}
              isDemoLoading={seeding}
            />
          ) : (
            <ActiveView view={activeView} />
          )}
        </div>
      </div>

    </>
  );
}
