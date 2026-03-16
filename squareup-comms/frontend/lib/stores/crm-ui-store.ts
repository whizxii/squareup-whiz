/**
 * CRM UI Store — UI-only state (no data).
 *
 * All CRM data lives in React Query. This store only tracks:
 * - Active view, selected entities, search query
 * - Dialog state, sidebar, active tab, filters
 */

import { create } from "zustand";
import type { CRMView, CRMStage } from "@/lib/types/crm";

// ─── Filter state ────────────────────────────────────────────────

export interface CRMFilterState {
  stages: CRMStage[];
  tags: string[];
  sources: string[];
  scoreRange: [number, number];
  dateRange: [string | null, string | null];
  owners: string[];
}

const DEFAULT_FILTERS: CRMFilterState = {
  stages: [],
  tags: [],
  sources: [],
  scoreRange: [0, 100],
  dateRange: [null, null],
  owners: [],
};

// ─── Dialog state ────────────────────────────────────────────────

export interface DialogState {
  type:
    | "create-contact"
    | "edit-contact"
    | "create-deal"
    | "edit-deal"
    | "lose-deal"
    | "create-event"
    | "log-activity"
    | "upload-recording"
    | "create-company"
    | "merge-contacts"
    | "create-sequence"
    | "edit-sequence"
    | "enroll-sequence"
    | "import"
    | "export"
    | "keyboard-help"
    | null;
  data?: Record<string, unknown>;
}

// ─── Store interface ─────────────────────────────────────────────

interface CRMUIState {
  // Navigation
  activeView: CRMView;
  setActiveView: (view: CRMView) => void;

  // Selection
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;

  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;

  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Tabs (for Contact 360, Deal detail, etc.)
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Dialogs
  dialog: DialogState;
  openDialog: (type: NonNullable<DialogState["type"]>, data?: Record<string, unknown>) => void;
  closeDialog: () => void;

  // Filters
  filters: CRMFilterState;
  setFilters: (filters: Partial<CRMFilterState>) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;

  // Pipeline
  activePipelineId: string | null;
  setActivePipelineId: (id: string | null) => void;

  // Command palette AI mode
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  commandPaletteMode: "search" | "ai";
  setCommandPaletteMode: (mode: "search" | "ai") => void;
}

// ─── Store ───────────────────────────────────────────────────────

export const useCRMUIStore = create<CRMUIState>((set, get) => ({
  // Navigation
  activeView: "pipeline",
  setActiveView: (view) => set({ activeView: view }),

  // Selection
  selectedContactId: null,
  setSelectedContactId: (id) => set({ selectedContactId: id }),

  selectedDealId: null,
  setSelectedDealId: (id) => set({ selectedDealId: id }),

  selectedCompanyId: null,
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),

  // Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Tabs
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Dialogs
  dialog: { type: null },
  openDialog: (type, data) => set({ dialog: { type, data } }),
  closeDialog: () => set({ dialog: { type: null } }),

  // Filters
  filters: { ...DEFAULT_FILTERS },
  setFilters: (partial) =>
    set((s) => ({
      filters: { ...s.filters, ...partial },
    })),
  clearFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  hasActiveFilters: () => {
    const { filters } = get();
    return (
      filters.stages.length > 0 ||
      filters.tags.length > 0 ||
      filters.sources.length > 0 ||
      filters.owners.length > 0 ||
      filters.scoreRange[0] > 0 ||
      filters.scoreRange[1] < 100 ||
      filters.dateRange[0] !== null ||
      filters.dateRange[1] !== null
    );
  },

  // Pipeline
  activePipelineId: null,
  setActivePipelineId: (id) => set({ activePipelineId: id }),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  commandPaletteMode: "search",
  setCommandPaletteMode: (mode) => set({ commandPaletteMode: mode }),
}));
