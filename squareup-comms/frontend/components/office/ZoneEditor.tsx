/**
 * Zone creation and editing overlay for edit mode.
 * Click empty area to create zones, click existing zones to configure.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Unlock, Trash2, Check } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import type { OfficeZone, ZoneType } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";

// ---------------------------------------------------------------------------
// Zone type presets
// ---------------------------------------------------------------------------

interface ZonePreset {
  readonly type: ZoneType;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}

const ZONE_PRESETS: readonly ZonePreset[] = [
  { type: "desk", label: "Desk Area", icon: "\u{1F4BB}", color: "#FF6B00" },
  { type: "meeting", label: "Meeting Room", icon: "\u{1F3A5}", color: "#22c55e" },
  { type: "lounge", label: "Lounge", icon: "\u{2615}", color: "#eab308" },
  { type: "focus", label: "Focus Pod", icon: "\u{1F3A7}", color: "#6366f1" },
  { type: "agent_station", label: "Agent Station", icon: "\u{1F916}", color: "#06b6d4" },
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
  readonly onUpdate: (updated: OfficeZone) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}) {
  const [name, setName] = useState(zone.name);
  const [capacity, setCapacity] = useState(zone.capacity ?? 4);
  const [isPrivate, setIsPrivate] = useState(zone.isPrivate ?? false);

  const handleSave = () => {
    onUpdate({ ...zone, name, capacity, isPrivate });
    onClose();
  };

  return (
    <motion.div
      className="absolute z-50 w-56 rounded-xl border border-white/15 p-3 shadow-xl"
      style={{
        left: zone.x * TILE + zone.width * TILE + 8,
        top: zone.y * TILE,
        backgroundColor: "rgba(30, 25, 20, 0.92)",
        backdropFilter: "blur(20px)",
      }}
      initial={{ opacity: 0, scale: 0.9, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">Edit Zone</span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Name */}
      <label className="mb-2 block">
        <span className="mb-1 block text-[10px] text-white/40">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/80 outline-none focus:border-[#FF6B00]/40"
        />
      </label>

      {/* Capacity */}
      <label className="mb-2 block">
        <span className="mb-1 block text-[10px] text-white/40">Capacity</span>
        <input
          type="number"
          min={1}
          max={20}
          value={capacity}
          onChange={(e) => setCapacity(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/80 outline-none focus:border-[#FF6B00]/40"
        />
      </label>

      {/* Privacy toggle */}
      <button
        onClick={() => setIsPrivate(!isPrivate)}
        className="mb-3 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/8"
      >
        {isPrivate ? <Lock size={11} /> : <Unlock size={11} />}
        {isPrivate ? "Private" : "Public"}
      </button>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#FF6B00]/20 px-2 py-1.5 text-xs font-medium text-[#FF6B00] transition-colors hover:bg-[#FF6B00]/30"
        >
          <Check size={11} /> Save
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center rounded-lg border border-red-500/20 px-2 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          aria-label="Delete zone"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Zone Editor
// ---------------------------------------------------------------------------

export default function ZoneEditor() {
  const editMode = useOfficeStore((s) => s.editMode);
  const zones = useOfficeStore((s) => s.zones);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [showNewZoneMenu, setShowNewZoneMenu] = useState<{ x: number; y: number } | null>(null);

  // Direct store mutations via getState for zone CRUD
  const handleUpdateZone = useCallback((updated: OfficeZone) => {
    const store = useOfficeStore.getState();
    const newZones = store.zones.map((z) => (z.id === updated.id ? updated : z));
    useOfficeStore.setState({ zones: newZones });
  }, []);

  const handleDeleteZone = useCallback((zoneId: string) => {
    const store = useOfficeStore.getState();
    const newZones = store.zones.filter((z) => z.id !== zoneId);
    useOfficeStore.setState({ zones: newZones });
    setEditingZoneId(null);
  }, []);

  const handleCreateZone = useCallback((preset: ZonePreset, tileX: number, tileY: number) => {
    const newZone: OfficeZone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: preset.label,
      type: preset.type,
      x: tileX,
      y: tileY,
      width: 2,
      height: 2,
      color: preset.color,
      icon: preset.icon,
      capacity: 4,
    };
    const store = useOfficeStore.getState();
    useOfficeStore.setState({ zones: [...store.zones, newZone] });
    setShowNewZoneMenu(null);
  }, []);

  if (!editMode) return null;

  const editingZone = editingZoneId ? zones.find((z) => z.id === editingZoneId) : null;

  return (
    <>
      {/* Click targets on existing zones for editing */}
      {zones.map((zone) => (
        <div
          key={`edit-${zone.id}`}
          className="absolute cursor-pointer border-2 border-dashed transition-colors hover:border-[#FF6B00]/50"
          style={{
            left: zone.x * TILE,
            top: zone.y * TILE,
            width: zone.width * TILE,
            height: zone.height * TILE,
            borderColor: editingZoneId === zone.id ? "#FF6B00" : "rgba(255,255,255,0.2)",
            zIndex: 15,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setEditingZoneId(zone.id === editingZoneId ? null : zone.id);
            setShowNewZoneMenu(null);
          }}
        />
      ))}

      {/* Zone config popover */}
      <AnimatePresence>
        {editingZone && (
          <ZoneConfigPopover
            key={editingZone.id}
            zone={editingZone}
            onUpdate={handleUpdateZone}
            onDelete={() => handleDeleteZone(editingZone.id)}
            onClose={() => setEditingZoneId(null)}
          />
        )}
      </AnimatePresence>

      {/* New zone creation menu */}
      <AnimatePresence>
        {showNewZoneMenu && (
          <motion.div
            className="absolute z-50 w-44 rounded-xl border border-white/15 p-2 shadow-xl"
            style={{
              left: showNewZoneMenu.x,
              top: showNewZoneMenu.y,
              backgroundColor: "rgba(30, 25, 20, 0.92)",
              backdropFilter: "blur(20px)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="mb-1 px-1 text-[10px] text-white/40">Create Zone</p>
            {ZONE_PRESETS.map((preset) => (
              <button
                key={preset.type}
                onClick={() => {
                  const tileX = Math.floor(showNewZoneMenu.x / TILE);
                  const tileY = Math.floor(showNewZoneMenu.y / TILE);
                  handleCreateZone(preset, tileX, tileY);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/70 transition-colors hover:bg-white/8"
              >
                <span>{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
