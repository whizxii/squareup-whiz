/**
 * Zone creation and editing overlay for edit mode.
 * Right-click empty area to create zones, click existing zones to configure.
 *
 * Uses store actions (addZone, updateZone, deleteZone, pushEditorUndo)
 * instead of direct setState calls.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Unlock, Trash2, Check } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { ZONE_ACCENTS } from "@/lib/office/theme";
import type { OfficeZone, ZoneType } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";

// ---------------------------------------------------------------------------
// Zone type presets
// ---------------------------------------------------------------------------

interface ZonePreset {
  readonly type: ZoneType;
  readonly label: string;
  readonly emoji: string;
  readonly color: string;
}

const ZONE_PRESETS: readonly ZonePreset[] = [
  { type: "desk", label: "Desk Area", emoji: "\u{1F4BB}", color: ZONE_ACCENTS.desk ?? "#4F46E5" },
  { type: "meeting", label: "Meeting Room", emoji: "\u{1F3A5}", color: ZONE_ACCENTS.meeting ?? "#22c55e" },
  { type: "lounge", label: "Lounge", emoji: "\u{2615}", color: ZONE_ACCENTS.lounge ?? "#eab308" },
  { type: "focus", label: "Focus Pod", emoji: "\u{1F3A7}", color: ZONE_ACCENTS.focus ?? "#6366f1" },
  { type: "agent_station", label: "Agent Station", emoji: "\u{1F916}", color: ZONE_ACCENTS.agent_station ?? "#06b6d4" },
];

// ---------------------------------------------------------------------------
// Zone config popover
// ---------------------------------------------------------------------------

function ZoneConfigPopover({
  zone,
  onUpdate,
  onDelete,
  onClose,
}: {
  readonly zone: OfficeZone;
  readonly onUpdate: (patch: Partial<OfficeZone>) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}) {
  const { tokens } = useOfficeTheme();
  const [name, setName] = useState(zone.name);
  const [capacity, setCapacity] = useState(zone.capacity ?? 4);
  const [isPrivate, setIsPrivate] = useState(zone.isPrivate ?? false);

  const handleSave = () => {
    onUpdate({ name, capacity, isPrivate });
    onClose();
  };

  return (
    <motion.div
      className="absolute z-50 w-56 rounded-xl p-3 shadow-xl"
      style={{
        left: zone.x * TILE + zone.width * TILE + 8,
        top: zone.y * TILE,
        backgroundColor: tokens.glass,
        border: `1px solid ${tokens.glassBorder}`,
        backdropFilter: "blur(20px) saturate(180%)",
        boxShadow: tokens.shadowLg,
      }}
      initial={{ opacity: 0, scale: 0.9, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{ color: tokens.text }}
        >
          Edit Zone
        </span>
        <button
          onClick={onClose}
          className="transition-colors"
          style={{ color: tokens.textMuted }}
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Name */}
      <label className="mb-2 block">
        <span
          className="mb-1 block text-[10px]"
          style={{ color: tokens.textMuted }}
        >
          Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: tokens.accentSoft,
            border: `1px solid ${tokens.border}`,
            color: tokens.text,
          }}
        />
      </label>

      {/* Capacity */}
      <label className="mb-2 block">
        <span
          className="mb-1 block text-[10px]"
          style={{ color: tokens.textMuted }}
        >
          Capacity
        </span>
        <input
          type="number"
          min={1}
          max={20}
          value={capacity}
          onChange={(e) =>
            setCapacity(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))
          }
          className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: tokens.accentSoft,
            border: `1px solid ${tokens.border}`,
            color: tokens.text,
          }}
        />
      </label>

      {/* Privacy toggle */}
      <button
        onClick={() => setIsPrivate(!isPrivate)}
        className="mb-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors"
        style={{
          backgroundColor: tokens.accentSoft,
          border: `1px solid ${tokens.border}`,
          color: tokens.textSecondary,
        }}
      >
        {isPrivate ? <Lock size={11} /> : <Unlock size={11} />}
        {isPrivate ? "Private" : "Public"}
      </button>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: tokens.accentSoft,
            color: tokens.accent,
          }}
        >
          <Check size={11} /> Save
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center rounded-lg px-2 py-1.5 text-xs transition-colors"
          style={{
            color: "#ef4444",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
          aria-label="Delete zone"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// New zone creation menu (right-click context menu)
// ---------------------------------------------------------------------------

function NewZoneMenu({
  screenX,
  screenY,
  tileX,
  tileY,
  onSelect,
  onClose,
}: {
  readonly screenX: number;
  readonly screenY: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly onSelect: (preset: ZonePreset, tx: number, ty: number) => void;
  readonly onClose: () => void;
}) {
  const { tokens } = useOfficeTheme();

  return (
    <motion.div
      className="absolute z-50 w-44 rounded-xl p-2 shadow-xl"
      style={{
        left: screenX,
        top: screenY,
        backgroundColor: tokens.glass,
        border: `1px solid ${tokens.glassBorder}`,
        backdropFilter: "blur(20px) saturate(180%)",
        boxShadow: tokens.shadowLg,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <p
        className="mb-1 px-1 text-[10px]"
        style={{ color: tokens.textMuted }}
      >
        Create Zone
      </p>
      {ZONE_PRESETS.map((preset) => (
        <button
          key={preset.type}
          onClick={() => onSelect(preset, tileX, tileY)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
          style={{ color: tokens.textSecondary }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              tokens.accentSoft;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "transparent";
          }}
        >
          <span>{preset.emoji}</span>
          {preset.label}
        </button>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Zone Editor
// ---------------------------------------------------------------------------

export default function ZoneEditor() {
  const { tokens } = useOfficeTheme();
  const editMode = useOfficeStore((s) => s.editMode);
  const zones = useOfficeStore((s) => s.zones);
  const layout = useOfficeStore((s) => s.layout);
  const addZone = useOfficeStore((s) => s.addZone);
  const updateZone = useOfficeStore((s) => s.updateZone);
  const deleteZone = useOfficeStore((s) => s.deleteZone);
  const pushEditorUndo = useOfficeStore((s) => s.pushEditorUndo);

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [newZoneMenu, setNewZoneMenu] = useState<{
    readonly screenX: number;
    readonly screenY: number;
    readonly tileX: number;
    readonly tileY: number;
  } | null>(null);

  const handleUpdateZone = useCallback(
    (zoneId: string, patch: Partial<OfficeZone>) => {
      pushEditorUndo();
      updateZone(zoneId, patch);
    },
    [pushEditorUndo, updateZone],
  );

  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      pushEditorUndo();
      deleteZone(zoneId);
      setEditingZoneId(null);
    },
    [pushEditorUndo, deleteZone],
  );

  const handleCreateZone = useCallback(
    (preset: ZonePreset, tileX: number, tileY: number) => {
      const newZone: OfficeZone = {
        id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: preset.label,
        type: preset.type,
        x: tileX,
        y: tileY,
        width: 2,
        height: 2,
        color: preset.color,
        icon: preset.emoji,
        capacity: 4,
      };
      pushEditorUndo();
      addZone(newZone);
      setNewZoneMenu(null);
      // Auto-select for immediate editing
      setEditingZoneId(newZone.id);
    },
    [pushEditorUndo, addZone],
  );

  // Right-click handler for creating new zones on empty space
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Convert screen position to tile coordinates
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const zoom = useOfficeStore.getState().zoom;
      const relX = (e.clientX - rect.left) / zoom;
      const relY = (e.clientY - rect.top) / zoom;
      const tileX = Math.floor(relX / TILE);
      const tileY = Math.floor(relY / TILE);

      // Check bounds
      if (tileX < 0 || tileY < 0 || tileX >= layout.gridCols || tileY >= layout.gridRows) {
        return;
      }

      setNewZoneMenu({
        screenX: relX,
        screenY: relY,
        tileX,
        tileY,
      });
      setEditingZoneId(null);
    },
    [layout.gridCols, layout.gridRows],
  );

  if (!editMode) return null;

  const editingZone = editingZoneId
    ? zones.find((z) => z.id === editingZoneId)
    : null;

  return (
    <>
      {/* Invisible capture layer for right-click zone creation */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 13 }}
        onContextMenu={handleContextMenu}
        onClick={() => {
          setNewZoneMenu(null);
          setEditingZoneId(null);
        }}
      />

      {/* Click targets on existing zones for editing */}
      {zones.map((zone) => {
        const isEditing = editingZoneId === zone.id;
        return (
          <div
            key={`edit-${zone.id}`}
            className="absolute cursor-pointer border-2 border-dashed transition-colors"
            style={{
              left: zone.x * TILE,
              top: zone.y * TILE,
              width: zone.width * TILE,
              height: zone.height * TILE,
              borderColor: isEditing
                ? tokens.accent
                : tokens.border,
              backgroundColor: isEditing
                ? tokens.accentSoft
                : "transparent",
              zIndex: 15,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingZoneId(zone.id === editingZoneId ? null : zone.id);
              setNewZoneMenu(null);
            }}
          >
            {/* Zone label */}
            <span
              className="absolute left-1 top-0.5 text-[9px] font-medium"
              style={{ color: tokens.textMuted }}
            >
              {zone.icon} {zone.name}
            </span>
          </div>
        );
      })}

      {/* Zone config popover */}
      <AnimatePresence>
        {editingZone && (
          <ZoneConfigPopover
            key={editingZone.id}
            zone={editingZone}
            onUpdate={(patch) => handleUpdateZone(editingZone.id, patch)}
            onDelete={() => handleDeleteZone(editingZone.id)}
            onClose={() => setEditingZoneId(null)}
          />
        )}
      </AnimatePresence>

      {/* New zone creation menu */}
      <AnimatePresence>
        {newZoneMenu && (
          <NewZoneMenu
            key="new-zone-menu"
            screenX={newZoneMenu.screenX}
            screenY={newZoneMenu.screenY}
            tileX={newZoneMenu.tileX}
            tileY={newZoneMenu.tileY}
            onSelect={handleCreateZone}
            onClose={() => setNewZoneMenu(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
