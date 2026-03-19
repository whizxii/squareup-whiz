import { create } from "zustand";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProactiveInsight {
  readonly type: string; // "deal_stale" | "deal_at_risk" | "contact_cold" | "task_due_soon" | "task_overdue" | "missing_follow_up"
  readonly severity: "info" | "warning" | "critical";
  readonly title: string;
  readonly description: string;
  readonly entity_type: string; // "deal" | "contact" | "task"
  readonly entity_id: string;
  readonly entity_name: string;
  readonly metadata: Record<string, unknown>;
  readonly receivedAt: string;
  readonly dismissed: boolean;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface InsightsState {
  insights: ProactiveInsight[];
  unreadCount: number;
  panelOpen: boolean;

  addInsights: (batch: Omit<ProactiveInsight, "receivedAt" | "dismissed">[]) => void;
  dismissInsight: (entityId: string) => void;
  dismissAll: () => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
  clearAll: () => void;
}

const MAX_INSIGHTS = 100;

export const useInsightsStore = create<InsightsState>((set) => ({
  insights: [],
  unreadCount: 0,
  panelOpen: false,

  addInsights: (batch) =>
    set((s) => {
      const now = new Date().toISOString();
      const newInsights: ProactiveInsight[] = batch.map((item) => ({
        ...item,
        receivedAt: now,
        dismissed: false,
      }));

      // Deduplicate by entity_id — keep newest
      const existingMap = new Map(
        s.insights.map((i) => [i.entity_id, i])
      );
      for (const ni of newInsights) {
        existingMap.set(ni.entity_id, ni);
      }

      const merged = Array.from(existingMap.values())
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
        .slice(0, MAX_INSIGHTS);

      const unreadCount = merged.filter((i) => !i.dismissed).length;

      return { insights: merged, unreadCount };
    }),

  dismissInsight: (entityId) =>
    set((s) => {
      const insights = s.insights.map((i) =>
        i.entity_id === entityId ? { ...i, dismissed: true } : i
      );
      const unreadCount = insights.filter((i) => !i.dismissed).length;
      return { insights, unreadCount };
    }),

  dismissAll: () =>
    set((s) => {
      const insights = s.insights.map((i) => ({ ...i, dismissed: true }));
      return { insights, unreadCount: 0 };
    }),

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  setPanel: (open) => set({ panelOpen: open }),

  clearAll: () => set({ insights: [], unreadCount: 0 }),
}));
