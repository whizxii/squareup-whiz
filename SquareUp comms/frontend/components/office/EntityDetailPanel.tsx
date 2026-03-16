/**
 * Glass slide-in panel showing details for a selected user or agent.
 * Slides in from the right with spring animation.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Hand, Eye, Zap, Send } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  dnd: "Do Not Disturb",
  idle: "Idle",
  thinking: "Thinking",
  working: "Working",
  error: "Error",
  offline: "Offline",
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  away: "#eab308",
  busy: "#ef4444",
  dnd: "#ef4444",
  idle: "#22c55e",
  thinking: "#eab308",
  working: "#4a90d9",
  error: "#ef4444",
  offline: "#999",
};

export default function EntityDetailPanel() {
  const selectedEntity = useOfficeStore((s) => s.selectedEntity);
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const myPosition = useOfficeStore((s) => s.myPosition);
  const sendWave = useOfficeStore((s) => s.sendWave);
  const setFollowingEntity = useOfficeStore((s) => s.setFollowingEntity);
  const addChatBubble = useOfficeStore((s) => s.addChatBubble);
  const followingEntity = useOfficeStore((s) => s.followingEntity);

  const myUserId = useCurrentUserId();
  const [chatInput, setChatInput] = useState("");

  const entity = selectedEntity
    ? selectedEntity.type === "user"
      ? users.find((u) => u.id === selectedEntity.id)
      : agents.find((a) => a.id === selectedEntity.id)
    : null;

  const isUser = selectedEntity?.type === "user";

  // Check proximity (within 3 tiles)
  const entityPos = entity ? { x: (entity as { x: number }).x, y: (entity as { y: number }).y } : null;
  const isNearby = entityPos
    ? Math.sqrt(
        (myPosition.x - entityPos.x) ** 2 + (myPosition.y - entityPos.y) ** 2
      ) <= 3
    : false;

  const isFollowing =
    followingEntity?.type === selectedEntity?.type &&
    followingEntity?.id === selectedEntity?.id;

  const handleSendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    addChatBubble(myUserId, trimmed);
    setChatInput("");
  }, [chatInput, addChatBubble, myUserId]);

  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          className="absolute top-4 right-4 z-50 w-64 overflow-hidden rounded-2xl border border-white/15 shadow-xl"
          style={{
            backgroundColor: "rgba(30, 27, 24, 0.88)",
            backdropFilter: "blur(24px) saturate(180%)",
          }}
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  backgroundColor: isUser ? "#FF6B00" : "#4a90d9",
                }}
              >
                {isUser
                  ? (entity as (typeof users)[number]).name.charAt(0)
                  : (entity as (typeof agents)[number]).icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isUser
                    ? (entity as (typeof users)[number]).name
                    : (entity as (typeof agents)[number]).name}
                </p>
                <div className="flex items-center gap-1">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        STATUS_COLORS[
                          isUser
                            ? (entity as (typeof users)[number]).status
                            : (entity as (typeof agents)[number]).status
                        ] ?? "#999",
                    }}
                  />
                  <span className="text-[10px] text-white/50">
                    {STATUS_LABELS[
                      isUser
                        ? (entity as (typeof users)[number]).status
                        : (entity as (typeof agents)[number]).status
                    ] ?? "Unknown"}
                  </span>
                </div>
              </div>
            </div>
            <button
              className="sq-tap flex h-6 w-6 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70"
              onClick={() => setSelectedEntity(null)}
              aria-label="Close panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3 px-4 py-3">
            {/* User-specific */}
            {isUser && (
              <>
                {(entity as (typeof users)[number]).activity && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Activity
                    </p>
                    <p className="text-xs text-white/70">
                      {(entity as (typeof users)[number]).activity}
                    </p>
                  </div>
                )}
                {(entity as (typeof users)[number]).statusMessage && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Status
                    </p>
                    <p className="text-xs text-white/70">
                      {(entity as (typeof users)[number]).statusEmoji}{" "}
                      {(entity as (typeof users)[number]).statusMessage}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Agent-specific */}
            {!isUser && (
              <>
                {(entity as (typeof agents)[number]).currentTask && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Current Task
                    </p>
                    <p className="text-xs text-white/70">
                      {(entity as (typeof agents)[number]).currentTask}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                    Desk Items
                  </p>
                  <p className="text-sm">
                    {(entity as (typeof agents)[number]).personality.deskItems.join(" ")}
                  </p>
                </div>
              </>
            )}

            {/* Location */}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                Position
              </p>
              <p className="text-xs text-white/50">
                Tile ({(entity as { x: number; y: number }).x},{" "}
                {(entity as { x: number; y: number }).y})
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 border-t border-white/10 px-4 py-3">
            <ActionButton
              icon={MessageSquare}
              label="Message"
              onClick={() => {
                /* Focus the chat input below */
                const input = document.getElementById("entity-chat-input");
                if (input) input.focus();
              }}
            />
            <ActionButton
              icon={Hand}
              label="Wave"
              onClick={() => {
                if (selectedEntity) sendWave(selectedEntity);
              }}
            />
            <ActionButton
              icon={Eye}
              label={isFollowing ? "Unfollow" : "Follow"}
              active={isFollowing}
              onClick={() => {
                setFollowingEntity(isFollowing ? null : selectedEntity);
              }}
            />
            {!isUser && <ActionButton icon={Zap} label="Run task" />}
          </div>

          {/* Quick Chat (proximity only) */}
          {isNearby && (
            <div className="border-t border-white/10 px-4 py-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
                Quick Chat
              </p>
              <div className="flex gap-1.5">
                <input
                  id="entity-chat-input"
                  type="text"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/25"
                  placeholder="Say something..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      handleSendChat();
                    }
                  }}
                  maxLength={120}
                />
                <button
                  className="sq-tap flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70"
                  onClick={handleSendChat}
                  aria-label="Send message"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  readonly icon: typeof MessageSquare;
  readonly label: string;
  readonly onClick?: () => void;
  readonly active?: boolean;
}) {
  return (
    <button
      className={`sq-tap flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors hover:bg-white/10 hover:text-white/80 ${
        active ? "bg-white/10 text-white/80" : "text-white/50"
      }`}
      title={label}
      onClick={onClick}
    >
      <Icon size={14} />
      <span className="text-[9px]">{label}</span>
    </button>
  );
}
