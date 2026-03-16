/**
 * Shared calendar event type and status configuration.
 * Used by CalendarView, CalendarTab, and other calendar components.
 */
import type { CalendarEventType } from "@/lib/types/crm";
import {
  Calendar,
  Clock,
  Phone,
  Video,
  Users,
  CheckCircle2,
} from "lucide-react";

export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; color: string; icon: typeof Calendar }
> = {
  meeting: { label: "Meeting", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Users },
  follow_up: { label: "Follow-up", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  call: { label: "Call", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Phone },
  demo: { label: "Demo", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Video },
  onboarding: { label: "Onboarding", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", icon: CheckCircle2 },
};

export const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  completed: { label: "Completed", className: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  rescheduled: { label: "Rescheduled", className: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
};
