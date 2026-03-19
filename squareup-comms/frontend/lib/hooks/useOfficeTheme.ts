/**
 * Hook that resolves the current office theme tokens based on next-themes.
 */

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { getOfficeTheme, type OfficeTheme, type OfficeThemeTokens } from "@/lib/office/theme";

export function useOfficeTheme(): {
  readonly theme: OfficeTheme;
  readonly tokens: OfficeThemeTokens;
  readonly isDark: boolean;
} {
  const { resolvedTheme } = useTheme();
  const mode: OfficeTheme = resolvedTheme === "dark" ? "dark" : "light";

  const tokens = useMemo(() => getOfficeTheme(mode), [mode]);

  return { theme: mode, tokens, isDark: mode === "dark" };
}
