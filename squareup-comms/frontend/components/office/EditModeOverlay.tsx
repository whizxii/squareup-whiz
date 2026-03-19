/**
 * Edit mode overlay — top banner, draggable furniture handles, zone editor,
 * undo/redo, and collision detection.
 *
 * Uses store actions (pushEditorUndo, cancelEdits, moveFurniture, etc.)
 * instead of direct setState calls.
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  X,
  Undo2,
  Redo2,
  Save,
  Trash2,
  RotateCw,
  Plus,
} from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { TILE } from "@/lib/office/office-renderer";
import FurnitureLibrary from "./FurnitureLibrary";
import ZoneEditor from "./ZoneEditor";
import type { OfficeFurniture } from "@/lib/stores/office-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Collision detection — checks if a furniture piece overlaps any other
// ---------------------------------------------------------------------------

function hasCollision(
  item: OfficeFurniture,
  allFurniture: readonly OfficeFurniture[],
  gridCols: number,
  gridRows: number,
): boolean {
  // Out of bounds?
  if (item.x < 0 || item.y < 0) return true;
  if (item.x + item.width > gridCols) return true;
  if (item.y + item.height > gridRows) return true;

  // Overlaps another piece?
  for (const other of allFurniture) {
    if (other.id === item.id) continue;
    const overlapX = item.x < other.x + other.width && item.x + item.width > other.x;
    const overlapY = item.y < other.y + other.height && item.y + item.height > other.y;
    if (overlapX && overlapY) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditModeOverlay() {
  const { tokens } = useOfficeTheme();
  const editMode = useOfficeStore((s) => s.editMode);
  const furniture = useOfficeStore((s) => s.furniture);
  const layout = useOfficeStore((s) => s.layout);
  const editorHistory = useOfficeStore((s) => s.editorHistory);
  const editorFuture = useOfficeStore((s) => s.editorFuture);
  const removeFurniture = useOfficeStore((s) => s.removeFurniture);
  const moveFurniture = useOfficeStore((s) => s.moveFurniture);
  const rotateFurniture = useOfficeStore((s) => s.rotateFurniture);
  const pushEditorUndo = useOfficeStore((s) => s.pushEditorUndo);
  const editorUndo = useOfficeStore((s) => s.editorUndo);
  const editorRedo = useOfficeStore((s) => s.editorRedo);
  const cancelEdits = useOfficeStore((s) => s.cancelEdits);
  const setEditMode = useOfficeStore((s) => s.setEditMode);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drag state (not in store — ephemeral UI state)
  const [dragging, setDragging] = useState<{
    readonly id: string;
    readonly startX: number;
    readonly startY: number;
    readonly origTileX: number;
    readonly origTileY: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    readonly x: number;
    readonly y: number;
    readonly collides: boolean;
  } | null>(null);

  // -----------------------------------------------------------------------
  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo), R (rotate), Delete
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!editMode) return;

    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        editorRedo();
        return;
      }
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        editorUndo();
        return;
      }
      if (e.key.toLowerCase() === "r" && selectedId && !meta) {
        e.preventDefault();
        pushEditorUndo();
        rotateFurniture(selectedId);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        pushEditorUndo();
        removeFurniture(selectedId);
        setSelectedId(null);
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setLibraryOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editMode, selectedId, editorUndo, editorRedo, pushEditorUndo, rotateFurniture, removeFurniture]);

  // -----------------------------------------------------------------------
  // Drag-to-move furniture
  // -----------------------------------------------------------------------
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, item: OfficeFurniture) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setSelectedId(item.id);
      setDragging({
        id: item.id,
        startX: e.clientX,
        startY: e.clientY,
        origTileX: item.x,
        origTileY: item.y,
      });
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;

      // Calculate how many tiles the pointer has moved
      // Need to account for current zoom level
      const zoom = useOfficeStore.getState().zoom;
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;

      const newTileX = dragging.origTileX + Math.round(dx / TILE);
      const newTileY = dragging.origTileY + Math.round(dy / TILE);

      const item = furniture.find((f) => f.id === dragging.id);
      if (!item) return;

      const previewItem = { ...item, x: newTileX, y: newTileY };
      const collides = hasCollision(previewItem, furniture, layout.gridCols, layout.gridRows);

      setDragPreview({ x: newTileX, y: newTileY, collides });
    },
    [dragging, furniture, layout.gridCols, layout.gridRows],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragPreview) {
        setDragging(null);
        setDragPreview(null);
        return;
      }

      // Only move if not colliding and position actually changed
      if (
        !dragPreview.collides &&
        (dragPreview.x !== dragging.origTileX || dragPreview.y !== dragging.origTileY)
      ) {
        pushEditorUndo();
        moveFurniture(dragging.id, dragPreview.x, dragPreview.y);
      }

      setDragging(null);
      setDragPreview(null);
    },
    [dragging, dragPreview, pushEditorUndo, moveFurniture],
  );

  // -----------------------------------------------------------------------
  // Save — persist to backend API, with localStorage fallback
  // -----------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    const state = useOfficeStore.getState();
    const authToken = useAuthStore.getState().token;

    const payload = {
      layout: {
        floor_style: state.layout.floorStyle,
        grid_cols: state.layout.gridCols,
        grid_rows: state.layout.gridRows,
      },
      furniture: state.furniture.map((f) => ({
        id: f.id,
        type: f.type,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        rotation: f.rotation ?? 0,
        zone_id: f.zoneId ?? null,
      })),
      zones: state.zones.map((z) => ({
        id: z.id,
        name: z.name,
        type: z.type,
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
        color: z.color,
        icon: z.icon,
        capacity: z.capacity ?? null,
        is_private: z.isPrivate ?? false,
      })),
    };

    // Try backend API first
    if (authToken) {
      try {
        await fetch(`${API_BASE}/api/office/layout`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // Fall through to localStorage
      }
    }

    // Always save to localStorage as fallback
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "sq-office-layout",
          JSON.stringify({
            furniture: state.furniture,
            zones: state.zones,
            layout: state.layout,
          }),
        );
      } catch {
        // silently fail
      }
    }

    setEditMode(false);
    setLibraryOpen(false);
    setSelectedId(null);
  }, [setEditMode]);

  const handleCancel = useCallback(() => {
    cancelEdits();
    setLibraryOpen(false);
    setSelectedId(null);
  }, [cancelEdits]);

  if (!editMode) return null;

  const selectedItem = selectedId ? furniture.find((f) => f.id === selectedId) : null;

  return (
    <>
      {/* Top banner */}
      <motion.div
        className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: tokens.glass,
          borderBottom: `1px solid ${tokens.glassBorder}`,
          backdropFilter: "blur(16px)",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {/* Left: mode label + hint */}
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: tokens.accent }}
          />
          <span className="text-xs font-medium" style={{ color: tokens.text }}>
            Editing Office
          </span>
          <span className="text-[10px]" style={{ color: tokens.textMuted }}>
            Drag to move &middot; R rotate &middot; Del remove &middot; Ctrl+Z undo
          </span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Undo */}
          <button
            onClick={editorUndo}
            disabled={editorHistory.length === 0}
            className="rounded-lg p-2 transition-colors disabled:opacity-30"
            style={{ color: tokens.textSecondary }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          {/* Redo */}
          <button
            onClick={editorRedo}
            disabled={editorFuture.length === 0}
            className="rounded-lg p-2 transition-colors disabled:opacity-30"
            style={{ color: tokens.textSecondary }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>

          <div
            className="mx-1 h-5 w-px"
            style={{ backgroundColor: tokens.border }}
          />

          {/* Add Furniture */}
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: libraryOpen ? tokens.accentSoft : "transparent",
              color: libraryOpen ? tokens.accent : tokens.textSecondary,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <Package size={12} />
            Furniture
          </button>
          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors"
            style={{
              color: tokens.textSecondary,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <X size={12} />
            Cancel
          </button>
          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
            style={{
              backgroundColor: tokens.accent,
            }}
          >
            <Save size={12} />
            Save
          </button>
        </div>
      </motion.div>

      {/* Furniture selection overlays with drag support */}
      {furniture.map((item) => {
        const isDragging = dragging?.id === item.id;
        const isSelected = selectedId === item.id;
        const displayX =
          isDragging && dragPreview ? dragPreview.x : item.x;
        const displayY =
          isDragging && dragPreview ? dragPreview.y : item.y;
        const collides = isDragging && dragPreview ? dragPreview.collides : false;

        return (
          <div
            key={`handle-${item.id}`}
            className="absolute cursor-grab rounded-sm border-2 transition-colors active:cursor-grabbing"
            style={{
              left: displayX * TILE + 1,
              top: displayY * TILE + 1,
              width: item.width * TILE - 2,
              height: item.height * TILE - 2,
              borderColor: collides
                ? "#EF4444"
                : isSelected
                  ? tokens.accent
                  : tokens.border,
              backgroundColor: collides
                ? "rgba(239, 68, 68, 0.12)"
                : isSelected
                  ? tokens.accentSoft
                  : "transparent",
              zIndex: isDragging ? 20 : 14,
              opacity: isDragging ? 0.85 : 1,
              touchAction: "none",
            }}
            onPointerDown={(e) => handlePointerDown(e, item)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={(e) => {
              e.stopPropagation();
              if (!dragging) {
                setSelectedId(item.id === selectedId ? null : item.id);
              }
            }}
          >
            {/* Action buttons on selected (non-dragging) item */}
            {isSelected && !isDragging && (
              <div className="absolute -top-7 left-0 flex gap-1">
                {/* Rotate */}
                <motion.button
                  className="flex h-5 w-5 items-center justify-center rounded-full shadow-md"
                  style={{
                    backgroundColor: tokens.surface,
                    color: tokens.accent,
                    border: `1px solid ${tokens.border}`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    pushEditorUndo();
                    rotateFurniture(item.id);
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  title="Rotate (R)"
                >
                  <RotateCw size={10} />
                </motion.button>
                {/* Delete */}
                <motion.button
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    pushEditorUndo();
                    removeFurniture(item.id);
                    setSelectedId(null);
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  aria-label={`Delete ${item.type}`}
                  title="Delete (Del)"
                >
                  <Trash2 size={10} />
                </motion.button>
              </div>
            )}

            {/* Rotation indicator */}
            {item.rotation && item.rotation > 0 && (
              <span
                className="absolute bottom-0 right-0.5 text-[8px]"
                style={{ color: tokens.textMuted }}
              >
                {item.rotation}°
              </span>
            )}
          </div>
        );
      })}

      {/* Zone editor */}
      <ZoneEditor />

      {/* Furniture library panel */}
      <FurnitureLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />
    </>
  );
}
