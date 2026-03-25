"use client";

import { useMemo } from "react";
import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { useTasks } from "@/lib/hooks/use-tasks-queries";
import { useKeyboardShortcuts, type ShortcutAction } from "@/hooks/use-keyboard-shortcuts";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksListView } from "@/components/tasks/TasksListView";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { RemindersListView } from "@/components/tasks/RemindersListView";
import { CreateTaskDialog } from "@/components/tasks/dialogs/CreateTaskDialog";
import { CreateReminderDialog } from "@/components/tasks/dialogs/CreateReminderDialog";
import { EditTaskDialog } from "@/components/tasks/dialogs/EditTaskDialog";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";

// ─── Main Tasks Page ─────────────────────────────────────────────

export default function TasksPage() {
  const activeTab = useTasksUIStore((s) => s.activeTab);
  const viewMode = useTasksUIStore((s) => s.viewMode);
  const dialog = useTasksUIStore((s) => s.dialog);
  const closeDialog = useTasksUIStore((s) => s.closeDialog);

  // Shortcuts need task list for j/k navigation
  const { data: tasksResponse } = useTasks();
  const taskIds = useMemo(() => tasksResponse?.data?.map((t) => t.id) ?? [], [tasksResponse]);

  const shortcuts = useMemo<ShortcutAction[]>(
    () => [
      {
        key: "c",
        description: "Create new task",
        category: "Tasks",
        action: () => {
          const store = useTasksUIStore.getState();
          store.openDialog(store.activeTab === "tasks" ? "create-task" : "create-reminder");
        },
      },
      {
        key: "v",
        description: "Toggle list/board view",
        category: "Tasks",
        action: () => {
          const store = useTasksUIStore.getState();
          store.setViewMode(store.viewMode === "list" ? "board" : "list");
        },
      },
      {
        key: "j",
        description: "Select next task",
        category: "Tasks",
        action: () => {
          if (taskIds.length === 0) return;
          const store = useTasksUIStore.getState();
          const currentIdx = store.selectedTaskId ? taskIds.indexOf(store.selectedTaskId) : -1;
          const nextIdx = currentIdx < taskIds.length - 1 ? currentIdx + 1 : 0;
          store.setSelectedTaskId(taskIds[nextIdx]);
        },
      },
      {
        key: "k",
        description: "Select previous task",
        category: "Tasks",
        action: () => {
          if (taskIds.length === 0) return;
          const store = useTasksUIStore.getState();
          const currentIdx = store.selectedTaskId ? taskIds.indexOf(store.selectedTaskId) : 0;
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : taskIds.length - 1;
          store.setSelectedTaskId(taskIds[prevIdx]);
        },
      },
      {
        key: "Enter",
        description: "Open selected task detail",
        category: "Tasks",
        action: () => {
          const store = useTasksUIStore.getState();
          if (store.selectedTaskId) {
            store.openDetailPanel(store.selectedTaskId);
          }
        },
      },
      {
        key: "Escape",
        description: "Close detail panel",
        category: "Tasks",
        action: () => {
          const store = useTasksUIStore.getState();
          if (store.detailPanelTaskId) {
            store.closeDetailPanel();
          } else if (store.dialog.type) {
            store.closeDialog();
          }
        },
      },
    ],
    [taskIds]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <TasksHeader />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "tasks" ? (
            viewMode === "board" ? <TaskBoardView /> : <TasksListView />
          ) : (
            <RemindersListView />
          )}

          {/* Bulk action bar — appears when tasks are selected */}
          {activeTab === "tasks" && <BulkActionBar />}
        </div>
      </div>

      {/* Dialogs driven by UI store */}
      <CreateTaskDialog
        open={dialog.type === "create-task"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      />

      <CreateReminderDialog
        open={dialog.type === "create-reminder"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      />

      <EditTaskDialog
        open={dialog.type === "edit-task"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        data={dialog.type === "edit-task" ? dialog.data : undefined}
      />

      {/* Detail slide-over panel */}
      <TaskDetailPanel />
    </div>
  );
}
