/**
 * Bottom glass toolbar with status, zoom controls, edit toggle, and time indicator.
 * Matches the "Warm Glass" design language with backdrop-blur.
 */

"use client";

import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Gamepad2,
  Pencil,
  Clock,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  CloudLightning,
  Cloud,
  List,
  Keyboard,
} from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import type { DayPhase } from "@/lib/stores/office-store";
import { X } from "lucide-react";

const DAY_ICONS: Record<DayPhase, typeof Sun> = {
  dawn: Sun,
  morning: Sun,
  afternoon: Sun,
  golden: Sun,
  dusk: Moon,
  night: Moon,
};

const DAY_LABELS: Record<DayPhase, string> = {
  dawn: "Dawn",
  morning: "Morning",
  afternoon: "Afternoon",
  golden: "Golden Hour",
  dusk: "Dusk",
  night: "Night",
};

export default function OfficeToolbar() {
  const zoom = useOfficeStore((s) => s.zoom);
  const setZoom = useOfficeStore((s) => s.setZoom);
  const editMode = useOfficeStore((s) => s.editMode);
  const setEditMode = useOfficeStore((s) => s.setEditMode);
  const dayPhase = useOfficeStore((s) => s.dayPhase);
  const weather = useOfficeStore((s) => s.weather);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const setViewMode = useOfficeStore((s) => s.setViewMode);
  const listViewActive = useOfficeStore((s) => s.listViewActive);
  const setListViewActive = useOfficeStore((s) => s.setListViewActive);
  const followingEntity = useOfficeStore((s) => s.followingEntity);
  const setFollowingEntity = useOfficeStore((s) => s.setFollowingEntity);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);

  const followingName = followingEntity
    ? followingEntity.type === "user"
      ? users.find((u) => u.id === followingEntity.id)?.name
      : agents.find((a) => a.id === followingEntity.id)?.name
    : null;

  const DayIcon = DAY_ICONS[dayPhase];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const WeatherIcon =
    weather === "rain"
      ? CloudRain
      : weather === "storm"
        ? CloudLightning
        : weather === "snow"
          ? Snowflake
          : weather === "cloudy"
            ? Cloud
            : Sun;

  return (
    <motion.div
      className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/15 px-3 py-2 shadow-lg"
      style={{
        backgroundColor: "rgba(30, 27, 24, 0.75)",
        backdropFilter: "blur(24px) saturate(180%)",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Time & phase */}
      <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
        <DayIcon size={14} className="text-white/60" />
        <span className="text-[11px] font-medium text-white/70">{timeStr}</span>
        <span className="text-[9px] text-white/40">{DAY_LABELS[dayPhase]}</span>
      </div>

      {/* Weather */}
      <div className="flex items-center gap-1 border-r border-white/10 px-2">
        <WeatherIcon size={13} className="text-white/50" />
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-0.5 rounded-lg border border-white/10 px-1 py-0.5 mr-1">
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: viewMode === "grid" ? "rgba(255,107,0,0.2)" : "transparent",
            color: viewMode === "grid" ? "#FF6B00" : "rgba(255,255,255,0.5)",
          }}
          onClick={() => setViewMode("grid")}
          aria-label="Grid view"
        >
          <Grid3X3 size={12} />
          Grid
        </button>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: viewMode === "pixel" ? "rgba(255,107,0,0.2)" : "transparent",
            color: viewMode === "pixel" ? "#FF6B00" : "rgba(255,255,255,0.5)",
          }}
          onClick={() => setViewMode("pixel")}
          aria-label="Pixel view"
        >
          <Gamepad2 size={12} />
          Pixel
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 border-r border-white/10 px-2">
        <ToolbarButton
          icon={ZoomOut}
          onClick={() => setZoom(zoom - 0.15)}
          label="Zoom out"
        />
        <span className="min-w-[32px] text-center text-[11px] font-medium text-white/70">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton
          icon={ZoomIn}
          onClick={() => setZoom(zoom + 0.15)}
          label="Zoom in"
        />
      </div>

      {/* List view toggle */}
      <ToolbarButton
        icon={List}
        onClick={() => setListViewActive(!listViewActive)}
        label="Toggle list view"
        active={listViewActive}
      />

      {/* Grid toggle */}
      <ToolbarButton
        icon={Grid3X3}
        onClick={() => useOfficeStore.getState().setShowGrid(!useOfficeStore.getState().showGrid)}
        label="Toggle grid"
        active={useOfficeStore.getState().showGrid}
      />

      {/* Edit mode */}
      <ToolbarButton
        icon={Pencil}
        onClick={() => setEditMode(!editMode)}
        label="Edit office"
        active={editMode}
      />

      {/* Keyboard shortcuts */}
      <ToolbarButton
        icon={Keyboard}
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
        label="Keyboard shortcuts"
      />

      {/* Follow mode indicator */}
      {followingName && (
        <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
          <span className="text-[10px] font-medium text-white/70">
            Following {followingName}
          </span>
          <button
            onClick={() => setFollowingEntity(null)}
            className="flex h-4 w-4 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/70"
            aria-label="Stop following"
          >
            <X size={10} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ToolbarButton({
  icon: Icon,
  onClick,
  label,
  active = false,
}: {
  readonly icon: typeof ZoomIn;
  readonly onClick: () => void;
  readonly label: string;
  readonly active?: boolean;
}) {
  return (
    <button
      className="sq-tap flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
      style={{
        backgroundColor: active ? "rgba(255,107,0,0.25)" : "transparent",
        color: active ? "#FF6B00" : "rgba(255,255,255,0.6)",
      }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}
