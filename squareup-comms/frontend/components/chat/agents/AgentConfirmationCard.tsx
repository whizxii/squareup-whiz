"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Check,
  X,
  Pencil,
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAgentStore,
  type ConfirmationRequest,
} from "@/lib/stores/agent-store";

/* ------------------------------------------------------------------ */
/*  Tool Icon Mapping                                                   */
/* ------------------------------------------------------------------ */

const TOOL_ICONS: Record<string, string> = {
  send_email: "\u2709\uFE0F",
  draft_email: "\u2709\uFE0F",
  send_channel_message: "\uD83D\uDCAC",
  crm_create_contact: "\uD83D\uDC64",
  crm_update_contact: "\u270F\uFE0F",
  crm_create_deal: "\uD83E\uDD1D",
  crm_update_deal_stage: "\uD83D\uDCCA",
  crm_log_activity: "\uD83D\uDCDD",
  create_task: "\u2705",
  create_calendar_event: "\uD83D\uDCC5",
  trigger_workflow: "\u26A1",
  invoke_agent: "\uD83E\uDD16",
};

function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] ?? "\uD83D\uDD27";
}

/* ------------------------------------------------------------------ */
/*  Input Preview                                                       */
/* ------------------------------------------------------------------ */

function InputPreview({ input }: { input: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(input);
  const previewEntries = expanded ? entries : entries.slice(0, 4);

  return (
    <div className="space-y-1">
      {previewEntries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-muted-foreground font-medium min-w-[80px] shrink-0">
            {key.replace(/_/g, " ")}:
          </span>
          <span className="text-foreground/80 break-all line-clamp-2">
            {typeof value === "string"
              ? value
              : JSON.stringify(value, null, 0)}
          </span>
        </div>
      ))}
      {entries.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> +{entries.length - 4} more
              fields
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Confirmation Card                                            */
/* ------------------------------------------------------------------ */

function ConfirmationCard({
  confirmation,
  onRespond,
}: {
  confirmation: ConfirmationRequest;
  onRespond: (
    requestId: string,
    approved: boolean,
    editedInput?: Record<string, unknown>
  ) => void;
}) {
  const [responding, setResponding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedJson, setEditedJson] = useState(
    JSON.stringify(confirmation.toolInput, null, 2)
  );
  const [editError, setEditError] = useState<string | null>(null);

  const handleApprove = useCallback(() => {
    setResponding(true);
    if (editing) {
      try {
        const parsed = JSON.parse(editedJson);
        onRespond(confirmation.requestId, true, parsed);
      } catch {
        setEditError("Invalid JSON");
        setResponding(false);
        return;
      }
    } else {
      onRespond(confirmation.requestId, true);
    }
  }, [confirmation.requestId, editing, editedJson, onRespond]);

  const handleReject = useCallback(() => {
    setResponding(true);
    onRespond(confirmation.requestId, false);
  }, [confirmation.requestId, onRespond]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="mx-4 my-2"
    >
      <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            {confirmation.agentName} wants to perform an action
          </span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Tool info */}
          <div className="flex items-center gap-2">
            <span className="text-base">
              {getToolIcon(confirmation.toolName)}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {confirmation.toolName.replace(/_/g, " ")}
            </span>
          </div>

          {/* Input preview or editor */}
          {editing ? (
            <div className="space-y-1.5">
              <textarea
                value={editedJson}
                onChange={(e) => {
                  setEditedJson(e.target.value);
                  setEditError(null);
                }}
                rows={6}
                className={cn(
                  "w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono",
                  "focus:outline-none focus:ring-2 focus:ring-amber-500/30",
                  editError ? "border-red-500" : "border-border"
                )}
              />
              {editError && (
                <p className="text-[10px] text-red-500">{editError}</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <InputPreview input={confirmation.toolInput} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={responding}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              )}
            >
              {responding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {editing ? "Approve Edited" : "Approve"}
            </button>

            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              disabled={responding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              {editing ? "Cancel Edit" : "Edit"}
            </button>

            <button
              type="button"
              onClick={handleReject}
              disabled={responding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported Component — Renders All Pending Confirmations for Channel  */
/* ------------------------------------------------------------------ */

interface AgentConfirmationCardsProps {
  channelId: string;
  onRespond: (
    requestId: string,
    approved: boolean,
    editedInput?: Record<string, unknown>
  ) => void;
}

export function AgentConfirmationCards({
  channelId,
  onRespond,
}: AgentConfirmationCardsProps) {
  const pendingConfirmations = useAgentStore((s) => s.pendingConfirmations);

  const channelConfirmations = Object.values(pendingConfirmations).filter(
    (c) => c.channelId === channelId
  );

  if (channelConfirmations.length === 0) return null;

  return (
    <AnimatePresence mode="popLayout">
      {channelConfirmations.map((confirmation) => (
        <ConfirmationCard
          key={confirmation.requestId}
          confirmation={confirmation}
          onRespond={onRespond}
        />
      ))}
    </AnimatePresence>
  );
}
