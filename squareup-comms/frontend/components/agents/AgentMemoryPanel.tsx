"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Trash2,
  Pencil,
  Check,
  X,
  AlertCircle,
  Loader2,
  Search,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMemoryStore,
  type AgentMemoryEntry,
} from "@/lib/stores/memory-store";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MemoryRow({
  memory,
  onUpdate,
  onDelete,
}: {
  readonly memory: AgentMemoryEntry;
  readonly onUpdate: (id: string, value: string) => void;
  readonly onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(memory.value);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = useCallback(() => {
    if (editValue.trim() && editValue !== memory.value) {
      onUpdate(memory.id, editValue.trim());
    }
    setEditing(false);
  }, [editValue, memory.id, memory.value, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditValue(memory.value);
    setEditing(false);
  }, [memory.value]);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(memory.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }, [confirmDelete, memory.id, onDelete]);

  const ago = formatTimeAgo(memory.updated_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group px-4 py-3 rounded-xl border border-border bg-card hover:border-sq-agent/20 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Key badge */}
        <span className="shrink-0 mt-0.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sq-agent/10 text-sq-agent">
          {memory.key}
        </span>

        {/* Value */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
                autoFocus
                className="flex-1 rounded-lg border border-sq-agent/30 bg-background px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
              />
              <button
                type="button"
                onClick={handleSave}
                className="p-1 rounded-md hover:bg-sq-agent/10 text-sq-agent"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">
              {memory.value}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">{ago}</p>
        </div>

        {/* Actions */}
        {!editing && (
          <div
            className={cn(
              "flex items-center gap-0.5 shrink-0 transition-opacity",
              confirmDelete
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setEditValue(memory.value);
              }}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              onMouseLeave={() => setConfirmDelete(false)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                confirmDelete
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "hover:bg-accent text-muted-foreground hover:text-red-500",
              )}
              title={confirmDelete ? "Click again to confirm" : "Delete"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export default function AgentMemoryPanel({
  agentId,
  agentName,
  onClose,
}: {
  readonly agentId: string;
  readonly agentName: string;
  readonly onClose: () => void;
}) {
  const memories = useMemoryStore(
    (s) => s.memoriesByAgent[agentId] ?? [],
  );
  const loading = useMemoryStore((s) => s.loading);
  const error = useMemoryStore((s) => s.error);
  const fetchMemories = useMemoryStore((s) => s.fetchMemories);
  const updateMemory = useMemoryStore((s) => s.updateMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const clearMemories = useMemoryStore((s) => s.clearMemories);

  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    fetchMemories(agentId);
  }, [agentId, fetchMemories]);

  const handleUpdate = useCallback(
    (memoryId: string, value: string) => {
      updateMemory(agentId, memoryId, value);
    },
    [agentId, updateMemory],
  );

  const handleDelete = useCallback(
    (memoryId: string) => {
      deleteMemory(agentId, memoryId);
    },
    [agentId, deleteMemory],
  );

  const handleClearAll = useCallback(() => {
    if (confirmClear) {
      clearMemories(agentId);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  }, [agentId, clearMemories, confirmClear]);

  const filtered = search.trim()
    ? memories.filter(
        (m) =>
          m.key.toLowerCase().includes(search.toLowerCase()) ||
          m.value.toLowerCase().includes(search.toLowerCase()),
      )
    : memories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sq-agent/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-sq-agent" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">
                Agent Memory
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                What {agentName} knows about you
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Clear All */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
            />
          </div>
          {memories.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              onMouseLeave={() => setConfirmClear(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
                confirmClear
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "border border-border hover:bg-accent text-muted-foreground hover:text-red-500",
              )}
            >
              <Eraser className="w-3.5 h-3.5" />
              {confirmClear ? "Confirm clear" : "Clear all"}
            </button>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mt-3"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin space-y-2">
          {loading && memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading memories...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Brain className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {search.trim()
                  ? "No memories match your search"
                  : "No memories yet"}
              </p>
              <p className="text-xs mt-1">
                {search.trim()
                  ? "Try a different search term"
                  : `${agentName} will learn about you as you interact`}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((mem) => (
                <MemoryRow
                  key={mem.id}
                  memory={mem}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0 text-[11px] text-muted-foreground">
          <span>
            {memories.length} {memories.length === 1 ? "memory" : "memories"}{" "}
            stored
          </span>
          <span>Memories are extracted automatically after each interaction</span>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
