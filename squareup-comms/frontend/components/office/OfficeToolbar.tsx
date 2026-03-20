/**
 * SoWork-style floating bottom toolbar.
 *
 * Center: media controls (mic, camera, screen share, reactions).
 * Left group: view mode toggle + zoom.
 * Right group: user count, edit mode, settings.
 * Fully themed via useOfficeTheme.
 */

"use client";

import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Smile,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  Map,
  Pencil,
  Users,
  Settings,
  Keyboard,
  X,
} from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCallStore } from "@/lib/stores/call-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { useState, useRef, useEffect } from "react";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "👏", "🔥", "✨"];

interface OfficeToolbarProps {
  readonly onReaction?: (emoji: string) => void;
}

export default function OfficeToolbar({ onReaction }: OfficeToolbarProps) {
  const { tokens } = useOfficeTheme();

  const zoom = useOfficeStore((s) => s.zoom);
  const setZoom = useOfficeStore((s) => s.setZoom);
  const editMode = useOfficeStore((s) => s.editMode);
  const setEditMode = useOfficeStore((s) => s.setEditMode);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const setViewMode = useOfficeStore((s) => s.setViewMode);
  const followingEntity = useOfficeStore((s) => s.followingEntity);
  const setFollowingEntity = useOfficeStore((s) => s.setFollowingEntity);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);

  // Media controls — wired to call store so CallOverlay stays in sync
  const isMuted = useCallStore((s) => s.isMuted);
  const isVideoOff = useCallStore((s) => s.isVideoOff);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleVideo = useCallStore((s) => s.toggleVideo);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);

  // Emoji reactions picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showEmojiPicker]);

  const followingName = followingEntity
    ? followingEntity.type === "user"
      ? users.find((u) => u.id === followingEntity.id)?.name
      : agents.find((a) => a.id === followingEntity.id)?.name
    : null;

  const onlineCount = users.filter((u) => u.status === "online").length;

  return (
    <motion.div
      className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl px-2 py-1.5"
      style={{
        backgroundColor: tokens.glass,
        backdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${tokens.glassBorder}`,
        boxShadow: tokens.shadowLg,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.14, 0.9, 0.2, 1] }}
    >
      {/* ── Left: View mode toggle ── */}
      <div
        className="flex items-center gap-0.5 rounded-xl px-1 py-0.5 mr-1"
        style={{ backgroundColor: tokens.accentSoft }}
      >
        <ViewToggle
          label="Simplified"
          icon={LayoutGrid}
          active={viewMode === "simplified"}
          onClick={() => setViewMode("simplified")}
          tokens={tokens}
        />
        <ViewToggle
          label="Immersive"
          icon={Map}
          active={viewMode === "immersive"}
          onClick={() => setViewMode("immersive")}
          tokens={tokens}
        />
      </div>

      {/* ── Left: Zoom (immersive only) ── */}
      {viewMode === "immersive" && (
        <div
          className="flex items-center gap-0.5 rounded-xl px-1 py-0.5 mr-1"
          style={{ border: `1px solid ${tokens.borderSubtle}` }}
        >
          <ToolbarBtn
            icon={ZoomOut}
            onClick={() => setZoom(zoom - 0.15)}
            label="Zoom out"
            tokens={tokens}
          />
          <span
            className="min-w-[28px] text-center text-[11px] font-medium"
            style={{ color: tokens.textSecondary }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarBtn
            icon={ZoomIn}
            onClick={() => setZoom(zoom + 0.15)}
            label="Zoom in"
            tokens={tokens}
          />
        </div>
      )}

      {/* ── Divider ── */}
      <Divider color={tokens.border} />

      {/* ── Center: Media controls ── */}
      <div className="relative flex items-center gap-1 px-2">
        <MediaBtn
          icon={isMuted ? MicOff : Mic}
          onClick={toggleMute}
          label={isMuted ? "Unmute" : "Mute"}
          active={!isMuted}
          tokens={tokens}
        />
        <MediaBtn
          icon={isVideoOff ? VideoOff : Video}
          onClick={toggleVideo}
          label={isVideoOff ? "Start camera" : "Stop camera"}
          active={!isVideoOff}
          tokens={tokens}
        />
        <MediaBtn
          icon={MonitorUp}
          onClick={toggleScreenShare}
          label="Share screen"
          tokens={tokens}
        />
        <div ref={emojiPickerRef} className="relative">
          <MediaBtn
            icon={Smile}
            onClick={() => setShowEmojiPicker((v) => !v)}
            label="Reactions"
            active={showEmojiPicker}
            tokens={tokens}
          />
          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1 rounded-2xl px-3 py-2 shadow-xl"
              style={{
                backgroundColor: tokens.glass,
                backdropFilter: "blur(24px) saturate(180%)",
                border: `1px solid ${tokens.glassBorder}`,
              }}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className="text-xl transition-transform hover:scale-125 active:scale-90"
                  onClick={() => {
                    onReaction?.(emoji);
                    setShowEmojiPicker(false);
                  }}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <Divider color={tokens.border} />

      {/* ── Right: Utilities ── */}
      <div className="flex items-center gap-0.5 px-1">
        {/* Online user count */}
        <div
          className="flex items-center gap-1 rounded-lg px-2 py-1"
          title={`${onlineCount} online`}
        >
          <Users size={13} style={{ color: tokens.status.online }} />
          <span
            className="text-[11px] font-medium"
            style={{ color: tokens.textSecondary }}
          >
            {onlineCount}
          </span>
        </div>

        <ToolbarBtn
          icon={Pencil}
          onClick={() => setEditMode(!editMode)}
          label="Edit office"
          active={editMode}
          tokens={tokens}
        />
        <ToolbarBtn
          icon={Keyboard}
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))
          }
          label="Shortcuts"
          tokens={tokens}
        />
        <ToolbarBtn
          icon={Settings}
          onClick={() => {}}
          label="Settings"
          tokens={tokens}
        />
      </div>

      {/* ── Follow indicator (overlay pill) ── */}
      {followingName && (
        <>
          <Divider color={tokens.border} />
          <div className="flex items-center gap-1 pl-1 pr-0.5">
            <span
              className="text-[10px] font-medium"
              style={{ color: tokens.textSecondary }}
            >
              Following {followingName}
            </span>
            <button
              onClick={() => setFollowingEntity(null)}
              className="sq-tap flex h-5 w-5 items-center justify-center rounded"
              style={{ color: tokens.textMuted }}
              aria-label="Stop following"
            >
              <X size={10} />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TokensProp {
  readonly tokens: ReturnType<typeof import("@/lib/office/theme").getOfficeTheme>;
}

function ViewToggle({
  label,
  icon: Icon,
  active,
  onClick,
  tokens,
}: {
  readonly label: string;
  readonly icon: typeof LayoutGrid;
  readonly active: boolean;
  readonly onClick: () => void;
} & TokensProp) {
  return (
    <button
      className="sq-tap flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all"
      style={{
        backgroundColor: active ? tokens.accent : "transparent",
        color: active ? "#FFFFFF" : tokens.textMuted,
      }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function MediaBtn({
  icon: Icon,
  onClick,
  label,
  active = false,
  tokens,
}: {
  readonly icon: typeof Mic;
  readonly onClick: () => void;
  readonly label: string;
  readonly active?: boolean;
} & TokensProp) {
  return (
    <button
      className="sq-tap flex h-9 w-9 items-center justify-center rounded-xl transition-all"
      style={{
        backgroundColor: active ? tokens.accentSoft : "transparent",
        color: active ? tokens.accent : tokens.textMuted,
      }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={18} />
    </button>
  );
}

function ToolbarBtn({
  icon: Icon,
  onClick,
  label,
  active = false,
  tokens,
}: {
  readonly icon: typeof ZoomIn;
  readonly onClick: () => void;
  readonly label: string;
  readonly active?: boolean;
} & TokensProp) {
  return (
    <button
      className="sq-tap flex h-7 w-7 items-center justify-center rounded-lg transition-all"
      style={{
        backgroundColor: active ? tokens.accentSoft : "transparent",
        color: active ? tokens.accent : tokens.textMuted,
      }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}

function Divider({ color }: { readonly color: string }) {
  return (
    <div className="mx-0.5 h-6 w-px" style={{ backgroundColor: color }} />
  );
}
