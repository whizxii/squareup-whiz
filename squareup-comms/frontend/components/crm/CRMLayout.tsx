"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import {
  createKeyboardHandler,
  type KeyboardShortcut,
} from "@/lib/crm-keyboard";
import { CreateContactDialog } from "@/components/crm/dialogs/CreateContactDialog";
import { EditContactDialog } from "@/components/crm/dialogs/EditContactDialog";
import { LogActivityDialog } from "@/components/crm/dialogs/LogActivityDialog";
import { CreateDealDialog } from "@/components/crm/dialogs/CreateDealDialog";
import { LoseDealDialog } from "@/components/crm/dialogs/LoseDealDialog";
import { CreateEventDialog } from "@/components/crm/dialogs/CreateEventDialog";
import { UploadRecordingDialog } from "@/components/crm/dialogs/UploadRecordingDialog";
import { ImportDialog } from "@/components/crm/dialogs/ImportDialog";
import { ExportDialog } from "@/components/crm/dialogs/ExportDialog";
import { MergeContactsDialog } from "@/components/crm/dialogs/MergeContactsDialog";
import { CommandPalette } from "@/components/crm/CommandPalette";

// ─── Dialog Manager — mounted on ALL CRM routes ──────────────────

function CRMDialogManager() {
  const dialog = useCRMUIStore((s) => s.dialog);
  const closeDialog = useCRMUIStore((s) => s.closeDialog);

  const editContactId =
    dialog.type === "edit-contact"
      ? (dialog.data?.contact_id as string | undefined) ?? null
      : null;
  const logActivityContactId =
    dialog.type === "log-activity"
      ? (dialog.data?.contact_id as string | undefined) ?? null
      : null;
  const createEventData = dialog.type === "create-event" ? dialog.data : null;
  const uploadRecordingData =
    dialog.type === "upload-recording" ? dialog.data : null;
  const mergeData = dialog.type === "merge-contacts" ? dialog.data : null;

  return (
    <>
      <CreateContactDialog
        open={dialog.type === "create-contact"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

      <EditContactDialog
        open={dialog.type === "edit-contact"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        contactId={editContactId}
      />

      <LogActivityDialog
        open={dialog.type === "log-activity"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        contactId={logActivityContactId}
      />

      <CreateDealDialog
        open={dialog.type === "create-deal"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

      <LoseDealDialog
        open={dialog.type === "lose-deal"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      />

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
    </>
  );
}

// ─── Error Boundary ──────────────────────────────────────────────

import { Component, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CRMErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CRM] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
              {this.state.error?.message ?? "An unexpected error occurred in the CRM."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ─── Keyboard Context Map ────────────────────────────────────────

const VIEW_TO_CONTEXT: Record<string, KeyboardShortcut["context"]> = {
  pipeline: "pipeline",
  table: "table",
  calendar: "calendar",
};

// ─── CRM Layout ──────────────────────────────────────────────────

interface CRMLayoutProps {
  children: ReactNode;
}

export function CRMLayout({ children }: CRMLayoutProps) {
  const activeView = useCRMUIStore((s) => s.activeView);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const closeDialog = useCRMUIStore((s) => s.closeDialog);
  const setCommandPaletteOpen = useCRMUIStore((s) => s.setCommandPaletteOpen);

  const handleShortcut = useCallback(
    (shortcutId: string) => {
      switch (shortcutId) {
        case "cmd-k":
          setCommandPaletteOpen(true);
          break;
        case "cmd-j":
          setCommandPaletteOpen(true);
          break;
        case "cmd-shift-n":
          openDialog("create-contact");
          break;
        case "cmd-shift-d":
          openDialog("create-deal");
          break;
        case "cmd-shift-a":
          openDialog("log-activity");
          break;
        case "cmd-slash":
        case "question":
          openDialog("keyboard-help");
          break;
        case "escape":
          closeDialog();
          break;
        default:
          break;
      }
    },
    [openDialog, closeDialog, setCommandPaletteOpen]
  );

  useEffect(() => {
    const context = VIEW_TO_CONTEXT[activeView] ?? "global";
    const handler = createKeyboardHandler(context, handleShortcut);

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeView, handleShortcut]);

  return (
    <CRMErrorBoundary>
      <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {children}
        <CRMDialogManager />
        <CommandPalette />
      </div>
    </CRMErrorBoundary>
  );
}
