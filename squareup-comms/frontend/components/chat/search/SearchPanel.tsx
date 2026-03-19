"use client";

import { useChatStore, type Message } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { Search, X, Hash, ArrowRight } from "lucide-react";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { parseUtcDate } from "@/lib/format";

// Stable empty array
const EMPTY_MESSAGES: Message[] = [];

interface SearchPanelProps {
  onClose: () => void;
}

interface SearchResult {
  message: Message;
  channelName: string;
  channelId: string;
  /** Indices of matched characters for highlighting */
  matchRanges: Array<[number, number]>;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const channels = useChatStore((s) => s.channels);
  const allMessagesByChannel = useChatStore((s) => s.messages);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  const [query, setQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Search across all channels
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const found: SearchResult[] = [];

    for (const channel of channels) {
      if (selectedChannel !== "all" && channel.id !== selectedChannel) continue;

      const messages = allMessagesByChannel[channel.id] || EMPTY_MESSAGES;
      for (const msg of messages) {
        const content = (msg.content || "").toLowerCase();
        const idx = content.indexOf(q);
        if (idx !== -1) {
          found.push({
            message: msg,
            channelName: channel.name,
            channelId: channel.id,
            matchRanges: [[idx, idx + q.length]],
          });
        }
      }
    }

    // Sort by most recent first
    found.sort(
      (a, b) =>
        new Date(b.message.created_at).getTime() -
        new Date(a.message.created_at).getTime()
    );

    return found.slice(0, 50); // Limit results
  }, [query, channels, allMessagesByChannel, selectedChannel]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setActiveChannel(result.channelId);
      onClose();
    },
    [setActiveChannel, onClose]
  );

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="w-[380px] max-w-full flex flex-col border-l border-border bg-card shrink-0 h-full"
      role="search"
      aria-label="Message search"
    >
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <Search className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold flex-1">Search Messages</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close search"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-0.5 rounded hover:bg-accent transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Channel filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <FilterChip
            label="All channels"
            active={selectedChannel === "all"}
            onClick={() => setSelectedChannel("all")}
          />
          {channels.slice(0, 6).map((ch) => (
            <FilterChip
              key={ch.id}
              label={`#${ch.name}`}
              active={selectedChannel === ch.id}
              onClick={() => setSelectedChannel(ch.id)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {query.length < 2 ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div className="space-y-2">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Type at least 2 characters to search
              </p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground/60">
                Try different keywords or search all channels
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-4 py-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            {results.map((result) => (
              <SearchResultItem
                key={`${result.channelId}-${result.message.id}`}
                result={result}
                query={query}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap",
        "border transition-all duration-150",
        active
          ? "bg-primary/10 border-primary/20 text-primary"
          : "bg-transparent border-border text-muted-foreground hover:bg-accent/50"
      )}
    >
      {label}
    </button>
  );
}

function SearchResultItem({
  result,
  query,
  onClick,
}: {
  result: SearchResult;
  query: string;
  onClick: () => void;
}) {
  const content = result.message.content || "";
  const timeAgo = formatDistanceToNow(parseUtcDate(result.message.created_at), {
    addSuffix: true,
  });

  // Highlight matched text
  const highlighted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const idx = content.toLowerCase().indexOf(q);
    if (idx === -1) return content;

    const before = content.slice(0, idx);
    const match = content.slice(idx, idx + q.length);
    const after = content.slice(idx + q.length);

    // Show context around the match
    const contextStart = Math.max(0, idx - 40);
    const contextEnd = Math.min(content.length, idx + q.length + 60);
    const prefix = contextStart > 0 ? "..." : "";
    const suffix = contextEnd < content.length ? "..." : "";

    return (
      <>
        {prefix}
        {before.slice(contextStart)}
        <mark className="bg-primary/20 text-primary rounded px-0.5">{match}</mark>
        {after.slice(0, contextEnd - idx - q.length)}
        {suffix}
      </>
    );
  }, [content, query]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-2.5 text-left",
        "hover:bg-accent/50 transition-colors duration-100",
        "group"
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        {/* Channel + sender */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Hash className="w-3 h-3" />
            {result.channelName}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-medium text-foreground/70">
            {result.message.sender_name || result.message.sender_id}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground/50">{timeAgo}</span>
        </div>

        {/* Content with highlight */}
        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
          {highlighted}
        </p>
      </div>

      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
