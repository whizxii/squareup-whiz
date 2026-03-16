/**
 * Classic grid-based office view — responsive cells with zone overlays,
 * user circle avatars, and agent icon circles.
 * This is the "normal" view mode that provides a clean, accessible layout.
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  Monitor,
  Coffee,
  Users,
  Lock,
  Zap,
  MessageSquare,
} from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import type {
  OfficeZone,
  OfficeUser,
  OfficeAgent as AgentType,
  UserStatus,
  ZoneType,
} from "@/lib/stores/office-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELL_SIZE_LG = 64;
const CELL_SIZE_SM = 48;

const STATUS_COLORS: Record<UserStatus, string> = {
  online: "#22c55e",
  away: "#eab308",
  busy: "#ef4444",
  dnd: "#ef4444",
};

const ZONE_BG: Record<ZoneType, string> = {
  desk: "rgba(255,107,0,0.06)",
  meeting: "rgba(34,197,94,0.08)",
  lounge: "rgba(234,179,8,0.08)",
  focus: "rgba(99,102,241,0.08)",
  agent_station: "rgba(6,182,212,0.06)",
};

const ZONE_BORDER: Record<ZoneType, string> = {
  desk: "rgba(255,107,0,0.18)",
  meeting: "rgba(34,197,94,0.2)",
  lounge: "rgba(234,179,8,0.2)",
  focus: "rgba(99,102,241,0.2)",
  agent_station: "rgba(6,182,212,0.18)",
};

const ZONE_ICONS: Record<ZoneType, typeof Monitor> = {
  desk: Monitor,
  meeting: Users,
  lounge: Coffee,
  focus: Headphones,
  agent_station: Zap,
};

const AGENT_COLORS: Record<string, string> = {
  "crm-agent": "#06b6d4",
  "github-agent": "#f43f5e",
  "meeting-agent": "#8b5cf6",
  "scheduler-agent": "#f59e0b",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ZoneElement({
  zone,
  cellSize,
}: {
  readonly zone: OfficeZone;
  readonly cellSize: number;
}) {
  const ZoneIcon = ZONE_ICONS[zone.type] ?? Monitor;
  const users = useOfficeStore((s) => s.users);

  const occupants = useMemo(
    () =>
      users.filter(
        (u) =>
          u.x >= zone.x &&
          u.x < zone.x + zone.width &&
          u.y >= zone.y &&
          u.y < zone.y + zone.height
      ),
    [users, zone.x, zone.y, zone.width, zone.height]
  );

  return (
    <div
      className="absolute rounded-xl transition-all duration-200"
      style={{
        left: zone.x * cellSize + 4,
        top: zone.y * cellSize + 4,
        width: zone.width * cellSize - 8,
        height: zone.height * cellSize - 8,
        backgroundColor: ZONE_BG[zone.type] ?? "rgba(0,0,0,0.03)",
        border: `1.5px solid ${ZONE_BORDER[zone.type] ?? "rgba(0,0,0,0.08)"}`,
        pointerEvents: "none",
      }}
    >
      {/* Zone header */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <ZoneIcon
          size={12}
          style={{ color: zone.color, opacity: 0.7 }}
        />
        <span
          className="text-[10px] font-semibold leading-none"
          style={{ color: zone.color, opacity: 0.8 }}
        >
          {zone.name}
        </span>
        {zone.isPrivate && (
          <Lock size={9} className="text-muted-foreground/50" />
        )}
        {zone.capacity && occupants.length > 0 && (
          <span className="ml-auto rounded-full bg-black/5 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground dark:bg-white/10">
            {occupants.length}/{zone.capacity}
          </span>
        )}
      </div>
    </div>
  );
}

