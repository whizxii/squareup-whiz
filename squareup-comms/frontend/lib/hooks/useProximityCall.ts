/**
 * useProximityCall — auto-join/leave LiveKit rooms when entering/leaving
 * meeting-type zones. Provides zone-based audio isolation.
 *
 * When the user walks into a meeting zone, this hook automatically joins
 * the zone's call room. When they leave, it disconnects.
 *
 * Focus zones mute incoming spatial audio (handled by setting volume to 0
 * in SpatialAudioManager via the focusMuted flag).
 */

"use client";

import { useEffect, useRef } from "react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCallStore } from "@/lib/stores/call-store";

/** Debounce to prevent rapid join/leave on zone boundaries */
const ZONE_DEBOUNCE_MS = 1500;

function isInsideZone(
  px: number,
  py: number,
  zone: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  return px >= zone.x && px < zone.x + zone.width && py >= zone.y && py < zone.y + zone.height;
}

export function useProximityCall(opts: { readonly userId: string; readonly enabled: boolean }) {
  const lastZoneRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!opts.enabled) return;

    const unsubscribe = useOfficeStore.subscribe((state) => {
      const { myPosition, zones } = state;
      const { isInCall, roomName } = useCallStore.getState();

      // Find which meeting zone the user is currently in
      const currentMeetingZone = zones.find(
        (z) => z.type === "meeting" && isInsideZone(myPosition.x, myPosition.y, z),
      );

      const currentZoneId = currentMeetingZone?.id ?? null;

      // No change — skip
      if (currentZoneId === lastZoneRef.current) return;

      // Clear pending debounce
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const { isInCall: stillInCall, roomName: currentRoom } = useCallStore.getState();

        // Left a meeting zone → leave call if it was a zone call
        if (!currentZoneId && lastZoneRef.current) {
          const zoneRoomName = `zone-${lastZoneRef.current}`;
          if (stillInCall && currentRoom === zoneRoomName) {
            useCallStore.getState().leaveCall();
          }
        }

        // Entered a meeting zone → auto-join zone call
        if (currentZoneId && currentZoneId !== lastZoneRef.current) {
          const zoneRoomName = `zone-${currentZoneId}`;
          // Don't interrupt an existing non-zone call
          if (!stillInCall) {
            useCallStore.getState().joinCall(zoneRoomName);
          }
        }

        lastZoneRef.current = currentZoneId;
      }, ZONE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [opts.enabled, opts.userId]);
}
