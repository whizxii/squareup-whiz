/**
 * Easter egg system for the virtual office.
 * Handles Konami code, plant growth, and other delightful interactions.
 * Pure functions + state management via callbacks.
 */

// ---------------------------------------------------------------------------
// Konami Code Detector
// ---------------------------------------------------------------------------

const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function createKonamiDetector(onActivate: () => void): {
  readonly handleKey: (key: string) => void;
  readonly reset: () => void;
} {
  let index = 0;

  return {
    handleKey(key: string) {
      if (key.toLowerCase() === KONAMI_CODE[index].toLowerCase()) {
        index += 1;
        if (index === KONAMI_CODE.length) {
          index = 0;
          onActivate();
        }
      } else {
        index = 0;
      }
    },
    reset() {
      index = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Plant Growth System (localStorage persisted)
// ---------------------------------------------------------------------------

const PLANT_STORAGE_KEY = "sq-office-plant-growth";
const MAX_GROWTH = 5;

interface PlantState {
  readonly levels: Record<string, number>;
}

function loadPlantState(): PlantState {
  if (typeof window === "undefined") return { levels: {} };
  try {
    const raw = localStorage.getItem(PLANT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PlantState;
  } catch {
    // ignore
  }
  return { levels: {} };
}

function savePlantState(state: PlantState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLANT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getPlantGrowth(plantId: string): number {
  const state = loadPlantState();
  return state.levels[plantId] ?? 0;
}

export function waterPlant(plantId: string): {
  readonly level: number;
  readonly isFlowering: boolean;
  readonly justFlowered: boolean;
} {
  const state = loadPlantState();
  const current = state.levels[plantId] ?? 0;
  const next = Math.min(current + 1, MAX_GROWTH);
  const justFlowered = current < MAX_GROWTH && next === MAX_GROWTH;

  const newState: PlantState = {
    levels: { ...state.levels, [plantId]: next },
  };
  savePlantState(newState);

  return {
    level: next,
    isFlowering: next === MAX_GROWTH,
    justFlowered,
  };
}

// ---------------------------------------------------------------------------
// Clock Rapid Cycle
// ---------------------------------------------------------------------------

const RAPID_CYCLE_DURATION = 30_000; // 30 seconds of 60× speed
const RAPID_CYCLE_INTERVAL = 1000; // 1 second per "hour"

export function createRapidCycleTimer(
  onTick: (hour: number) => void,
  onComplete: () => void
): { readonly start: () => void; readonly stop: () => void } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let hour = 0;

  return {
    start() {
      hour = 0;
      intervalId = setInterval(() => {
        hour = (hour + 1) % 24;
        onTick(hour);
      }, RAPID_CYCLE_INTERVAL);

      timeoutId = setTimeout(() => {
        this.stop();
        onComplete();
      }, RAPID_CYCLE_DURATION);
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Holiday Detection
// ---------------------------------------------------------------------------

export type Holiday =
  | "christmas"
  | "halloween"
  | "valentines"
  | "new_year"
  | "diwali"
  | null;

export function detectHoliday(date: Date = new Date()): Holiday {
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();

  // Christmas: Dec 20-31
  if (month === 12 && day >= 20) return "christmas";
  // New Year: Jan 1-5
  if (month === 1 && day <= 5) return "new_year";
  // Halloween: Oct 25-31
  if (month === 10 && day >= 25) return "halloween";
  // Valentine's: Feb 12-14
  if (month === 2 && day >= 12 && day <= 14) return "valentines";
  // Diwali: approximate — Oct 15-Nov 15 (varies by year)
  if ((month === 10 && day >= 15) || (month === 11 && day <= 15)) return "diwali";

  return null;
}

/**
 * Get decoration emojis for the current holiday.
 */
export function getHolidayDecorations(holiday: Holiday): readonly string[] {
  switch (holiday) {
    case "christmas":
      return ["\u{1F384}", "\u{1F381}", "\u{2744}", "\u{1F385}", "\u{1F31F}"];
    case "halloween":
      return ["\u{1F383}", "\u{1F47B}", "\u{1F577}", "\u{1F987}", "\u{1FA78}"];
    case "valentines":
      return ["\u{2764}", "\u{1F495}", "\u{1F339}", "\u{1F498}", "\u{1F48C}"];
    case "new_year":
      return ["\u{1F386}", "\u{1F387}", "\u{1F389}", "\u{1F37E}", "\u{2728}"];
    case "diwali":
      return ["\u{1FA94}", "\u{1F4A5}", "\u{2728}", "\u{1F386}", "\u{1F6D5}"];
    default:
      return [];
  }
}
