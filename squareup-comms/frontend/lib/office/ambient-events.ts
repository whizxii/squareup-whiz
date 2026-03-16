/**
 * Ambient event generator — random micro-events that bring life to the office.
 * Events are purely visual, no notifications or interruptions.
 * Uses a Poisson-like process: avg 1 event every 3-8 minutes.
 */

import type { AmbientEvent } from "../stores/office-store";

// ---------------------------------------------------------------------------
// Event templates
// ---------------------------------------------------------------------------

interface EventTemplate {
  readonly type: AmbientEvent["type"];
  readonly weight: number;
  readonly generator: () => Record<string, string>;
  readonly hourFilter?: (hour: number) => boolean;
}

const WHITEBOARD_ITEMS = [
  "Sprint 14 ✓",
  "Ship landing page",
  "Review Q1 OKRs",
  "Fix auth flow",
  "Update pitch deck",
  "Team retro Friday",
  "Investor demo prep",
  "Onboarding flow v2",
];

const DELIVERY_ITEMS = [
  "New monitors arrived",
  "Office snacks restocked",
  "Standing desk parts",
  "Team merch box",
];

const EVENT_TEMPLATES: readonly EventTemplate[] = [
  {
    type: "coffee_brew",
    weight: 25,
    generator: () => ({}),
    hourFilter: (h) => h >= 7 && h <= 16,
  },
  {
    type: "agent_chat",
    weight: 20,
    generator: () => {
      const agents = ["crm-agent", "github-agent", "meeting-agent", "scheduler-agent"];
      const a = agents[Math.floor(Math.random() * agents.length)];
      let b = agents[Math.floor(Math.random() * agents.length)];
      while (b === a) b = agents[Math.floor(Math.random() * agents.length)];
      return { agent1: a, agent2: b };
    },
    hourFilter: (h) => h >= 9 && h <= 17,
  },
  {
    type: "whiteboard_update",
    weight: 15,
    generator: () => ({
      text: WHITEBOARD_ITEMS[Math.floor(Math.random() * WHITEBOARD_ITEMS.length)],
    }),
    hourFilter: (h) => h >= 9 && h <= 18,
  },
  {
    type: "plant_drop",
    weight: 10,
    generator: () => {
      const desks = ["desk-1", "desk-2", "desk-3"];
      return { desk: desks[Math.floor(Math.random() * desks.length)] };
    },
  },
  {
    type: "agent_stretch",
    weight: 15,
    generator: () => {
      const agents = ["crm-agent", "github-agent", "meeting-agent", "scheduler-agent"];
      return { agent: agents[Math.floor(Math.random() * agents.length)] };
    },
    hourFilter: (h) => h >= 9 && h <= 17,
  },
  {
    type: "delivery",
    weight: 5,
    generator: () => ({
      item: DELIVERY_ITEMS[Math.floor(Math.random() * DELIVERY_ITEMS.length)],
    }),
    hourFilter: (h) => h >= 10 && h <= 15,
  },
  {
    type: "laughter",
    weight: 10,
    generator: () => ({ zone: "lounge" }),
    hourFilter: (h) => h >= 12 && h <= 18,
  },
];

// ---------------------------------------------------------------------------
// Event generation
// ---------------------------------------------------------------------------

/**
 * Pick a random ambient event appropriate for the current hour.
 */
export function generateAmbientEvent(hour: number): AmbientEvent | null {
  const eligible = EVENT_TEMPLATES.filter(
    (t) => !t.hourFilter || t.hourFilter(hour)
  );

  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, t) => sum + t.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const template of eligible) {
    rand -= template.weight;
    if (rand <= 0) {
      return {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: template.type,
        timestamp: Date.now(),
        data: template.generator(),
      };
    }
  }

  return null;
}

/**
 * Get the next event interval in ms (Poisson-like: 3-8 min avg).
 */
export function getNextEventInterval(): number {
  // Exponential distribution with mean of 5 minutes
  const meanMs = 5 * 60 * 1000;
  const minMs = 3 * 60 * 1000;
  const maxMs = 8 * 60 * 1000;

  const interval = -meanMs * Math.log(Math.random());
  return Math.max(minMs, Math.min(maxMs, interval));
}

/**
 * Get a display message for an ambient event (for screen readers / list view).
 */
export function getEventDescription(event: AmbientEvent): string {
  switch (event.type) {
    case "coffee_brew":
      return "Coffee machine is brewing a fresh pot";
    case "agent_chat":
      return `${event.data?.agent1 ?? "An agent"} is chatting with ${event.data?.agent2 ?? "another agent"}`;
    case "whiteboard_update":
      return `Whiteboard updated: "${event.data?.text ?? ""}"`;
    case "plant_drop":
      return "A plant dropped a leaf";
    case "agent_stretch":
      return `${event.data?.agent ?? "An agent"} is stretching`;
    case "delivery":
      return `Delivery: ${event.data?.item ?? "Package arrived"}`;
    case "laughter":
      return `Laughter from the ${event.data?.zone ?? "lounge"}`;
    default:
      return "Something happened in the office";
  }
}
