"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelativeTime } from "@/lib/format";
import {
  MessageSquare,
  User,
  TrendingUp,
  CheckSquare,
  Calendar,
  ArrowRight,
  SmilePlus,
  RefreshCw,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Types ─────────────────────────────────────────────────────

interface ChatMention {
  id: string;
  message_id: string;
  channel_id: string;
  sender_id: string;
  signal_type: string;
  entity_type?: string;
  entity_id?: string;
  confidence: number;
  extracted_data: Record<string, unknown>;
  ai_reasoning?: string;
  processed: boolean;
  created_at?: string;
}

// ─── Signal icons ──────────────────────────────────────────────

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  contact_mention: <User className="w-3.5 h-3.5 text-blue-500" />,
  deal_signal: <TrendingUp className="w-3.5 h-3.5 text-green-500" />,
  action_item: <CheckSquare className="w-3.5 h-3.5 text-orange-500" />,
  sentiment: <SmilePlus className="w-3.5 h-3.5 text-purple-500" />,
  meeting_request: <Calendar className="w-3.5 h-3.5 text-cyan-500" />,
  follow_up: <ArrowRight className="w-3.5 h-3.5 text-amber-500" />,
};

const SIGNAL_LABELS: Record<string, string> = {
  contact_mention: "Mentioned in chat",
  deal_signal: "Deal signal detected",
  action_item: "Action item identified",
  sentiment: "Sentiment detected",
  meeting_request: "Meeting requested",
  follow_up: "Follow-up needed",
};

// ─── Chat Mention Card ─────────────────────────────────────────

function ChatMentionCard({ mention }: { mention: ChatMention }) {
  const icon = SIGNAL_ICONS[mention.signal_type] ?? (
    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
  );
  const label = SIGNAL_LABELS[mention.signal_type] ?? mention.signal_type;
  const data = mention.extracted_data;

  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{label}</span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(mention.confidence * 100)}% confidence
            </span>
          </div>

          {/* Context from extracted data */}
          {!!data.context && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {String(data.context)}
            </p>
          )}
          {!!data.action && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {String(data.action)}
            </p>
          )}
          {!!data.deal_context && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {String(data.deal_context)}
            </p>
          )}
          {!!data.task && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {String(data.task)}
            </p>
          )}

          {/* AI reasoning */}
          {mention.ai_reasoning && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
              {mention.ai_reasoning}
            </p>
          )}
        </div>

        {mention.created_at && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatRelativeTime(mention.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Chat History Tab ──────────────────────────────────────────

interface ChatHistoryTabProps {
  contactId: string;
}

export function ChatHistoryTab({ contactId }: ChatHistoryTabProps) {
  const [mentions, setMentions] = useState<ChatMention[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMentions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/chat-intelligence/contacts/${contactId}/chat-mentions?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch chat mentions");
      const json = await res.json();
      const data = json.data ?? json;
      setMentions(data.mentions ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={72} className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<MessageSquare className="w-6 h-6" />}
          title="Error loading chat history"
          description={error}
          action={{ label: "Retry", onClick: fetchMentions }}
        />
      </div>
    );
  }

  if (mentions.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<MessageSquare className="w-6 h-6" />}
          title="No chat mentions yet"
          description="When this contact is mentioned in chat messages, the AI will detect and link them here automatically."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} chat signal{total !== 1 ? "s" : ""} detected
        </p>
        <button
          onClick={fetchMentions}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Mention list */}
      <div className="space-y-2">
        {mentions.map((mention) => (
          <ChatMentionCard key={mention.id} mention={mention} />
        ))}
      </div>
    </div>
  );
}
