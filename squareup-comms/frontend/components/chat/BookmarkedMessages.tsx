"use client";

import { cn } from "@/lib/utils";
import { Bookmark, X, Hash, Trash2 } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// ─── Bookmark storage (localStorage-backed) ────────────────────────────
export interface BookmarkedMessage {
  id: string;
  channelId: string;
  channelName: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  bookmarkedAt: string;
}

const STORAGE_KEY = "squareup_bookmarks";
const listeners = new Set<() => void>();

function getBookmarks(): BookmarkedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookmarkedMessage[]) : [];
  } catch {
    return [];
  }
}

function setBookmarks(bookmarks: BookmarkedMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  listeners.forEach((fn) => fn());
}

export function addBookmark(msg: BookmarkedMessage) {
  const current = getBookmarks();
  if (current.some((b) => b.id === msg.id)) return;
  setBookmarks([msg, ...current]);
}

export function removeBookmark(messageId: string) {
  const current = getBookmarks();
  setBookmarks(current.filter((b) => b.id !== messageId));
}

export function isBookmarked(messageId: string): boolean {
  return getBookmarks().some((b) => b.id === messageId);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return getBookmarks();
}

function getServerSnapshot(): BookmarkedMessage[] {
  return [];
}

/** Hook to access bookmarks reactively */
export function useBookmarks() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ─── Component ──────────────────────────────────────────────────────────

interface BookmarkedMessagesProps {
  onClose: () => void;
}

export function BookmarkedMessages({ onClose }: BookmarkedMessagesProps) {
  const bookmarks = useBookmarks();

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="w-[380px] max-w-full flex flex-col border-l border-border bg-card shrink-0 h-full"
      role="complementary"
      aria-label="Bookmarked messages"
    >
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <Bookmark className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold flex-1">Saved Messages</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close bookmarks"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {bookmarks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div className="space-y-2">
              <Bookmark className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No saved messages
              </p>
              <p className="text-xs text-muted-foreground/60">
                Bookmark messages to find them here later
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-4 py-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
              {bookmarks.length} saved message{bookmarks.length !== 1 ? "s" : ""}
            </div>
            {bookmarks.map((bm) => (
              <BookmarkItem key={bm.id} bookmark={bm} />
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function BookmarkItem({ bookmark }: { bookmark: BookmarkedMessage }) {
  const timeAgo = formatDistanceToNow(new Date(bookmark.bookmarkedAt), {
    addSuffix: true,
  });

  const handleRemove = useCallback(() => {
    removeBookmark(bookmark.id);
  }, [bookmark.id]);

  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-border/50",
        "hover:bg-accent/30 transition-colors duration-100",
        "group"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] mb-1">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Hash className="w-3 h-3" />
          {bookmark.channelName}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="font-medium text-foreground/70">
          {bookmark.senderName}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/50">{timeAgo}</span>
        <button
          onClick={handleRemove}
          className="ml-auto p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Remove bookmark"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
        {bookmark.content}
      </p>
    </div>
  );
}
