/**
 * Shared formatting utilities used across the app.
 * Centralised here to avoid duplication in individual components.
 *
 * All dates are displayed in Indian Standard Time (IST — Asia/Kolkata).
 */

/** IANA timezone identifier for the app. */
export const APP_TIMEZONE = "Asia/Kolkata";

/** Locale used for date / number formatting. */
export const APP_LOCALE = "en-IN";

/**
 * Parse a date string treating timezone-naive ISO strings as UTC,
 * then return a JS Date (which is always UTC internally).
 *
 * The backend stores datetimes as naive ISO strings (no "Z").
 * We append "Z" so JS parses them as UTC, then display functions
 * convert to IST via `timeZone: "Asia/Kolkata"`.
 */
export function parseUtcDate(iso: string): Date {
  if (!iso) return new Date();
  // Already has timezone info (Z, +05:30, -04:00, etc.)
  if (/[Zz]$/.test(iso) || /[+-]\d{2}:\d{2}$/.test(iso)) {
    return new Date(iso);
  }
  return new Date(iso + "Z");
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(iso: string): string {
  try {
    const d = parseUtcDate(iso);
    return d.toLocaleDateString(APP_LOCALE, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: APP_TIMEZONE,
    });
  } catch {
    return "";
  }
}

export function formatTime(iso: string): string {
  try {
    const d = parseUtcDate(iso);
    return d.toLocaleTimeString(APP_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: APP_TIMEZONE,
    });
  } catch {
    return "";
  }
}

export function formatDateTime(iso: string): string {
  try {
    const d = parseUtcDate(iso);
    return d.toLocaleString(APP_LOCALE, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: APP_TIMEZONE,
    });
  } catch {
    return "";
  }
}

export function formatCurrency(value: number, currency = "INR"): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Due date formatting ────────────────────────────────────────

export interface DueDateInfo {
  text: string;
  overdue: boolean;
}

/**
 * Format a due-date string into a human-readable label with overdue flag.
 * Returns null when no date is provided.
 */
export function formatDueDate(dateStr: string | null): DueDateInfo | null {
  if (!dateStr) return null;

  const due = parseUtcDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Overdue (${Math.abs(diffDays)}d)`, overdue: true };
  if (diffDays === 0) return { text: "Today", overdue: false };
  if (diffDays === 1) return { text: "Tomorrow", overdue: false };
  if (diffDays <= 7) return { text: `In ${diffDays} days`, overdue: false };

  return {
    text: due.toLocaleDateString(APP_LOCALE, { month: "short", day: "numeric", timeZone: APP_TIMEZONE }),
    overdue: false,
  };
}

// ─── Relative time ──────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  try {
    const now = Date.now();
    const then = parseUtcDate(iso).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(iso);
  } catch {
    return "";
  }
}
