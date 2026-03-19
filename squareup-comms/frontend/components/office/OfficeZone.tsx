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
import { tileToIso } from "@/lib/office/iso-coords";

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
  const gridRows = useOfficeStore((s) => s.layout.gridRows);
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

  // Position label cluster at iso center of zone diamond
  const isoCenter = tileToIso(
    zone.x + zone.width / 2,
    zone.y + zone.height / 2,
    gridRows,
  );

  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{
        left: isoCenter.x,
        top: isoCenter.y,
        transform: "translate(-50%, -50%)",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      {/* Zone label */}
      <div className="flex items-center gap-1">
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
        {zone.isPrivate && (
          <Lock size={8} style={{ color: zone.color, opacity: 0.7 }} />
        )}
      </div>

      {/* Capacity badge */}
      {zone.capacity && occupants > 0 && (
        <div
          className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{
            backgroundColor: tokens.glass,
            backdropFilter: "blur(8px)",
            border: `1px solid ${zone.color}30`,
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

      {/* Proximity glow dot */}
      {isNearby && !editMode && (
        <div
          className="office-proximity-pulse rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: zone.color,
            opacity: 0.6,
          }}
        />
      )}
    </div>
  );
}
