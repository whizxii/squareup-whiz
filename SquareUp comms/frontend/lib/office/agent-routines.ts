/**
 * Agent daily schedule & personality-driven behavior system.
 * Maps real browser time to agent states, visual states, and positions.
 * Pure functions — no React dependencies.
 */

import type { OfficeAgent, AgentVisualState } from "../stores/office-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentScheduleEntry {
  readonly hourStart: number;
  readonly hourEnd: number;
  readonly status: OfficeAgent["status"];
  readonly visualState: AgentVisualState;
  readonly task?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

interface AgentDaySchedule {
  readonly agentId: string;
  readonly homeX: number;
  readonly homeY: number;
  readonly schedule: readonly AgentScheduleEntry[];
}

// ---------------------------------------------------------------------------
// Schedules per agent
// ---------------------------------------------------------------------------

const LOUNGE_AREA = { x: 7, y: 7 }; // coffee machine area

const AGENT_SCHEDULES: readonly AgentDaySchedule[] = [
  {
    agentId: "crm-agent",
    homeX: 11,
    homeY: 7,
    schedule: [
      { hourStart: 0, hourEnd: 7, status: "idle", visualState: "idle", task: "Out of office" },
      { hourStart: 7, hourEnd: 8, status: "idle", visualState: "idle", task: "Starting up..." },
      { hourStart: 8, hourEnd: 9, status: "idle", visualState: "coffee_break", task: "Morning coffee", position: LOUNGE_AREA },
      { hourStart: 9, hourEnd: 12, status: "working", visualState: "typing", task: "Syncing CRM contacts" },
      { hourStart: 12, hourEnd: 13, status: "idle", visualState: "coffee_break", task: "Lunch break", position: LOUNGE_AREA },
      { hourStart: 13, hourEnd: 15, status: "working", visualState: "typing", task: "Updating deal pipeline" },
      { hourStart: 15, hourEnd: 15.5, status: "idle", visualState: "idle", task: "Afternoon slump" },
      { hourStart: 15.5, hourEnd: 17, status: "working", visualState: "typing", task: "Generating reports" },
      { hourStart: 17, hourEnd: 18, status: "idle", visualState: "idle", task: "Winding down" },
      { hourStart: 18, hourEnd: 24, status: "idle", visualState: "idle", task: "Out of office" },
    ],
  },
  {
    agentId: "github-agent",
    homeX: 11,
    homeY: 10,
    schedule: [
      { hourStart: 0, hourEnd: 6, status: "idle", visualState: "idle", task: "Out of office" },
      { hourStart: 6, hourEnd: 7, status: "idle", visualState: "idle", task: "Booting up..." },
      { hourStart: 7, hourEnd: 9, status: "working", visualState: "typing", task: "Reviewing overnight PRs" },
      { hourStart: 9, hourEnd: 12, status: "working", visualState: "typing", task: "Code review & CI checks" },
      { hourStart: 12, hourEnd: 13, status: "idle", visualState: "coffee_break", task: "Lunch break", position: LOUNGE_AREA },
      { hourStart: 13, hourEnd: 15, status: "working", visualState: "typing", task: "Merging approved PRs" },
      { hourStart: 15, hourEnd: 15.25, status: "idle", visualState: "idle", task: "Quick stretch" },
      { hourStart: 15.25, hourEnd: 18, status: "working", visualState: "typing", task: "Scanning for vulnerabilities" },
      { hourStart: 18, hourEnd: 19, status: "thinking", visualState: "idle", task: "Preparing nightly summary" },
      { hourStart: 19, hourEnd: 24, status: "idle", visualState: "idle", task: "Out of office" },
    ],
  },
  {
    agentId: "meeting-agent",
    homeX: 10,
    homeY: 7,
    schedule: [
      { hourStart: 0, hourEnd: 7, status: "idle", visualState: "idle", task: "Out of office" },
      { hourStart: 7, hourEnd: 8, status: "idle", visualState: "idle", task: "Checking today's calendar" },
      { hourStart: 8, hourEnd: 9, status: "working", visualState: "typing", task: "Sending meeting reminders" },
      { hourStart: 9, hourEnd: 10, status: "working", visualState: "typing", task: "Preparing standup notes" },
      { hourStart: 10, hourEnd: 12, status: "working", visualState: "typing", task: "Recording meeting notes" },
      { hourStart: 12, hourEnd: 13, status: "idle", visualState: "coffee_break", task: "Lunch break", position: LOUNGE_AREA },
      { hourStart: 13, hourEnd: 14, status: "working", visualState: "typing", task: "Distributing action items" },
      { hourStart: 14, hourEnd: 17, status: "working", visualState: "typing", task: "Scheduling follow-ups" },
      { hourStart: 17, hourEnd: 18, status: "idle", visualState: "idle", task: "Summarizing day's meetings" },
      { hourStart: 18, hourEnd: 24, status: "idle", visualState: "idle", task: "Out of office" },
    ],
  },
  {
    agentId: "scheduler-agent",
    homeX: 10,
    homeY: 10,
    schedule: [
      { hourStart: 0, hourEnd: 7, status: "idle", visualState: "idle", task: "Out of office" },
      { hourStart: 7, hourEnd: 8, status: "idle", visualState: "idle", task: "Loading schedules" },
      { hourStart: 8, hourEnd: 9, status: "working", visualState: "typing", task: "Optimizing today's calendar" },
      { hourStart: 9, hourEnd: 12, status: "working", visualState: "typing", task: "Managing time blocks" },
      { hourStart: 12, hourEnd: 13, status: "idle", visualState: "coffee_break", task: "Lunch break", position: LOUNGE_AREA },
      { hourStart: 13, hourEnd: 15, status: "working", visualState: "typing", task: "Rescheduling conflicts" },
      { hourStart: 15, hourEnd: 15.5, status: "thinking", visualState: "idle", task: "Analyzing week's workload" },
      { hourStart: 15.5, hourEnd: 17, status: "working", visualState: "typing", task: "Planning tomorrow" },
      { hourStart: 17, hourEnd: 18, status: "idle", visualState: "idle", task: "End-of-day wrap-up" },
      { hourStart: 18, hourEnd: 24, status: "idle", visualState: "idle", task: "Out of office" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Schedule lookup
// ---------------------------------------------------------------------------

function findScheduleEntry(
  schedule: readonly AgentScheduleEntry[],
  hour: number,
  minute: number
): AgentScheduleEntry | undefined {
  const time = hour + minute / 60;
  return schedule.find((e) => time >= e.hourStart && time < e.hourEnd);
}

/**
 * Get the current state for an agent based on real time.
 */
export function getAgentScheduleState(
  agentId: string,
  hour: number,
  minute: number
): {
  readonly status: OfficeAgent["status"];
  readonly visualState: AgentVisualState;
  readonly task?: string;
  readonly position?: { readonly x: number; readonly y: number };
} | null {
  const agentSchedule = AGENT_SCHEDULES.find((s) => s.agentId === agentId);
  if (!agentSchedule) return null;

  const entry = findScheduleEntry(agentSchedule.schedule, hour, minute);
  if (!entry) return null;

  return {
    status: entry.status,
    visualState: entry.visualState,
    task: entry.task,
    position: entry.position ?? { x: agentSchedule.homeX, y: agentSchedule.homeY },
  };
}

/**
 * Get all agent states for a given time.
 */
export function getAllAgentScheduleStates(hour: number, minute: number) {
  return AGENT_SCHEDULES.map((s) => ({
    agentId: s.agentId,
    ...getAgentScheduleState(s.agentId, hour, minute),
  }));
}

// ---------------------------------------------------------------------------
// Idle quirk system — random micro-behaviors
// ---------------------------------------------------------------------------

export type IdleQuirk =
  | "blink"
  | "stretch"
  | "sip_coffee"
  | "check_phone"
  | "look_around"
  | "yawn";

const QUIRKS: readonly IdleQuirk[] = [
  "blink",
  "stretch",
  "sip_coffee",
  "check_phone",
  "look_around",
  "yawn",
];

const QUIRK_WEIGHTS: Record<IdleQuirk, number> = {
  blink: 40,
  look_around: 25,
  yawn: 10,
  stretch: 10,
  sip_coffee: 10,
  check_phone: 5,
};

/**
 * Pick a random idle quirk, weighted by frequency.
 */
export function pickIdleQuirk(): IdleQuirk {
  const total = QUIRKS.reduce((sum, q) => sum + QUIRK_WEIGHTS[q], 0);
  let rand = Math.random() * total;

  for (const quirk of QUIRKS) {
    rand -= QUIRK_WEIGHTS[quirk];
    if (rand <= 0) return quirk;
  }

  return "blink";
}

/**
 * Get duration for a quirk animation in ms.
 */
export function getQuirkDuration(quirk: IdleQuirk): number {
  switch (quirk) {
    case "blink":
      return 150;
    case "stretch":
      return 2000;
    case "sip_coffee":
      return 1500;
    case "check_phone":
      return 3000;
    case "look_around":
      return 1200;
    case "yawn":
      return 2500;
  }
}

/**
 * Interval between quirks (ms), with jitter.
 */
export function getQuirkInterval(): number {
  return 15_000 + Math.random() * 15_000; // 15-30 seconds
}
