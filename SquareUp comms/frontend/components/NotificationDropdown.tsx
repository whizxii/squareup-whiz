"use client";

import { useEffect, useRef } from "react";
import {
  Bell,
  AtSign,
  MessageSquare,
  Bot,
  Clock,
  UserCheck,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from "@/lib/stores/notification-store";

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "mention":
      return AtSign;
    case "dm":
      return MessageSquare;
    case "agent_complete":
    case "agent_error":
      return Bot;
    case "reminder":
      return Clock;
    case "follow_up":
      return UserCheck;
    default:
      return Bell;
  }
}

function getIconColor(type: NotificationType): string {
  switch (type) {
    case "mention":
      return "text-primary";
    case "dm":
      return "text-sq-agent";
    case "agent_complete":
      return "text-sq-online";
    case "agent_error":
      return "text-destructive";
    case "reminder":
      return "text-sq-away";
    case "follow_up":
      return "text-sq-agent";
    default:
      return "text-muted-foreground";
  }
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getIconColor(notification.type);

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
        !notification.read && "bg-primary/[0.03]"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          !notification.read ? "bg-primary/10" : "bg-muted"
        )}
      >
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            !notification.read
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {getRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}

export function NotificationDropdown() {
  // Use individual stable selectors — avoids re-render loop caused by
  // subscribing to the whole store (unreadCount is a new fn ref every update).
  const notifications = useNotificationStore((s) => s.notifications);
  const isOpen = useNotificationStore((s) => s.isOpen);
  const setOpen = useNotificationStore((s) => s.setOpen);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const count = notifications.filter((n) => !n.read).length;

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm text-foreground">
              Notifications
            </h3>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[400px] divide-y divide-border/50 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  All caught up!
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  No notifications.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
