/**
 * Simplified Office View — SoWork-style zone cards.
 *
 * Replaces the literal pixel grid with a clean, scannable bird's-eye
 * overview of the office. Each zone is a card showing its name, icon,
 * capacity, and occupant avatars.
 *
 * Clicking a zone teleports the current user into it (immersive mode).
 * Clicking a user opens their detail panel.
 */

"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  Monitor,
  Coffee,
  Users,
  Video,
  Bot,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { ZONE_ACCENTS } from "@/lib/office/theme";
import type {
  OfficeZone,
  OfficeUser,
  OfficeAgent as AgentType,
  ZoneType,
  UserStatus,
} from "@/lib/stores/office-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Readonly<Record<UserStatus, string>> = {
  online: "#22C55E",
  away: "#EAB308",
  busy: "#EF4444",
  dnd: "#EF4444",
};

const ZONE_ICON_MAP: Readonly<Record<ZoneType, typeof Monitor>> = {
  desk: Monitor,
  meeting: Video,
  lounge: Coffee,
  focus: Headphones,
  agent_station: Bot,
};

const MAX_VISIBLE_AVATARS = 5;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ZoneCard({
  zone,
  occupants,
  occupantAgents,
  onUserClick,
  onZoneClick,
}: {
  readonly zone: OfficeZone;
  readonly occupants: readonly OfficeUser[];
  readonly occupantAgents: readonly AgentType[];
  readonly onUserClick: (userId: string) => void;
  readonly onZoneClick: (zone: OfficeZone) => void;
}) {
  const { tokens } = useOfficeTheme();
  const accent = ZONE_ACCENTS[zone.type] ?? tokens.accent;
  const ZoneIcon = ZONE_ICON_MAP[zone.type] ?? Monitor;
  const totalOccupants = occupants.length + occupantAgents.length;
  const overflow = totalOccupants - MAX_VISIBLE_AVATARS;

  return (
    <motion.button
      className="group relative flex w-full flex-col gap-3 rounded-2xl p-4 text-left transition-all"
      style={{
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.borderSubtle}`,
        boxShadow: tokens.shadow,
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: tokens.shadowLg,
        borderColor: accent + "40",
      }}
      transition={{ duration: 0.15 }}
      onClick={() => onZoneClick(zone)}
      aria-label={`${zone.name} — ${totalOccupants} ${totalOccupants === 1 ? "person" : "people"}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent + "14" }}
        >
          <ZoneIcon size={16} style={{ color: accent }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="truncate text-sm font-semibold"
              style={{ color: tokens.text }}
            >
              {zone.name}
            </span>
            {zone.isPrivate && (
              <Lock size={11} style={{ color: tokens.textMuted }} />
            )}
          </div>
          <span
            className="text-[11px] capitalize"
            style={{ color: tokens.textMuted }}
          >
            {zone.type.replace("_", " ")}
          </span>
        </div>

        {/* Capacity badge */}
        <div className="flex items-center gap-1.5">
          {zone.capacity != null && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor:
                  totalOccupants >= (zone.capacity ?? Infinity)
                    ? STATUS_COLORS.busy + "15"
                    : accent + "10",
                color:
                  totalOccupants >= (zone.capacity ?? Infinity)
                    ? STATUS_COLORS.busy
                    : accent,
              }}
            >
              {totalOccupants}/{zone.capacity}
            </span>
          )}
          <ArrowRight
            size={14}
            className="opacity-0 transition-opacity group-hover:opacity-60"
            style={{ color: tokens.textMuted }}
          />
        </div>
      </div>

      {/* Occupant avatars row */}
      {totalOccupants > 0 && (
        <div className="flex items-center gap-1">
          {/* User avatars — stacked */}
          <div className="flex -space-x-2">
            {occupants.slice(0, MAX_VISIBLE_AVATARS).map((user) => (
              <UserBubble
                key={user.id}
                user={user}
                onClick={(e) => {
                  e.stopPropagation();
                  onUserClick(user.id);
                }}
              />
            ))}
            {occupantAgents
              .slice(0, Math.max(0, MAX_VISIBLE_AVATARS - occupants.length))
              .map((agent) => (
                <AgentBubble
                  key={agent.id}
                  agent={agent}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserClick(agent.id);
                  }}
                />
              ))}
            {overflow > 0 && <OverflowBubble count={overflow} />}
          </div>

          {/* Names (first two occupants) */}
          <div
            className="ml-1.5 min-w-0 truncate text-[11px]"
            style={{ color: tokens.textSecondary }}
          >
            {occupants
              .slice(0, 2)
              .map((u) => u.name.split(" ")[0])
              .join(", ")}
            {occupants.length > 2 &&
              ` +${totalOccupants - 2} more`}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalOccupants === 0 && (
        <span
          className="text-[11px] italic"
          style={{ color: tokens.textMuted }}
        >
          No one here
        </span>
      )}
    </motion.button>
  );
}

