"use client";

import { cn } from "@/lib/utils";
import {
  User,
  TrendingUp,
  CheckSquare,
  SmilePlus,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────

export interface ChatSignal {
  id: string;
  signal_type: string;
  entity_type?: string;
  entity_id?: string;
  confidence: number;
  extracted_data: Record<string, unknown>;
  ai_reasoning?: string;
}

// ─── Signal config ─────────────────────────────────────────────

const SIGNAL_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  contact_mention: {
    label: "Contact",
    icon: <User className="w-3 h-3" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  deal_signal: {
    label: "Deal",
    icon: <TrendingUp className="w-3 h-3" />,
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  action_item: {
    label: "Action",
    icon: <CheckSquare className="w-3 h-3" />,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  sentiment: {
    label: "Sentiment",
    icon: <SmilePlus className="w-3 h-3" />,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  meeting_request: {
    label: "Meeting",
    icon: <Calendar className="w-3 h-3" />,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  follow_up: {
    label: "Follow-up",
    icon: <ArrowRight className="w-3 h-3" />,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
};

// ─── Badge Component ───────────────────────────────────────────

interface ChatSignalBadgeProps {
  signals: ChatSignal[];
  compact?: boolean;
}

export function ChatSignalBadge({ signals, compact = true }: ChatSignalBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (signals.length === 0) return null;

  if (compact && !expanded) {
    // Show small indicator dots
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-0.5 ml-1 opacity-60 hover:opacity-100 transition-opacity"
        title={`${signals.length} CRM signal${signals.length > 1 ? "s" : ""} detected`}
      >
        {signals.slice(0, 3).map((s) => {
          const config = SIGNAL_CONFIG[s.signal_type];
          return (
            <span
              key={s.id}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                config?.color.split(" ")[0] || "bg-muted"
              )}
            />
          );
        })}
        {signals.length > 3 && (
          <span className="text-[9px] text-muted-foreground">
            +{signals.length - 3}
          </span>
        )}
      </button>
    );
  }

  // Expanded view
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {signals.map((signal) => {
        const config = SIGNAL_CONFIG[signal.signal_type] ?? {
          label: signal.signal_type,
          icon: null,
          color: "bg-muted text-muted-foreground border-border",
        };

        return (
          <span
            key={signal.id}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
              config.color
            )}
            title={signal.ai_reasoning || undefined}
          >
            {config.icon}
            {config.label}
            <span className="opacity-60">
              {Math.round(signal.confidence * 100)}%
            </span>
          </span>
        );
      })}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          collapse
        </button>
      )}
    </div>
  );
}
