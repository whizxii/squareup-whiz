"use client";

import { useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { useTasks, useUpdateTask } from "@/lib/hooks/use-tasks-queries";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  Circle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Bot,
  User,
} from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types/tasks";
import { formatDueDate } from "@/lib/format";
import { PRIORITY_VARIANT, PRIORITY_LABEL } from "@/lib/constants/task-config";
import { useUsers } from "@/lib/hooks/use-users";

// ─── Constants ───────────────────────────────────────────────────

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; dotColor: string }[] = [
  { status: "todo", label: "To Do", icon: <Circle className="w-3.5 h-3.5" />, dotColor: "bg-gray-400" },
  { status: "in_progress", label: "In Progress", icon: <Clock className="w-3.5 h-3.5" />, dotColor: "bg-blue-500" },
  { status: "done", label: "Done", icon: <CheckCircle2 className="w-3.5 h-3.5" />, dotColor: "bg-green-500" },
];

// ─── Task Card ───────────────────────────────────────────────────

function TaskCard({ task, isDragging, usersMap }: { task: Task; isDragging: boolean; usersMap: Map<string, string> }) {
  const openDetailPanel = useTasksUIStore((s) => s.openDetailPanel);
  const dueInfo = formatDueDate(task.due_date);

  return (
    <button
      onClick={() => openDetailPanel(task.id)}
      className={cn(
        "w-full text-left bg-card border border-border rounded-xl p-3 space-y-2 transition-shadow cursor-pointer hover:shadow-md",
        isDragging && "shadow-lg ring-2 ring-primary/30"
      )}
    >
      {/* Title */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground truncate">
          {task.title}
        </span>
        {task.created_by_type === "agent" && (
          <Bot className="w-3 h-3 text-purple-500 shrink-0" />
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">
          {PRIORITY_LABEL[task.priority]}
        </Badge>

        {dueInfo && (
          <span
            className={cn(
              "text-[11px] flex items-center gap-0.5",
              dueInfo.overdue ? "text-red-500 font-medium" : "text-muted-foreground"
            )}
          >
            {dueInfo.overdue && <AlertTriangle className="w-2.5 h-2.5" />}
            {dueInfo.text}
          </span>
        )}

        {task.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="default" size="sm">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Assignee */}
      {task.assigned_to && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <span className="truncate">{usersMap.get(task.assigned_to) || task.assigned_to}</span>
        </div>
      )}
    </button>
  );
}

// ─── Board Column ────────────────────────────────────────────────

function BoardColumn({
  status,
  label,
  icon,
  dotColor,
  tasks,
  usersMap,
}: {
  status: TaskStatus;
  label: string;
  icon: React.ReactNode;
  dotColor: string;
  tasks: Task[];
  usersMap: Map<string, string>;
}) {
  const openDialog = useTasksUIStore((s) => s.openDialog);

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => openDialog("create-task", { status })}
          title="Add task"
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 rounded-lg p-1 transition-colors min-h-[100px]",
              snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20"
            )}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <TaskCard task={task} isDragging={dragSnapshot.isDragging} usersMap={usersMap} />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">No tasks</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─── TaskBoardView ───────────────────────────────────────────────

export function TaskBoardView() {
  const searchQuery = useTasksUIStore((s) => s.searchQuery);
  const statusFilter = useTasksUIStore((s) => s.statusFilter);
  const priorityFilter = useTasksUIStore((s) => s.priorityFilter);
  const openDialog = useTasksUIStore((s) => s.openDialog);
  const { usersMap } = useUsers();

  const apiFilters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
    }),
    [statusFilter, priorityFilter]
  );

  const { data: tasksResponse, isLoading } = useTasks(apiFilters);
  const tasks = tasksResponse?.data;
  const updateTask = useUpdateTask();

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  // Group by status
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of filtered) {
      map[task.status].push(task);
    }
    return map;
  }, [filtered]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId) return;

      const newStatus = destination.droppableId as TaskStatus;
      updateTask.mutate({ id: draggableId, body: { status: newStatus } });
    },
    [updateTask]
  );

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 flex-1">
        {COLUMNS.map((col) => (
          <div key={col.status} className="min-w-[280px] w-[280px] space-y-3">
            <div className="h-8 bg-muted rounded-lg animate-pulse" />
            <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0 && !searchQuery) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<span className="text-2xl">&#x2705;</span>}
          title="No tasks yet"
          description="Create a task or ask Donna to add one for you."
          action={{ label: "Create your first task", onClick: () => openDialog("create-task") }}
        />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto flex-1 scrollbar-thin">
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.status}
            status={col.status}
            label={col.label}
            icon={col.icon}
            dotColor={col.dotColor}
            tasks={grouped[col.status]}
            usersMap={usersMap}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
