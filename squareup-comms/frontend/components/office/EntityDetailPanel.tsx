/**
 * Glass slide-in panel showing details for a selected user or agent.
 * Slides in from the right with spring animation.
 * Fully themed via useOfficeTheme.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Hand, Eye, Zap, Send } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import type { OfficeThemeTokens } from "@/lib/office/theme";

const STATUS_LABELS: Readonly<Record<string, string>> = {
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

function getStatusColor(status: string, tokens: OfficeThemeTokens): string {
  const map: Readonly<Record<string, string>> = {
    online: tokens.status.online,
    away: tokens.status.away,
    busy: tokens.status.busy,
    dnd: tokens.status.dnd,
    idle: tokens.status.online,
    thinking: tokens.status.away,
    working: tokens.accent,
    error: tokens.status.busy,
    offline: tokens.status.offline,
  };
  return map[status] ?? tokens.status.offline;
}

export default function EntityDetailPanel() {
  const { tokens } = useOfficeTheme();
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
          className="absolute top-4 right-4 z-50 w-64 overflow-hidden rounded-2xl shadow-xl"
          style={{
            backgroundColor: tokens.glass,
            backdropFilter: "blur(24px) saturate(180%)",
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowLg,
          }}
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${tokens.borderSubtle}` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  backgroundColor: isUser ? tokens.accentSoft : `${tokens.accent}20`,
                  color: tokens.accent,
                }}
              >
                {isUser
                  ? (entity as (typeof users)[number]).name.charAt(0)
                  : (entity as (typeof agents)[number]).icon}
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: tokens.text }}
                >
                  {isUser
                    ? (entity as (typeof users)[number]).name
                    : (entity as (typeof agents)[number]).name}
                </p>
                <div className="flex items-center gap-1">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: getStatusColor(
                        isUser
                          ? (entity as (typeof users)[number]).status
                          : (entity as (typeof agents)[number]).status,
                        tokens
                      ),
                    }}
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: tokens.textMuted }}
                  >
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
              className="sq-tap flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
              style={{ color: tokens.textMuted }}
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
                    <p
                      className="text-[10px] font-medium uppercase tracking-wider"
                      style={{ color: tokens.textMuted }}
                    >
                      Activity
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: tokens.textSecondary }}
                    >
                      {(entity as (typeof users)[number]).activity}
                    </p>
                  </div>
                )}
                {(entity as (typeof users)[number]).statusMessage && (
                  <div>
                    <p
                      className="text-[10px] font-medium uppercase tracking-wider"
                      style={{ color: tokens.textMuted }}
                    >
                      Status
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: tokens.textSecondary }}
                    >
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
                    <p
                      className="text-[10px] font-medium uppercase tracking-wider"
                      style={{ color: tokens.textMuted }}
                    >
                      Current Task
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: tokens.textSecondary }}
                    >
                      {(entity as (typeof agents)[number]).currentTask}
                    </p>
                  </div>
                )}
                <div>
                  <p
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: tokens.textMuted }}
                  >
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
              <p
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: tokens.textMuted }}
              >
                Position
              </p>
              <p className="text-xs" style={{ color: tokens.textMuted }}>
                Tile ({(entity as { x: number; y: number }).x},{" "}
                {(entity as { x: number; y: number }).y})
              </p>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex gap-1 px-4 py-3"
            style={{ borderTop: `1px solid ${tokens.borderSubtle}` }}
          >
            <ActionButton
              icon={MessageSquare}
              label="Message"
              tokens={tokens}
              onClick={() => {
                const input = document.getElementById("entity-chat-input");
                if (input) input.focus();
              }}
            />
            <ActionButton
              icon={Hand}
              label="Wave"
              tokens={tokens}
              onClick={() => {
                if (selectedEntity) sendWave(selectedEntity);
              }}
            />
            <ActionButton
              icon={Eye}
              label={isFollowing ? "Unfollow" : "Follow"}
              active={isFollowing}
              tokens={tokens}
              onClick={() => {
                setFollowingEntity(isFollowing ? null : selectedEntity);
              }}
            />
            {!isUser && (
              <ActionButton icon={Zap} label="Run task" tokens={tokens} />
            )}
          </div>

          {/* Quick Chat (proximity only) */}
          {isNearby && (
            <div
              className="px-4 py-3"
              style={{ borderTop: `1px solid ${tokens.borderSubtle}` }}
            >
              <p
                className="mb-2 text-[10px] font-medium uppercase tracking-wider"
                style={{ color: tokens.textMuted }}
              >
                Quick Chat
              </p>
              <div className="flex gap-1.5">
                <input
                  id="entity-chat-input"
                  type="text"
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  style={{
                    backgroundColor: tokens.accentSoft,
                    border: `1px solid ${tokens.borderSubtle}`,
                    color: tokens.text,
                  }}
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
                  className="sq-tap flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                  style={{ color: tokens.textMuted }}
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
  tokens,
}: {
  readonly icon: typeof MessageSquare;
  readonly label: string;
  readonly onClick?: () => void;
  readonly active?: boolean;
  readonly tokens: OfficeThemeTokens;
}) {
  return (
    <button
      className="sq-tap flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors"
      style={{
        color: active ? tokens.accent : tokens.textMuted,
        backgroundColor: active ? tokens.accentSoft : "transparent",
      }}
      title={label}
      onClick={onClick}
    >
      <Icon size={14} />
      <span className="text-[9px]">{label}</span>
    </button>
  );
}
