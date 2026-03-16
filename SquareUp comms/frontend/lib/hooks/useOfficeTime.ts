/**
 * Real-time clock hook for day/night cycle and agent schedules.
 * Updates every 60 seconds.
 */

import { useEffect, useCallback } from "react";
import type { DayPhase } from "../stores/office-store";
import { useOfficeStore } from "../stores/office-store";

export interface OfficeTimeState {
  readonly hour: number;
  readonly minute: number;
  readonly dayPhase: DayPhase;
  readonly lightIntensity: number;
  readonly lampsOn: boolean;
}

function computeDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 18) return "golden";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

function computeLightIntensity(hour: number): number {
  if (hour >= 9 && hour <= 16) return 1;
  if (hour >= 7 && hour < 9) return 0.6 + (hour - 7) * 0.2;
  if (hour > 16 && hour <= 18) return 1 - (hour - 16) * 0.3;
  if (hour > 18 && hour <= 20) return 0.4 - (hour - 18) * 0.15;
  return 0.1;
}

export function useOfficeTime(): OfficeTimeState {
  const dayPhase = useOfficeStore((s) => s.dayPhase);
  const setDayPhase = useOfficeStore((s) => s.setDayPhase);

  const update = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const newPhase = computeDayPhase(hour);
    setDayPhase(newPhase);
  }, [setDayPhase]);

  useEffect(() => {
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [update]);

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  return {
    hour,
    minute,
    dayPhase,
    lightIntensity: computeLightIntensity(hour),
    lampsOn: hour >= 17 || hour < 6,
  };
}