function UserBubble({
  user,
  onClick,
}: {
  readonly user: OfficeUser;
  readonly onClick: (e: React.MouseEvent) => void;
}) {
  const myUserId = useCurrentUserId();
  const isMe = user.id === myUserId;
  const statusColor = STATUS_COLORS[user.status];

  return (
    <button
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white transition-transform hover:z-10 hover:scale-110 dark:ring-gray-900"
      style={{
        background: isMe
          ? "linear-gradient(135deg, #4F46E5, #818CF8)"
          : `linear-gradient(135deg, ${user.appearance.shirtColor}, ${user.appearance.hairColor})`,
      }}
      onClick={onClick}
      title={user.name}
      aria-label={user.name}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span>{user.name.charAt(0).toUpperCase()}</span>
      )}

      {/* Status ring */}
      <span
        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900"
        style={{ backgroundColor: statusColor }}
      />
    </button>
  );
}

function AgentBubble({
  agent,
  onClick,
}: {
  readonly agent: AgentType;
  readonly onClick: (e: React.MouseEvent) => void;
}) {
  const accent = ZONE_ACCENTS.agent_station;
  const isActive =
    agent.status === "working" || agent.status === "thinking";

  return (
    <button
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 ring-white transition-transform hover:z-10 hover:scale-110 dark:ring-gray-900"
      style={{
        background: `linear-gradient(135deg, ${accent}30, ${accent}60)`,
        border: `1.5px solid ${accent}`,
      }}
      onClick={onClick}
      title={agent.name}
      aria-label={agent.name}
    >
      <span>{agent.icon}</span>
      {isActive && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900"
          style={{ backgroundColor: accent }}
        />
      )}
    </button>
  );
}

