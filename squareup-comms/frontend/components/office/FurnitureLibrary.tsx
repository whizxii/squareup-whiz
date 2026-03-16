/**
 * Slide-in glass panel for browsing and placing furniture in edit mode.
 * Organized by category tabs with search filter.
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Armchair, Monitor, Leaf, Cpu } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import type { FurnitureType, OfficeFurniture } from "@/lib/stores/office-store";

// ---------------------------------------------------------------------------
// Furniture catalog
// ---------------------------------------------------------------------------

interface FurnitureCatalogItem {
  readonly type: FurnitureType;
  readonly label: string;
  readonly emoji: string;
  readonly category: FurnitureCategory;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
}

type FurnitureCategory = "desks" | "seating" | "decor" | "tech";

const CATALOG: readonly FurnitureCatalogItem[] = [
  { type: "desk", label: "Desk", emoji: "\u{1F4BB}", category: "desks", defaultWidth: 2, defaultHeight: 1 },
  { type: "chair", label: "Chair", emoji: "\u{1FA91}", category: "seating", defaultWidth: 1, defaultHeight: 1 },
  { type: "plant", label: "Plant", emoji: "\u{1FAB4}", category: "decor", defaultWidth: 1, defaultHeight: 1 },
  { type: "bookshelf", label: "Bookshelf", emoji: "\u{1F4DA}", category: "decor", defaultWidth: 1, defaultHeight: 2 },
  { type: "whiteboard", label: "Whiteboard", emoji: "\u{1F4CB}", category: "tech", defaultWidth: 2, defaultHeight: 1 },
  { type: "coffee_machine", label: "Coffee Machine", emoji: "\u{2615}", category: "decor", defaultWidth: 1, defaultHeight: 1 },
  { type: "server_rack", label: "Server Rack", emoji: "\u{1F5A5}", category: "tech", defaultWidth: 1, defaultHeight: 2 },
  { type: "lamp", label: "Lamp", emoji: "\u{1F4A1}", category: "decor", defaultWidth: 1, defaultHeight: 1 },
  { type: "rug", label: "Rug", emoji: "\u{1F9F6}", category: "decor", defaultWidth: 2, defaultHeight: 2 },
  { type: "divider", label: "Divider", emoji: "\u{1F6A7}", category: "desks", defaultWidth: 1, defaultHeight: 2 },
];

const CATEGORY_TABS: readonly { readonly id: FurnitureCategory; readonly label: string; readonly icon: typeof Monitor }[] = [
  { id: "desks", label: "Desks", icon: Monitor },
  { id: "seating", label: "Seating", icon: Armchair },
  { id: "decor", label: "Decor", icon: Leaf },
  { id: "tech", label: "Tech", icon: Cpu },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FurnitureLibrary({ open, onClose }: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<FurnitureCategory>("desks");
  const [search, setSearch] = useState("");
  const addFurniture = useOfficeStore((s) => s.addFurniture);
  const layout = useOfficeStore((s) => s.layout);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATALOG.filter((item) => {
      const matchesTab = item.category === activeTab;
      const matchesSearch = !q || item.label.toLowerCase().includes(q) || item.type.includes(q);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  const handlePlace = useCallback(
    (item: FurnitureCatalogItem) => {
      // Place near center of grid
      const centerX = Math.floor(layout.gridCols / 2);
      const centerY = Math.floor(layout.gridRows / 2);

      const newFurniture: OfficeFurniture = {
        id: `furniture-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: item.type,
        x: centerX,
        y: centerY,
        width: item.defaultWidth,
        height: item.defaultHeight,
      };
      addFurniture(newFurniture);
    },
    [addFurniture, layout.gridCols, layout.gridRows]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute right-4 top-4 z-50 flex w-64 flex-col rounded-2xl border border-white/15 shadow-xl"
          style={{
            backgroundColor: "rgba(30, 25, 20, 0.85)",
            backdropFilter: "blur(24px) saturate(180%)",
          }}
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white/90">Furniture</h3>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              aria-label="Close furniture library"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
              <Search size={12} className="text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white/80 placeholder-white/30 outline-none"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-3 pt-3">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? "rgba(255,107,0,0.2)" : "transparent",
                  color: activeTab === tab.id ? "#FF6B00" : "rgba(255,255,255,0.5)",
                }}
              >
                <tab.icon size={11} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-2 gap-2 p-3">
            {filteredItems.map((item) => (
              <button
                key={item.type}
                onClick={() => handlePlace(item)}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/5 px-2 py-3 transition-colors hover:border-[#FF6B00]/30 hover:bg-[#FF6B00]/10"
                title={`Place ${item.label}`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-[10px] font-medium text-white/60">{item.label}</span>
                <span className="text-[8px] text-white/30">
                  {item.defaultWidth}x{item.defaultHeight}
                </span>
              </button>
            ))}
            {filteredItems.length === 0 && (
              <p className="col-span-2 py-4 text-center text-xs text-white/30">
                No items found
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
