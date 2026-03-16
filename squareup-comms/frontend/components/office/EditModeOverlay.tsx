/**
 * Edit mode overlay — top banner, furniture drag handles, and context actions.
 * Shown only when editMode is true.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, X, Undo2, Save, Trash2 } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";
import FurnitureLibrary from "./FurnitureLibrary";
import ZoneEditor from "./ZoneEditor";

export default function EditModeOverlay() {
  const editMode = useOfficeStore((s) => s.editMode);
  const setEditMode = useOfficeStore((s) => s.setEditMode);
  const furniture = useOfficeStore((s) => s.furniture);
  const removeFurniture = useOfficeStore((s) => s.removeFurniture);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);

  const handleCancel = useCallback(() => {
    setEditMode(false);
    setLibraryOpen(false);
    setSelectedFurnitureId(null);
  }, [setEditMode]);

  const handleSave = useCallback(() => {
    // Persist to localStorage
    if (typeof window !== "undefined") {
      try {
        const state = useOfficeStore.getState();
        const layoutData = {
          furniture: state.furniture,
          zones: state.zones,
          layout: state.layout,
        };
        localStorage.setItem("sq-office-layout", JSON.stringify(layoutData));
      } catch {
        // silently fail
      }
    }
    setEditMode(false);
    setLibraryOpen(false);
    setSelectedFurnitureId(null);
  }, [setEditMode]);

  if (!editMode) return null;

  return (
    <>
      {/* Top banner */}
      <motion.div
        className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/10 px-4 py-2"
        style={{
          backgroundColor: "rgba(30, 25, 20, 0.85)",
          backdropFilter: "blur(16px)",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#FF6B00]" />
          <span className="text-xs font-medium text-white/80">
            Editing Office
          </span>
          <span className="text-[10px] text-white/40">
            Click furniture to select, drag to move
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10"
          >
            <Package size={12} />
            Add Furniture
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10"
          >
            <X size={12} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg bg-[#FF6B00] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#e56000]"
          >
            <Save size={12} />
            Save
          </button>
        </div>
      </motion.div>

      {/* Furniture selection overlays */}
      {furniture.map((item) => (
        <div
          key={`handle-${item.id}`}
          className="absolute cursor-pointer rounded-sm border transition-colors"
          style={{
            left: item.x * TILE + 1,
            top: item.y * TILE + 1,
            width: item.width * TILE - 2,
            height: item.height * TILE - 2,
            borderColor:
              selectedFurnitureId === item.id
                ? "#FF6B00"
                : "rgba(255,255,255,0.12)",
            backgroundColor:
              selectedFurnitureId === item.id
                ? "rgba(255,107,0,0.1)"
                : "transparent",
            zIndex: 14,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedFurnitureId(
              item.id === selectedFurnitureId ? null : item.id
            );
          }}
        >
          {/* Delete button on selected item */}
          {selectedFurnitureId === item.id && (
            <motion.button
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                removeFurniture(item.id);
                setSelectedFurnitureId(null);
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              aria-label={`Delete ${item.type}`}
            >
              <Trash2 size={10} />
            </motion.button>
          )}
        </div>
      ))}

      {/* Zone editor (handles zone click targets + config popovers) */}
      <ZoneEditor />

      {/* Furniture library panel */}
      <FurnitureLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />
    </>
  );
}