function OverflowBubble({ count }: { readonly count: number }) {
  const { tokens } = useOfficeTheme();

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-white dark:ring-gray-900"
      style={{
        backgroundColor: tokens.accentSoft,
        color: tokens.accent,
      }}
    >
      +{count}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unassigned entities sidebar
// ---------------------------------------------------------------------------

function UnassignedSection({
  users,
  agents,
  onUserClick,
}: {
  readonly users: readonly OfficeUser[];
  readonly agents: readonly AgentType[];
  readonly onUserClick: (id: string) => void;
}) {
  const { tokens } = useOfficeTheme();

  if (users.length === 0 && agents.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.borderSubtle}`,
        boxShadow: tokens.shadow,
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Users size={14} style={{ color: tokens.textMuted }} />
        <span
          className="text-xs font-semibold"
          style={{ color: tokens.textSecondary }}
        >
          Lobby
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: tokens.accentSoft,
            color: tokens.accent,
          }}
        >
          {users.length + agents.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <button
            key={user.id}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors"
            style={{ backgroundColor: tokens.accentSoft }}
            onClick={() => onUserClick(user.id)}
            aria-label={user.name}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${user.appearance.shirtColor}, ${user.appearance.hairColor})`,
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <span
              className="text-[11px] font-medium"
              style={{ color: tokens.textSecondary }}
            >
              {user.name.split(" ")[0]}
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[user.status] }}
            />
          </button>
        ))}
        {agents.map((agent) => (
          <button
            key={agent.id}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors"
            style={{ backgroundColor: ZONE_ACCENTS.agent_station + "10" }}
            onClick={() => onUserClick(agent.id)}
            aria-label={agent.name}
          >
            <span className="text-sm">{agent.icon}</span>
            <span
              className="text-[11px] font-medium"
              style={{ color: tokens.textSecondary }}
            >
              {agent.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GridOfficeView() {
  const { tokens } = useOfficeTheme();
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const zones = useOfficeStore((s) => s.zones);
  const moveUser = useOfficeStore((s) => s.moveUser);
  const setMyPosition = useOfficeStore((s) => s.setMyPosition);
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const setViewMode = useOfficeStore((s) => s.setViewMode);
  const myUserId = useCurrentUserId();

  // Build zone → occupants map (immutable)
  const zoneOccupants = useMemo(() => {
    const map = new Map<string, { users: OfficeUser[]; agents: AgentType[] }>();
    for (const z of zones) {
      map.set(z.id, { users: [], agents: [] });
    }

    for (const u of users) {
      for (const z of zones) {
        if (
          u.x >= z.x &&
          u.x < z.x + z.width &&
          u.y >= z.y &&
          u.y < z.y + z.height
        ) {
          map.get(z.id)?.users.push(u);
          break;
        }
      }
    }

    for (const a of agents) {
      if (a.status === "offline") continue;
      for (const z of zones) {
        if (
          a.x >= z.x &&
          a.x < z.x + z.width &&
          a.y >= z.y &&
          a.y < z.y + z.height
        ) {
          map.get(z.id)?.agents.push(a);
          break;
        }
      }
    }

    return map;
  }, [users, agents, zones]);

  // Users/agents NOT in any zone
  const unassigned = useMemo(() => {
    const assignedUserIds = new Set<string>();
    const assignedAgentIds = new Set<string>();
    for (const { users: zUsers, agents: zAgents } of zoneOccupants.values()) {
      for (const u of zUsers) assignedUserIds.add(u.id);
      for (const a of zAgents) assignedAgentIds.add(a.id);
    }
    return {
      users: users.filter((u) => !assignedUserIds.has(u.id)),
      agents: agents.filter(
        (a) => a.status !== "offline" && !assignedAgentIds.has(a.id)
      ),
    };
  }, [users, agents, zoneOccupants]);

  // Teleport into zone center and switch to immersive view
  const handleZoneClick = useCallback(
    (zone: OfficeZone) => {
      const centerX = Math.floor(zone.x + zone.width / 2);
      const centerY = Math.floor(zone.y + zone.height / 2);

      moveUser(myUserId, centerX, centerY, "down");
      setMyPosition(centerX, centerY);
      setViewMode("immersive");
    },
    [myUserId, moveUser, setMyPosition, setViewMode]
  );

  const handleUserClick = useCallback(
    (id: string) => {
      // Check if it's a user or agent
      const isUser = users.some((u) => u.id === id);
      setSelectedEntity({
        type: isUser ? "user" : "agent",
        id,
      });
    },
    [users, setSelectedEntity]
  );

  // Group zones by type for nice layout
  const sortedZones = useMemo(
    () =>
      [...zones].sort((a, b) => {
        const typeOrder: Record<ZoneType, number> = {
          meeting: 0,
          desk: 1,
          focus: 2,
          lounge: 3,
          agent_station: 4,
        };
        return (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5);
      }),
    [zones]
  );

  const onlineCount = users.filter((u) => u.status === "online").length;

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      {/* Header */}
      <div className="mx-auto w-full max-w-5xl px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: tokens.text }}
            >
              Office Overview
            </h1>
            <p
              className="text-xs"
              style={{ color: tokens.textMuted }}
            >
              {onlineCount} {onlineCount === 1 ? "person" : "people"} online
              &middot; {zones.length} zones
            </p>
          </div>
        </div>
      </div>

      {/* Zone cards grid */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24">
        <motion.div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
        >
          <AnimatePresence>
            {sortedZones.map((zone) => {
              const occ = zoneOccupants.get(zone.id);
              return (
                <motion.div
                  key={zone.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25, ease: [0.14, 0.9, 0.2, 1] }}
                >
                  <ZoneCard
                    zone={zone}
                    occupants={occ?.users ?? []}
                    occupantAgents={occ?.agents ?? []}
                    onUserClick={handleUserClick}
                    onZoneClick={handleZoneClick}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Lobby — people not in any zone */}
        <div className="mt-4">
          <UnassignedSection
            users={unassigned.users}
            agents={unassigned.agents}
            onUserClick={handleUserClick}
          />
        </div>
      </div>
    </div>
  );
}