function UserAvatar({
  user,
  cellSize,
}: {
  readonly user: OfficeUser;
  readonly cellSize: number;
}) {
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const selectedEntity = useOfficeStore((s) => s.selectedEntity);
  const myUserId = useCurrentUserId();
  const isMe = user.id === myUserId;
  const isSelected =
    selectedEntity?.type === "user" && selectedEntity?.id === user.id;

  const initial = user.name.charAt(0).toUpperCase();
  const statusColor = STATUS_COLORS[user.status];

  return (
    <motion.div
      className="absolute z-20 cursor-pointer"
      animate={{
        left: user.x * cellSize + cellSize / 2 - 22,
        top: user.y * cellSize + cellSize / 2 - 22,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={() => setSelectedEntity({ type: "user", id: user.id })}
    >
      {/* Avatar circle */}
      <div
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-md transition-transform hover:scale-110"
        style={{
          background: isMe
            ? "linear-gradient(135deg, #FF6B00, #FF8533)"
            : `linear-gradient(135deg, ${user.appearance.shirtColor}, ${user.appearance.hairColor})`,
          border: `2.5px solid ${statusColor}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${isMe ? "rgba(255,107,0,0.3)" : "rgba(74,144,217,0.3)"}`
            : "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}

        {/* Status dot */}
        <div
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
          style={{
            backgroundColor: statusColor,
            border: "2px solid white",
          }}
        />
      </div>

      {/* Name label */}
      <div className="mt-1 text-center">
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
          style={{
            backgroundColor: isMe
              ? "rgba(255,107,0,0.12)"
              : "rgba(0,0,0,0.05)",
            color: isMe
              ? "#FF6B00"
              : "var(--color-sq-text-secondary, #666)",
          }}
        >
          {isMe ? "You" : user.name}
        </span>
      </div>

      {/* Activity bubble */}
      <AnimatePresence>
        {user.activity && isSelected && (
          <motion.div
            className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-[10px] text-gray-700 shadow-md dark:bg-gray-800/95 dark:text-gray-200"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {user.statusEmoji && <span className="mr-1">{user.statusEmoji}</span>}
            {user.activity}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AgentAvatar({
  agent,
  cellSize,
}: {
  readonly agent: AgentType;
  readonly cellSize: number;
}) {
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const selectedEntity = useOfficeStore((s) => s.selectedEntity);
  const isSelected =
    selectedEntity?.type === "agent" && selectedEntity?.id === agent.id;

  const color = AGENT_COLORS[agent.id] ?? "#4a90d9";
  const isWorking = agent.status === "working" || agent.status === "thinking";

  return (
    <motion.div
      className="absolute z-20 cursor-pointer"
      animate={{
        left: agent.x * cellSize + cellSize / 2 - 20,
        top: agent.y * cellSize + cellSize / 2 - 20,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={() => setSelectedEntity({ type: "agent", id: agent.id })}
    >
      {/* Agent circle */}
      <div
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-lg shadow-md transition-transform hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${color}20, ${color}40)`,
          border: `2px solid ${color}`,
          boxShadow: isWorking
            ? `0 0 12px ${color}40, 0 2px 8px rgba(0,0,0,0.1)`
            : isSelected
              ? `0 0 0 3px ${color}30`
              : "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <span>{agent.icon}</span>

        {/* Status indicator */}
        <div
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor:
              agent.status === "working"
                ? "#4a90d9"
                : agent.status === "thinking"
                  ? "#eab308"
                  : agent.status === "error"
                    ? "#ef4444"
                    : "#22c55e",
            border: "2px solid white",
          }}
        />
      </div>

      {/* Agent name */}
      <div className="mt-1 text-center">
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
          style={{
            backgroundColor: `${color}15`,
            color,
          }}
        >
          {agent.name}
        </span>
      </div>

      {/* Task bubble */}
      <AnimatePresence>
        {agent.currentTask && isSelected && (
          <motion.div
            className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-[10px] text-gray-700 shadow-md dark:bg-gray-800/95 dark:text-gray-200"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            <MessageSquare size={10} className="text-muted-foreground" />
            {agent.currentTask}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GridMiniMap({
  cellSize,
}: {
  readonly cellSize: number;
}) {
  const zones = useOfficeStore((s) => s.zones);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const layout = useOfficeStore((s) => s.layout);
  const myUserId = useCurrentUserId();

  const scale = 6;

  return (
    <div
      className="absolute bottom-16 right-4 z-30 overflow-hidden rounded-xl border border-white/15 shadow-lg"
      style={{
        width: layout.gridCols * scale + 16,
        height: layout.gridRows * scale + 16,
        backgroundColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px) saturate(150%)",
      }}
    >
      <div className="relative m-2" style={{ width: layout.gridCols * scale, height: layout.gridRows * scale }}>
        {/* Zone rects */}
        {zones.map((z) => (
          <div
            key={z.id}
            className="absolute rounded-sm"
            style={{
              left: z.x * scale,
              top: z.y * scale,
              width: z.width * scale,
              height: z.height * scale,
              backgroundColor: `${z.color}30`,
              border: `1px solid ${z.color}50`,
            }}
          />
        ))}
        {/* User dots */}
        {users.map((u) => (
          <div
            key={u.id}
            className="absolute rounded-full"
            style={{
              left: u.x * scale + scale / 2 - 2.5,
              top: u.y * scale + scale / 2 - 2.5,
              width: 5,
              height: 5,
              backgroundColor: u.id === myUserId ? "#FF6B00" : "#22c55e",
              boxShadow: u.id === myUserId ? "0 0 4px rgba(255,107,0,0.5)" : "none",
            }}
          />
        ))}
        {/* Agent dots */}
        {agents
          .filter((a) => a.status !== "offline")
          .map((a) => (
            <div
              key={a.id}
              className="absolute rounded-full"
              style={{
                left: a.x * scale + scale / 2 - 2,
                top: a.y * scale + scale / 2 - 2,
                width: 4,
                height: 4,
                backgroundColor: AGENT_COLORS[a.id] ?? "#4a90d9",
              }}
            />
          ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GridOfficeView() {
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const zones = useOfficeStore((s) => s.zones);
  const layout = useOfficeStore((s) => s.layout);
  const moveUser = useOfficeStore((s) => s.moveUser);
  const setMyPosition = useOfficeStore((s) => s.setMyPosition);
  const updateUserAnimation = useOfficeStore((s) => s.updateUserAnimation);
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const myUserId = useCurrentUserId();

  // Responsive cell size (SSR-safe)
  const [cellSize, setCellSize] = useState(CELL_SIZE_LG);
  useEffect(() => {
    const update = () => setCellSize(window.innerWidth < 768 ? CELL_SIZE_SM : CELL_SIZE_LG);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalW = layout.gridCols * cellSize;
  const totalH = layout.gridRows * cellSize;

  const handleCellClick = (tileX: number, tileY: number) => {
    // Check if clicking on an entity
    const clickedUser = users.find((u) => u.x === tileX && u.y === tileY);
    if (clickedUser) {
      setSelectedEntity({ type: "user", id: clickedUser.id });
      return;
    }
    const clickedAgent = agents.find(
      (a) => a.x === tileX && a.y === tileY && a.status !== "offline"
    );
    if (clickedAgent) {
      setSelectedEntity({ type: "agent", id: clickedAgent.id });
      return;
    }

    // Click-to-teleport for current user
    const me = users.find((u) => u.id === myUserId);
    if (!me) return;

    const dir =
      tileX > me.x
        ? "right"
        : tileX < me.x
          ? "left"
          : tileY > me.y
            ? "down"
            : "up";

    moveUser(myUserId, tileX, tileY, dir);
    setMyPosition(tileX, tileY);
    updateUserAnimation(myUserId, "idle");
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-auto">
      <div
        className="relative"
        style={{
          width: totalW,
          height: totalH,
          background:
            "repeating-conic-gradient(rgba(0,0,0,0.02) 0% 25%, transparent 0% 50%) 0 0",
          backgroundSize: `${cellSize * 2}px ${cellSize * 2}px`,
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* Clickable grid cells */}
        {Array.from({ length: layout.gridRows }).map((_, row) =>
          Array.from({ length: layout.gridCols }).map((_, col) => (
            <div
              key={`${col}-${row}`}
              className="absolute cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              style={{
                left: col * cellSize,
                top: row * cellSize,
                width: cellSize,
                height: cellSize,
              }}
              onClick={() => handleCellClick(col, row)}
            />
          ))
        )}

        {/* Zones */}
        {zones.map((zone) => (
          <ZoneElement key={zone.id} zone={zone} cellSize={cellSize} />
        ))}

        {/* Users */}
        {users.map((user) => (
          <UserAvatar key={user.id} user={user} cellSize={cellSize} />
        ))}

        {/* Agents */}
        {agents
          .filter((a) => a.status !== "offline")
          .map((agent) => (
            <AgentAvatar key={agent.id} agent={agent} cellSize={cellSize} />
          ))}
      </div>

      {/* Mini-map */}
      <GridMiniMap cellSize={cellSize} />
    </div>
  );
}
