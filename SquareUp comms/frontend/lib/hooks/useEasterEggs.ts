/**
 * Easter egg hook — wires Konami code, holiday detection, and
 * rapid clock cycle into the office experience.
 */

"use client";

import { useEffect, useRef } from "react";
import { useOfficeStore } from "../stores/office-store";
import {
  createKonamiDetector,
  createRapidCycleTimer,
  detectHoliday,
  getHolidayDecorations,
} from "../office/easter-eggs";

export interface EasterEggState {
  readonly holiday: ReturnType<typeof detectHoliday>;
  readonly holidayDecorations: readonly string[];
}

export function useEasterEggs(): EasterEggState {
  const updateAgentVisualState = useOfficeStore((s) => s.updateAgentVisualState);
  const agents = useOfficeStore((s) => s.agents);
  const setDayPhase = useOfficeStore((s) => s.setDayPhase);

  const agentIdsRef = useRef(agents.map((a) => a.id));
  agentIdsRef.current = agents.map((a) => a.id);

  // Konami code → agents celebrate for 10 seconds
  useEffect(() => {
    const detector = createKonamiDetector(() => {
      for (const id of agentIdsRef.current) {
        updateAgentVisualState(id, "celebrating");
      }
      setTimeout(() => {
        for (const id of agentIdsRef.current) {
          updateAgentVisualState(id, "idle");
        }
      }, 10_000);
    });

    const handler = (e: KeyboardEvent) => detector.handleKey(e.key);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      detector.reset();
    };
  }, [updateAgentVisualState]);

  // Rapid clock cycle (available via window.__officeRapidCycle for dev tools)
  useEffect(() => {
    const DAY_PHASES = ["dawn", "morning", "afternoon", "golden", "dusk", "night"] as const;

    const timer = createRapidCycleTimer(
      (hour) => {
        const phaseIndex = Math.floor((hour / 24) * DAY_PHASES.length);
        setDayPhase(DAY_PHASES[phaseIndex] ?? "morning");
      },
      () => {
        // Restore real time phase
        const h = new Date().getHours();
        if (h < 6) setDayPhase("night");
        else if (h < 8) setDayPhase("dawn");
        else if (h < 12) setDayPhase("morning");
        else if (h < 16) setDayPhase("afternoon");
        else if (h < 18) setDayPhase("golden");
        else if (h < 20) setDayPhase("dusk");
        else setDayPhase("night");
      }
    );

    // Expose for dev console / triple-click-clock easter egg
    (window as unknown as Record<string, unknown>).__officeRapidCycle = timer;

    return () => {
      timer.stop();
      delete (window as unknown as Record<string, unknown>).__officeRapidCycle;
    };
  }, [setDayPhase]);

  // Holiday detection (static per session)
  const holiday = detectHoliday();
  const holidayDecorations = getHolidayDecorations(holiday);

  return { holiday, holidayDecorations };
}
