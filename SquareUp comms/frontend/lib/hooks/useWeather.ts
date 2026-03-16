/**
 * Weather hook — fetches real weather from Open-Meteo API (free, no key).
 * Maps WMO weather codes to our WeatherCondition type.
 * Fallback: "clear" if geolocation denied or API fails.
 * Refreshes every 30 minutes.
 */

"use client";

import { useEffect, useRef } from "react";
import type { WeatherCondition } from "../stores/office-store";
import { useOfficeStore } from "../stores/office-store";

// ---------------------------------------------------------------------------
// WMO weather code mapping
// ---------------------------------------------------------------------------

function wmoToCondition(code: number): WeatherCondition {
  // https://open-meteo.com/en/docs — WMO Weather interpretation codes
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 49) return "cloudy"; // fog variants
  if (code <= 57) return "rain"; // drizzle
  if (code <= 67) return "rain"; // rain
  if (code <= 77) return "snow"; // snow
  if (code <= 82) return "rain"; // rain showers
  if (code <= 86) return "snow"; // snow showers
  if (code >= 95) return "storm"; // thunderstorm
  return "clear";
}

// ---------------------------------------------------------------------------
// Geo + Fetch
// ---------------------------------------------------------------------------

interface OpenMeteoResponse {
  readonly current_weather?: {
    readonly weathercode: number;
    readonly temperature: number;
  };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherCondition> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return "clear";

  const data: OpenMeteoResponse = await res.json();
  if (!data.current_weather) return "clear";

  return wmoToCondition(data.current_weather.weathercode);
}

function getPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30 * 60 * 1000 }
    );
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useWeather(): void {
  const setWeather = useOfficeStore((s) => s.setWeather);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      try {
        const pos = await getPosition();
        if (cancelled) return;

        if (!pos) {
          // No geolocation — keep whatever weather is set (default: clear)
          return;
        }

        const condition = await fetchWeather(pos.lat, pos.lon);
        if (!cancelled) {
          setWeather(condition);
        }
      } catch {
        // Silently fail — keep current weather
      }
    };

    update();
    intervalRef.current = setInterval(update, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setWeather]);
}
