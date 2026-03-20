"use client";

import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksListView } from "@/components/tasks/TasksListView";
import { RemindersListView } from "@/components/tasks/RemindersListView";
import { CreateTaskDialog } from "@/components/tasks/dialogs/CreateTaskDialog";
import { CreateReminderDialog } from "@/components/tasks/dialogs/CreateReminderDialog";
import { EditTaskDialog } from "@/components/tasks/dialogs/EditTaskDialog";

// ─── Main Tasks Page ─────────────────────────────────────────────

export default function TasksPage() {
  const activeTab = useTasksUIStore((s) => s.activeTab);
  const dialog = useTasksUIStore((s) => s.dialog);
  const closeDialog = useTasksUIStore((s) => s.closeDialog);

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <TasksHeader />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "tasks" ? <TasksListView /> : <RemindersListView />}
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
    </div>
  );
}
