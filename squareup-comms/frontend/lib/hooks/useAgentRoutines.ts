/**
 * Syncs agent schedule states and ambient events with the store.
 * Runs every 60s for schedules, Poisson-timed for ambient events.
 */

"use client";

import { useEffect, useRef } from "react";
import { useOfficeStore } from "../stores/office-store";
import { getAgentScheduleState } from "../office/agent-routines";
import {
  generateAmbientEvent,
  getNextEventInterval,
} from "../office/ambient-events";

export function useAgentRoutines(): void {
  const updateAgentStatus = useOfficeStore((s) => s.updateAgentStatus);
  const updateAgentVisualState = useOfficeStore((s) => s.updateAgentVisualState);
  const moveAgent = useOfficeStore((s) => s.moveAgent);
  const addAmbientEvent = useOfficeStore((s) => s.addAmbientEvent);
  const clearOldAmbientEvents = useOfficeStore((s) => s.clearOldAmbientEvents);
  const agents = useOfficeStore((s) => s.agents);

  const agentIds = useRef(agents.map((a) => a.id));
  agentIds.current = agents.map((a) => a.id);

  // Sync agent schedules every 60 seconds
  useEffect(() => {
    const syncSchedules = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      for (const id of agentIds.current) {
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
