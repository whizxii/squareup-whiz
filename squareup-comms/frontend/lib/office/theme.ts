/**
 * Office Theme Engine
 *
 * Provides office-specific design tokens for light and dark modes.
 * Works with the existing next-themes ThemeProvider and CSS variables
 * defined in globals.css.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfficeTheme = "light" | "dark";

export interface OfficeThemeTokens {
  /** Main office background */
  readonly background: string;
  /** Elevated surface (cards, panels) */
  readonly surface: string;
  /** Higher-elevation surface (popovers, dropdowns) */
  readonly surfaceElevated: string;
  /** Primary text */
  readonly text: string;
  /** Secondary/muted text */
  readonly textSecondary: string;
  /** Subtle text (labels, timestamps) */
  readonly textMuted: string;
  /** Brand accent */
  readonly accent: string;
  /** Accent hover */
  readonly accentHover: string;
  /** Accent at low opacity for backgrounds */
  readonly accentSoft: string;
  /** Border color */
  readonly border: string;
  /** Subtle border (dividers) */
  readonly borderSubtle: string;
  /** Toolbar/glass panel background */
  readonly glass: string;
  /** Toolbar/glass panel border */
  readonly glassBorder: string;
  /** Zone card backgrounds by zone type */
  readonly zones: Readonly<Record<string, string>>;
  /** Status indicator colors */
  readonly status: {
    readonly online: string;
    readonly away: string;
    readonly busy: string;
    readonly dnd: string;
    readonly offline: string;
  };
  /** Shadow values */
  readonly shadow: string;
  readonly shadowLg: string;
}

// ---------------------------------------------------------------------------
// Light Theme
// ---------------------------------------------------------------------------

const LIGHT: OfficeThemeTokens = {
  background: "#F5F3EF",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  text: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  accent: "#4F46E5",
  accentHover: "#4338CA",
  accentSoft: "rgba(79, 70, 229, 0.08)",
  border: "#E5E7EB",
  borderSubtle: "#F3F4F6",
  glass: "rgba(255, 255, 255, 0.80)",
  glassBorder: "rgba(0, 0, 0, 0.06)",
  zones: {
    desk: "rgba(79, 70, 229, 0.06)",
    meeting: "rgba(34, 197, 94, 0.06)",
    lounge: "rgba(234, 179, 8, 0.06)",
    focus: "rgba(139, 92, 246, 0.06)",
    agent_station: "rgba(6, 182, 212, 0.06)",
  },
  status: {
    online: "#22C55E",
    away: "#EAB308",
    busy: "#EF4444",
    dnd: "#EF4444",
    offline: "#9CA3AF",
  },
  shadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  shadowLg: "0 8px 24px rgba(0, 0, 0, 0.08)",
};

// ---------------------------------------------------------------------------
// Dark Theme
// ---------------------------------------------------------------------------

const DARK: OfficeThemeTokens = {
  background: "#1E1E2E",
  surface: "#2A2A3C",
  surfaceElevated: "#323248",
  text: "#E5E7EB",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  accent: "#818CF8",
  accentHover: "#6366F1",
  accentSoft: "rgba(129, 140, 248, 0.10)",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  glass: "rgba(30, 30, 46, 0.80)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  zones: {
    desk: "rgba(129, 140, 248, 0.08)",
    meeting: "rgba(34, 197, 94, 0.08)",
    lounge: "rgba(234, 179, 8, 0.08)",
    focus: "rgba(139, 92, 246, 0.08)",
    agent_station: "rgba(6, 182, 212, 0.08)",
  },
  status: {
    online: "#4ADE80",
    away: "#FACC15",
    busy: "#F87171",
    dnd: "#F87171",
    offline: "#6B7280",
  },
  shadow: "0 1px 3px rgba(0, 0, 0, 0.20)",
  shadowLg: "0 8px 24px rgba(0, 0, 0, 0.30)",
};

// ---------------------------------------------------------------------------
// Token Access
// ---------------------------------------------------------------------------

const THEMES: Readonly<Record<OfficeTheme, OfficeThemeTokens>> = {
  light: LIGHT,
  dark: DARK,
};

/** Get theme tokens for the given mode. */
export function getOfficeTheme(mode: OfficeTheme): OfficeThemeTokens {
  return THEMES[mode];
}

/** Zone accent colors (used for zone card borders and icons). */
export const ZONE_ACCENTS: Readonly<Record<string, string>> = {
  desk: "#4F46E5",
  meeting: "#22C55E",
  lounge: "#EAB308",
  focus: "#8B5CF6",
  agent_station: "#06B6D4",
};

/** Zone icons by type. */
export const ZONE_ICONS: Readonly<Record<string, string>> = {
  desk: "Monitor",
  meeting: "Video",
  lounge: "Coffee",
  focus: "Headphones",
  agent_station: "Bot",
};
