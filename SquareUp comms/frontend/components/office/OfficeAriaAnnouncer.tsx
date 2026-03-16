/**
 * ARIA live region for screen reader announcements.
 * Announces office events: entity arrivals, zone changes, proximity.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useOfficeStore } from "@/lib/stores/office-store";
import type { OfficeAgent } from "@/lib/stores/office-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function agentStatusLabel(status: OfficeAgent["status"]): string {
  const labels: Record<string, string> = {
    idle: "is idle",
    thinking: "is thinking",
    working: "is working",
    error: "has an error",
    offline: "went offline",
  };
  return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OfficeAriaAnnouncer() {
  const [announcement, setAnnouncement] = useState("");
  const prevAgentsRef = useRef<readonly OfficeAgent[]>([]);
  const mountedRef = useRef(false);

  const announce = useCallback((message: string) => {
    // Clear first to re-trigger screen reader for repeated messages
    setAnnouncement("");
    requestAnimationFrame(() => {
      setAnnouncement(message);
    });
  }, []);

  // Track agent status changes
  const agents = useOfficeStore((s) => s.agents);

  useEffect(() => {
    // Skip first render to avoid announcing initial state
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevAgentsRef.current = agents;
      return;
    }

    const prev = prevAgentsRef.current;

    for (const agent of agents) {
      const prevAgent = prev.find((a) => a.id === agent.id);
      if (!prevAgent) {
        announce(`${agent.name} appeared in the office`);
        break;
      }
      if (prevAgent.status !== agent.status) {
        if (agent.status === "offline") {
          announce(`${agent.name} left the office`);
        } else if (prevAgent.status === "offline") {
          announce(`${agent.name} joined the office`);
        } else {
          announce(`${agent.name} ${agentStatusLabel(agent.status)}`);
        }
        break;
      }
    }

    prevAgentsRef.current = agents;
  }, [agents, announce]);

  // Track ambient events for announcements
  const ambientEvents = useOfficeStore((s) => s.ambientEvents);

  useEffect(() => {
    if (!mountedRef.current || ambientEvents.length === 0) return;

    const latest = ambientEvents[ambientEvents.length - 1];
    switch (latest.type) {
      case "coffee_brew":
        announce("Coffee is brewing in the break area");
        break;
      case "delivery":
        announce("A delivery arrived at the office");
        break;
      case "agent_chat":
        announce("Two agents are chatting");
        break;
      default:
        break;
    }
  }, [ambientEvents, announce]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
