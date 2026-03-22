"use client";

/**
 * useCRMNotifications — Subscribes to CRM-related WebSocket events
 * and surfaces them as toast notifications with contextual action buttons.
 */

import { useEffect } from "react";
import { useToastStore } from "@/lib/stores/toast-store";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import type { ToastAction } from "@/lib/stores/toast-store";

type WSOn = (type: string, handler: (data: Record<string, unknown>) => void) => () => void;

/**
 * Maps incoming WebSocket CRM events to toast notifications.
 * Call this hook inside CRMLayout with the `on` function from useWebSocket.
 */
export function useCRMNotifications(wsOn: WSOn | null) {
  const addToast = useToastStore((s) => s.addToast);
  const setActiveView = useCRMUIStore((s) => s.setActiveView);

  useEffect(() => {
    if (!wsOn) return;

    const unsubs: Array<() => void> = [];

    // ─── Deal risk spike ───────────────────────────────────────
    unsubs.push(
      wsOn("crm.deal_risk", (data) => {
        const dealName = (data.deal_name as string) || "A deal";
        const riskLevel = (data.risk_level as string) || "HIGH";
        const contactId = data.contact_id as string | undefined;
        const actions: ToastAction[] = [
          { label: "View Pipeline", onClick: () => setActiveView("pipeline") },
        ];
        if (contactId) {
          actions.push({
            label: "View Contact",
            onClick: () => {
              window.location.hash = `#contact/${contactId}`;
            },
          });
        }
        addToast({
          type: "warning",
          title: `Deal risk: ${dealName}`,
          description: `Risk increased to ${riskLevel} — needs attention`,
          duration: 8000,
          actions,
        });
      })
    );

    // ─── Hot lead detected ─────────────────────────────────────
    unsubs.push(
      wsOn("crm.hot_lead", (data) => {
        const contactName = (data.contact_name as string) || "New lead";
        const score = data.score as number | undefined;
        const contactId = data.contact_id as string | undefined;
        const actions: ToastAction[] = [];
        if (contactId) {
          actions.push({
            label: "View Contact",
            onClick: () => {
              window.location.hash = `#contact/${contactId}`;
            },
          });
        }
        actions.push({
          label: "Lead Scoring",
          onClick: () => setActiveView("leads"),
        });
        addToast({
          type: "success",
          title: `Hot lead: ${contactName}`,
          description: score ? `Lead score: ${score}` : "Scored as hot overnight",
          duration: 8000,
          actions,
        });
      })
    );

    // ─── Meeting prep ready ────────────────────────────────────
    unsubs.push(
      wsOn("crm.meeting_prep", (data) => {
        const meetingTitle = (data.title as string) || "Upcoming meeting";
        const minutesUntil = data.minutes_until as number | undefined;
        const contactId = data.contact_id as string | undefined;
        const actions: ToastAction[] = [];
        if (contactId) {
          actions.push({
            label: "View Prep",
            onClick: () => {
              window.location.hash = `#contact/${contactId}`;
            },
          });
        }
        actions.push({
          label: "Calendar",
          onClick: () => setActiveView("calendar"),
        });
        addToast({
          type: "info",
          title: `Meeting prep ready`,
          description: minutesUntil
            ? `${meetingTitle} in ${minutesUntil} min`
            : meetingTitle,
          duration: 10000,
          actions,
        });
      })
    );

    // ─── AI auto-action taken ──────────────────────────────────
    unsubs.push(
      wsOn("crm.auto_action", (data) => {
        const actionDesc = (data.description as string) || "Action completed";
        const confidence = data.confidence as number | undefined;
        const contactId = data.contact_id as string | undefined;
        const actions: ToastAction[] = [];
        if (contactId) {
          actions.push({
            label: "Review",
            onClick: () => {
              window.location.hash = `#contact/${contactId}`;
            },
          });
        }
        addToast({
          type: "info",
          title: "AI auto-action",
          description: confidence
            ? `${actionDesc} (confidence: ${Math.round(confidence * 100)}%)`
            : actionDesc,
          duration: 8000,
          actions,
        });
      })
    );

    // ─── Deal won ──────────────────────────────────────────────
    unsubs.push(
      wsOn("crm.deal_won", (data) => {
        const dealName = (data.deal_name as string) || "A deal";
        const value = data.value as number | undefined;
        const valueStr = value
          ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(value)
          : "";
        addToast({
          type: "success",
          title: `Deal won: ${dealName}`,
          description: valueStr ? `Closed at ${valueStr}` : "Congratulations!",
          duration: 10000,
          actions: [
            { label: "View Pipeline", onClick: () => setActiveView("pipeline") },
          ],
        });
      })
    );

    // ─── Stale contact alert ───────────────────────────────────
    unsubs.push(
      wsOn("crm.stale_contact", (data) => {
        const contactName = (data.contact_name as string) || "A contact";
        const daysSince = data.days_since_contact as number | undefined;
        const contactId = data.contact_id as string | undefined;
        const actions: ToastAction[] = [];
        if (contactId) {
          actions.push({
            label: "View Contact",
            onClick: () => {
              window.location.hash = `#contact/${contactId}`;
            },
          });
        }
        addToast({
          type: "warning",
          title: `Stale contact: ${contactName}`,
          description: daysSince
            ? `No contact in ${daysSince} days`
            : "Needs follow-up",
          duration: 7000,
          actions,
        });
      })
    );

    // ─── Daily brief ready ─────────────────────────────────────
    unsubs.push(
      wsOn("insights.daily_brief", () => {
        addToast({
          type: "info",
          title: "Morning briefing ready",
          description: "Your daily CRM summary is available",
          duration: 8000,
          actions: [
            { label: "View Briefing", onClick: () => setActiveView("dashboard") },
          ],
        });
      })
    );

    // ─── Weekly digest ready ───────────────────────────────────
    unsubs.push(
      wsOn("insights.weekly_digest", () => {
        addToast({
          type: "info",
          title: "Weekly digest ready",
          description: "Your weekly CRM performance summary is available",
          duration: 8000,
          actions: [
            { label: "View Digest", onClick: () => setActiveView("digest") },
          ],
        });
      })
    );

    // ─── Reminder fired ────────────────────────────────────────
    unsubs.push(
      wsOn("reminder.fire", (data) => {
        const message = (data.message as string) || "Reminder";
        addToast({
          type: "warning",
          title: "Reminder",
          description: message,
          duration: 10000,
        });
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [wsOn, addToast, setActiveView]);
}
