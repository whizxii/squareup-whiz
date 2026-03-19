/**
 * Shared formatting utilities used across the app.
 * Centralised here to avoid duplication in individual components.
 */

/**
 * Parse a date string treating timezone-naive ISO strings as UTC.
 *
 * The backend stores datetimes with `datetime.utcnow()` which produces
 * naive ISO strings like "2026-03-18T10:00:00" (no "Z" suffix).
 * JavaScript's `new Date()` treats those as *local time*, creating a
 * timezone offset that shows fresh messages as "6 hours ago" etc.
 *
 * This helper appends "Z" when no timezone indicator is present so the
 * string is correctly parsed as UTC.
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
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatTime(iso: string): string {
  try {
    const d = parseUtcDate(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function formatCurrency(value: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

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
