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

/** AI-generated insight with LLM reasoning and suggested actions. */
export interface AIInsight {
  readonly id: string;
  readonly type: string; // "deal_coaching" | "daily_brief" | "pipeline_risk" | "relationship_alert"
  readonly severity: "info" | "warning" | "critical";
  readonly title: string;
  readonly description: string;
  readonly ai_reasoning: string;
  readonly suggested_actions: string[];
  readonly entity_type?: string;
  readonly entity_id?: string;
  readonly entity_name?: string;
  readonly target_user_id?: string;
  readonly is_read: boolean;
  readonly is_dismissed: boolean;
  readonly is_acted_on: boolean;
  readonly created_at: string;
  readonly highlight?: string;
  readonly risk_score?: number;
}

export interface DailyBrief {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly ai_reasoning: string;
  readonly suggested_actions: string[];
  readonly severity: "info" | "warning" | "critical";
  readonly highlight?: string;
  readonly created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface InsightsState {
  // Rule-based proactive insights (real-time via WebSocket)
  insights: ProactiveInsight[];
  unreadCount: number;
  panelOpen: boolean;

  // AI-generated insights (deal coaching, pipeline risk, etc.)
  aiInsights: AIInsight[];

  // Daily brief
  dailyBrief: DailyBrief | null;
  briefPanelOpen: boolean;

  // Proactive insights actions
  addInsights: (batch: Omit<ProactiveInsight, "receivedAt" | "dismissed">[]) => void;
  dismissInsight: (entityId: string) => void;
  dismissAll: () => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
  clearAll: () => void;

  // AI insights actions
  setAIInsights: (items: AIInsight[]) => void;
  dismissAIInsight: (id: string) => void;

  // Daily brief actions
  setDailyBrief: (brief: DailyBrief) => void;
  setBriefPanel: (open: boolean) => void;
  toggleBriefPanel: () => void;
}

const MAX_INSIGHTS = 100;

export const useInsightsStore = create<InsightsState>((set) => ({
  insights: [],
  unreadCount: 0,
  panelOpen: false,
  aiInsights: [],
  dailyBrief: null,
  briefPanelOpen: false,

  /* ---------------------------------------------------------------- */
  /*  Proactive insights                                               */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  AI insights                                                      */
  /* ---------------------------------------------------------------- */

  setAIInsights: (items) => set({ aiInsights: items }),

  dismissAIInsight: (id) =>
    set((s) => ({
      aiInsights: s.aiInsights.map((i) =>
        i.id === id ? { ...i, is_dismissed: true } : i
      ),
    })),

  /* ---------------------------------------------------------------- */
  /*  Daily brief                                                      */
  /* ---------------------------------------------------------------- */

  setDailyBrief: (brief) => set({ dailyBrief: brief }),

  setBriefPanel: (open) => set({ briefPanelOpen: open }),

  toggleBriefPanel: () => set((s) => ({ briefPanelOpen: !s.briefPanelOpen })),
}));
