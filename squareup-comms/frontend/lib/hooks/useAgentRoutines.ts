/**
 * Syncs office agents with the real agent-store and applies schedule-based
 * ambient behaviours.  Real streaming activity always overrides schedules.
 *
 * Runs:
 *  1. On mount / when real agents change → hydrateAgents() into office store
 *  2. When streaming state changes → override status to "working"
 *  3. Every 60 s → apply schedule-based ambient state for idle agents
 *  4. Poisson-timed → ambient events (coffee brew, stretch, …)
 */

"use client";

import { useEffect, useRef } from "react";
import { useOfficeStore } from "../stores/office-store";
import { useAgentStore } from "../stores/agent-store";
import { getAgentScheduleState } from "../office/agent-routines";
import {
  generateAmbientEvent,
  getNextEventInterval,
} from "../office/ambient-events";

export function useAgentRoutines(): void {
  const updateAgentStatus = useOfficeStore((s) => s.updateAgentStatus);
  const updateAgentVisualState = useOfficeStore(
    (s) => s.updateAgentVisualState,
  );
  const moveAgent = useOfficeStore((s) => s.moveAgent);
  const addAmbientEvent = useOfficeStore((s) => s.addAmbientEvent);
  const clearOldAmbientEvents = useOfficeStore((s) => s.clearOldAmbientEvents);
  const hydrateAgents = useOfficeStore((s) => s.hydrateAgents);
  const officeAgents = useOfficeStore((s) => s.agents);

  const realAgents = useAgentStore((s) => s.agents);
  const streamingMessages = useAgentStore((s) => s.streamingMessages);

  const agentIds = useRef(officeAgents.map((a) => a.id));
  agentIds.current = officeAgents.map((a) => a.id);

  // Track which agents are actively streaming (real work overrides schedules)
  const activeAgentIds = useRef<Set<string>>(new Set());

  // Hydrate office agents from real agent store
  useEffect(() => {
    if (realAgents.length > 0) {
      hydrateAgents(realAgents);
    }
  }, [realAgents, hydrateAgents]);

  // Sync streaming state — real work overrides schedule-based ambient states
  useEffect(() => {
    const newActive = new Set<string>();

    for (const msg of Object.values(streamingMessages)) {
      newActive.add(msg.agentId);
      updateAgentStatus(msg.agentId, "working", "Processing request...");
      updateAgentVisualState(msg.agentId, "typing");
    }

    // Reset agents that stopped streaming back to idle
    for (const prevId of activeAgentIds.current) {
      if (!newActive.has(prevId)) {
        updateAgentStatus(prevId, "idle", undefined);
        updateAgentVisualState(prevId, "idle");
      }
    }

    activeAgentIds.current = newActive;
  }, [streamingMessages, updateAgentStatus, updateAgentVisualState]);

  // Sync agent schedules every 60 seconds (ambient behaviour for idle agents)
  useEffect(() => {
    const syncSchedules = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      for (const id of agentIds.current) {
        // Skip agents that are actively working on real tasks
        if (activeAgentIds.current.has(id)) continue;

        const state = getAgentScheduleState(id, hour, minute);
        if (!state) continue;

        updateAgentStatus(id, state.status, state.task);
        updateAgentVisualState(id, state.visualState);

        if (state.position) {
          moveAgent(id, state.position.x, state.position.y);
        }
      }
    };

    syncSchedules();
    const interval = setInterval(syncSchedules, 60_000);
    return () => clearInterval(interval);
  }, [updateAgentStatus, updateAgentVisualState, moveAgent]);

  // Ambient events on Poisson-like timer
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      const delay = getNextEventInterval();
      timeoutId = setTimeout(() => {
        const hour = new Date().getHours();
        const event = generateAmbientEvent(hour);
        if (event) addAmbientEvent(event);
        clearOldAmbientEvents();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [addAmbientEvent, clearOldAmbientEvents]);
}
