"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Target,
  BarChart3,
  ListFilter,
  Workflow,
  Sparkles,
  Network,
  ArrowRight,
} from "lucide-react";
import { useContacts } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import type { CRMView } from "@/lib/types/crm";

// ─── Constants ───────────────────────────────────────────────

const STORAGE_KEY = "sq-crm-features-seen";

interface FeatureMilestone {
  readonly id: string;
  readonly minContacts: number;
  readonly icon: typeof Target;
  readonly title: string;
  readonly description: string;
  readonly navigateTo: CRMView;
  readonly ctaLabel: string;
}

const MILESTONES: readonly FeatureMilestone[] = [
  {
    id: "lead-scoring",
    minContacts: 5,
    icon: Target,
    title: "Lead Scoring Unlocked",
    description:
      "With 5+ contacts, AI can now score and rank your leads by engagement, fit, and behavior.",
    navigateTo: "leads",
    ctaLabel: "View Lead Scores",
  },
  {
    id: "analytics",
    minContacts: 10,
    icon: BarChart3,
    title: "Analytics Dashboard Ready",
    description:
      "10+ contacts means meaningful analytics. See win/loss rates, deal velocity, and pipeline trends.",
    navigateTo: "analytics",
    ctaLabel: "Open Analytics",
  },
  {
    id: "smart-lists",
    minContacts: 15,
    icon: ListFilter,
    title: "Smart Lists Available",
    description:
      "Create dynamic lists that auto-update as contacts match your criteria. Great for segmenting outreach.",
    navigateTo: "smart_lists",
    ctaLabel: "Create Smart List",
  },
  {
    id: "workflows",
    minContacts: 20,
    icon: Workflow,
    title: "Workflow Automation",
    description:
      "With 20+ contacts, automate repetitive tasks like follow-ups, stage changes, and notifications.",
    navigateTo: "workflows",
    ctaLabel: "Build Workflow",
  },
  {
    id: "graph",
    minContacts: 25,
    icon: Network,
    title: "Relationship Graph",
    description:
      "Visualize connections between contacts, companies, and deals as an interactive network graph.",
    navigateTo: "graph",
    ctaLabel: "Explore Graph",
  },
];

// ─── Helpers ─────────────────────────────────────────────────

function getSeenFeatures(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
    return new Set();
  } catch {
    return new Set();
  }
}

function markFeatureSeen(id: string): void {
  if (typeof window === "undefined") return;
  const seen = getSeenFeatures();
  seen.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

// ─── Feature Unlock Toast ────────────────────────────────────

function FeatureUnlockToast({
  milestone,
  onDismiss,
  onNavigate,
}: {
  readonly milestone: FeatureMilestone;
  readonly onDismiss: () => void;
  readonly onNavigate: () => void;
}) {
  const Icon = milestone.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="w-[360px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
    >
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Feature Unlocked
              </span>
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              {milestone.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {milestone.description}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={onNavigate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all"
              >
                {milestone.ctaLabel}
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={onDismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
              >
                Later
              </button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main provider component ─────────────────────────────────

export function FeatureDiscoveryProvider() {
  // Fetch enough to check milestones (max milestone is 25 contacts)
  const { data: contactsData } = useContacts(undefined, { limit: 30 });
  const contactCount = contactsData?.items?.length ?? 0;
  const setActiveView = useCRMUIStore((s) => s.setActiveView);

  const [seenFeatures, setSeenFeatures] = useState<Set<string>>(new Set());
  const [activeToast, setActiveToast] = useState<FeatureMilestone | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load seen features on mount
  useEffect(() => {
    setSeenFeatures(getSeenFeatures());
    setMounted(true);
  }, []);

  // Determine newly unlocked features
  const newlyUnlocked = useMemo(() => {
    if (!mounted || contactCount === 0) return [];
    return MILESTONES.filter(
      (m) => contactCount >= m.minContacts && !seenFeatures.has(m.id),
    );
  }, [contactCount, seenFeatures, mounted]);

  // Show the first unseen milestone as a toast
  useEffect(() => {
    if (newlyUnlocked.length === 0 || activeToast) return;
    // Small delay so it doesn't appear immediately on page load
    const timer = setTimeout(() => {
      setActiveToast(newlyUnlocked[0]);
    }, 2000);
    return () => clearTimeout(timer);
  }, [newlyUnlocked, activeToast]);

  const handleDismiss = useCallback(() => {
    if (activeToast) {
      markFeatureSeen(activeToast.id);
      setSeenFeatures((prev) => {
        const next = new Set(prev);
        next.add(activeToast.id);
        return next;
      });
      setActiveToast(null);
    }
  }, [activeToast]);

  const handleNavigate = useCallback(() => {
    if (activeToast) {
      markFeatureSeen(activeToast.id);
      setSeenFeatures((prev) => {
        const next = new Set(prev);
        next.add(activeToast.id);
        return next;
      });
      setActiveView(activeToast.navigateTo);
      setActiveToast(null);
    }
  }, [activeToast, setActiveView]);

  return (
    <div className="fixed bottom-20 right-6 z-50">
      <AnimatePresence>
        {activeToast && (
          <FeatureUnlockToast
            milestone={activeToast}
            onDismiss={handleDismiss}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
