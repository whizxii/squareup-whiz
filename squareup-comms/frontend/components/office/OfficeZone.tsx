/**
 * Interactive HTML overlay for office zones.
 * Renders on top of canvas-painted zones, adding hover tooltips,
 * capacity indicators, privacy icons, and proximity glow.
 * Fully themed via useOfficeTheme.
 */

"use client";

import { useMemo } from "react";
import { Lock, Users } from "lucide-react";
import type { OfficeZone as ZoneType } from "@/lib/stores/office-store";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { TILE } from "@/lib/office/office-renderer";

interface OfficeZoneProps {
  readonly zone: ZoneType;
}

const ZONE_ICONS: Readonly<Record<string, string>> = {
  desk: "💻",
  meeting: "🤝",
  lounge: "☕",
  focus: "🎯",
  agent_station: "🤖",
};

export default function OfficeZoneOverlay({ zone }: OfficeZoneProps) {
  const { tokens } = useOfficeTheme();
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const editMode = useOfficeStore((s) => s.editMode);
  const myPosition = useOfficeStore((s) => s.myPosition);

  const occupants = useMemo(() => {
    const inZone = (ex: { x: number; y: number }) =>
      ex.x >= zone.x &&
      ex.x < zone.x + zone.width &&
      ex.y >= zone.y &&
      ex.y < zone.y + zone.height;

    return users.filter(inZone).length + agents.filter(inZone).length;
  }, [users, agents, zone.x, zone.y, zone.width, zone.height]);

  const isNearby = useMemo(() => {
    const cx = zone.x + zone.width / 2;
    const cy = zone.y + zone.height / 2;
    const dx = myPosition.x - cx;
    const dy = myPosition.y - cy;
    return Math.sqrt(dx * dx + dy * dy) <= 3;
  }, [myPosition.x, myPosition.y, zone.x, zone.y, zone.width, zone.height]);

  return (
    <div
      className="absolute"
      style={{
        left: zone.x * TILE,
        top: zone.y * TILE,
        width: zone.width * TILE,
        height: zone.height * TILE,
        zIndex: 5,
        pointerEvents: editMode ? "auto" : "none",
      }}
    >
      {/* Zone label */}
      <div
        className="absolute left-2 top-1 flex items-center gap-1"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-[10px]">{ZONE_ICONS[zone.type] ?? "📍"}</span>
        <span
          className="rounded-sm px-1 py-0.5 text-[9px] font-semibold"
          style={{
            color: zone.color,
            backgroundColor: tokens.glass,
            backdropFilter: "blur(8px)",
          }}
        >
          {zone.name}
        </span>
      </div>

      {/* Capacity badge */}
      {zone.capacity && occupants > 0 && (
        <div
          className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{
            backgroundColor: tokens.glass,
            backdropFilter: "blur(8px)",
            border: `1px solid ${zone.color}30`,
            pointerEvents: "auto",
          }}
        >
          <Users size={8} style={{ color: zone.color, opacity: 0.7 }} />
          <span
            className="text-[8px] font-medium"
            style={{ color: zone.color }}
          >
            {occupants}/{zone.capacity}
          </span>
        </div>
      )}

      {/* Privacy indicator */}
      {zone.isPrivate && (
        <div
          className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full"
          style={{
            backgroundColor: tokens.glass,
            backdropFilter: "blur(8px)",
          }}
        >
          <Lock size={8} style={{ color: zone.color, opacity: 0.7 }} />
        </div>
      )}

      {/* Proximity glow */}
      {isNearby && !editMode && (
        <div
          className="office-proximity-pulse absolute inset-0 rounded-lg"
          style={{
            border: `1px solid ${zone.color}`,
            boxShadow: `inset 0 0 12px ${zone.color}15, 0 0 8px ${zone.color}10`,
            opacity: 0.25,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Edit mode border */}
      {editMode && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-dashed cursor-move"
          style={{
            borderColor: `${zone.color}80`,
            backgroundColor: `${zone.color}08`,
          }}
        />
      )}
    </div>
  );
}
