"use client";

import { useState } from "react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { CRMLayout } from "@/components/crm/CRMLayout";
import { CRMHeader } from "@/components/crm/CRMHeader";
import { PipelineView } from "@/components/crm/PipelineView";
import { TableView } from "@/components/crm/TableView";
import { LeadScoringView } from "@/components/crm/LeadScoringView";
import { AICopilotPanel } from "@/components/crm/AICopilotPanel";
import { CreateContactDialog } from "@/components/crm/dialogs/CreateContactDialog";
import { EditContactDialog } from "@/components/crm/dialogs/EditContactDialog";
import { LogActivityDialog } from "@/components/crm/dialogs/LogActivityDialog";
import { SequencesView } from "@/components/crm/sequences/SequencesView";
import { WorkflowsView } from "@/components/crm/WorkflowBuilder";
import { SmartListsView } from "@/components/crm/SmartListView";
import { CalendarView } from "@/components/crm/CalendarView";
import { DashboardView } from "@/components/crm/DashboardView";
import { AnalyticsView } from "@/components/crm/AnalyticsView";
import { CreateEventDialog } from "@/components/crm/dialogs/CreateEventDialog";
import { UploadRecordingDialog } from "@/components/crm/dialogs/UploadRecordingDialog";
import { ImportDialog } from "@/components/crm/dialogs/ImportDialog";
import { ExportDialog } from "@/components/crm/dialogs/ExportDialog";
import { MergeContactsDialog } from "@/components/crm/dialogs/MergeContactsDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContacts } from "@/lib/hooks/use-crm-queries";
import {
  Building2,
  Bot,
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
      return (
        <PlaceholderView
          icon={<Building2 className="w-6 h-6" />}
          title="Companies coming soon"
          description="Company management and association with contacts will appear here."
        />
      );
    case "sequences":
      return <SequencesView />;
    case "workflows":
      return <WorkflowsView />;
    case "smart_lists":
      return <SmartListsView />;
    default:
      return <PipelineView />;
  }
}

// ─── Main CRM Page ───────────────────────────────────────────────

export default function CRMPage() {
  const activeView = useCRMUIStore((s) => s.activeView);
  const dialog = useCRMUIStore((s) => s.dialog);
  const closeDialog = useCRMUIStore((s) => s.closeDialog);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const searchQuery = useCRMUIStore((s) => s.searchQuery);
  const [copilotOpen, setCopilotOpen] = useState(false);

  // React Query for contacts — drives empty state check
  const { data: contactsData } = useContacts(undefined, { limit: 1 });
  const hasContacts = (contactsData?.items?.length ?? 0) > 0;
  const showEmptyState = !hasContacts && !searchQuery;

  // Dialog data helpers
  const editContactId = dialog.type === "edit-contact"
    ? (dialog.data?.contact_id as string | undefined) ?? null
    : null;
  const logActivityContactId = dialog.type === "log-activity"
    ? (dialog.data?.contact_id as string | undefined) ?? null
    : null;
  const createEventData = dialog.type === "create-event" ? dialog.data : null;
  const uploadRecordingData = dialog.type === "upload-recording" ? dialog.data : null;
  const mergeData = dialog.type === "merge-contacts" ? dialog.data : null;

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
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<span className="text-3xl">&#x1F465;</span>}
                title="Your CRM starts here"
                description="Add a contact manually, or send a call recording to @crm-agent and let it do the work."
                action={{
                  label: "Add your first contact",
                  onClick: () => openDialog("create-contact"),
                }}
              />
            </div>
          ) : (
            <ActiveView view={activeView} />
          )}
        </div>
      </div>

      {/* Dialogs driven by UI store */}
      <CreateContactDialog
        open={dialog.type === "create-contact"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

      <EditContactDialog
        open={dialog.type === "edit-contact"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        contactId={editContactId}
      />

      {logActivityContactId && (
        <LogActivityDialog
          open={dialog.type === "log-activity"}
          onOpenChange={(open) => { if (!open) closeDialog(); }}
          contactId={logActivityContactId}
        />
      )}

      <CreateEventDialog
        open={dialog.type === "create-event"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        defaultContactId={createEventData?.contact_id as string | undefined}
        defaultDealId={createEventData?.deal_id as string | undefined}
        defaultDate={createEventData?.date as string | undefined}
      />

      <UploadRecordingDialog
        open={dialog.type === "upload-recording"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        defaultContactId={uploadRecordingData?.contact_id as string | undefined}
        defaultDealId={uploadRecordingData?.deal_id as string | undefined}
      />

      <ImportDialog
        open={dialog.type === "import"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

      <ExportDialog
        open={dialog.type === "export"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

      <MergeContactsDialog
        open={dialog.type === "merge-contacts"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        primaryId={(mergeData?.primary_id as string) ?? null}
        secondaryId={(mergeData?.secondary_id as string) ?? null}
      />
    </CRMLayout>
  );
}
