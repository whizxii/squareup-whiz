/**
 * Accessible list view — toggled with "L" key.
 * Presents the entire office as a semantic, keyboard-navigable list
 * organized by zone, with all actions available.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Bot, MapPin, Lock, Search } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import type { OfficeUser, OfficeAgent, OfficeZone } from "@/lib/stores/office-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUsersInZone(users: readonly OfficeUser[], zone: OfficeZone): OfficeUser[] {
  return users.filter(
    (u) =>
      u.x >= zone.x &&
      u.x < zone.x + zone.width &&
      u.y >= zone.y &&
      u.y < zone.y + zone.height
  );
}

function getAgentsInZone(agents: readonly OfficeAgent[], zone: OfficeZone): OfficeAgent[] {
  return agents.filter(
    (a) =>
      a.status !== "offline" &&
      a.x >= zone.x &&
      a.x < zone.x + zone.width &&
      a.y >= zone.y &&
      a.y < zone.y + zone.height
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    online: "Online",
    busy: "Busy",
    away: "Away",
    dnd: "Do Not Disturb",
    offline: "Offline",
    idle: "Idle",
    thinking: "Thinking",
    working: "Working",
    error: "Error",
  };
  return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// Zone section
// ---------------------------------------------------------------------------

function ZoneSection({
  zone,
  users,
  agents,
  onSelectEntity,
}: {
  readonly zone: OfficeZone;
  readonly users: readonly OfficeUser[];
  readonly agents: readonly OfficeAgent[];
  readonly onSelectEntity: (type: "user" | "agent", id: string) => void;
}) {
  const zoneUsers = getUsersInZone(users, zone);
  const zoneAgents = getAgentsInZone(agents, zone);
  const occupantCount = zoneUsers.length + zoneAgents.length;

  return (
    <div className="mb-3" role="group" aria-label={`${zone.name} zone`}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm">{zone.icon}</span>
        <h3 className="text-xs font-semibold text-white/80">{zone.name}</h3>
        <span className="text-[10px] text-white/40">
          {occupantCount}/{zone.capacity ?? "∞"}
        </span>
        {zone.isPrivate && <Lock size={10} className="text-white/30" />}
      </div>

      {occupantCount === 0 && (
        <p className="pl-6 text-[10px] text-white/25 italic">Empty</p>
      )}

      <ul className="space-y-0.5 pl-2" role="list">
        {zoneUsers.map((user) => (
          <li key={user.id}>
            <button
              onClick={() => onSelectEntity("user", user.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50"
              aria-label={`${user.name}, ${statusLabel(user.status)}`}
            >
              <Users size={12} className="text-[#FF6B00]" />
              <span className="flex-1 text-xs text-white/70">{user.name}</span>
              <span className="text-[10px] text-white/40">
                {statusLabel(user.status)}
              </span>
              {user.statusEmoji && (
                <span className="text-xs">{user.statusEmoji}</span>
              )}
            </button>
          </li>
        ))}

        {zoneAgents.map((agent) => (
          <li key={agent.id}>
            <button
              onClick={() => onSelectEntity("agent", agent.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50"
              aria-label={`${agent.name} agent, ${statusLabel(agent.status)}${agent.currentTask ? `, working on ${agent.currentTask}` : ""}`}
            >
              <Bot size={12} className="text-[#4a90d9]" />
              <span className="flex-1 text-xs text-white/70">
                {agent.icon} {agent.name}
              </span>
              <span className="text-[10px] text-white/40">
                {statusLabel(agent.status)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unzoned entities
// ---------------------------------------------------------------------------

function UnzonedSection({
  users,
  agents,
  zones,
  onSelectEntity,
}: {
  readonly users: readonly OfficeUser[];
  readonly agents: readonly OfficeAgent[];
  readonly zones: readonly OfficeZone[];
  readonly onSelectEntity: (type: "user" | "agent", id: string) => void;
}) {
  const zonedUserIds = new Set(
    zones.flatMap((z) => getUsersInZone(users, z).map((u) => u.id))
  );
  const zonedAgentIds = new Set(
    zones.flatMap((z) => getAgentsInZone(agents, z).map((a) => a.id))
  );

  const freeUsers = users.filter((u) => !zonedUserIds.has(u.id));
  const freeAgents = agents.filter(
    (a) => a.status !== "offline" && !zonedAgentIds.has(a.id)
  );

  if (freeUsers.length === 0 && freeAgents.length === 0) return null;

  return (
    <div className="mb-3" role="group" aria-label="Open area">
      <div className="mb-1.5 flex items-center gap-2">
        <MapPin size={12} className="text-white/40" />
        <h3 className="text-xs font-semibold text-white/60">Open Area</h3>
      </div>
      <ul className="space-y-0.5 pl-2" role="list">
        {freeUsers.map((user) => (
          <li key={user.id}>
            <button
              onClick={() => onSelectEntity("user", user.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50"
              aria-label={`${user.name}, ${statusLabel(user.status)}`}
            >
              <Users size={12} className="text-[#FF6B00]" />
              <span className="flex-1 text-xs text-white/70">{user.name}</span>
              <span className="text-[10px] text-white/40">
                {statusLabel(user.status)}
              </span>
            </button>
          </li>
        ))}
        {freeAgents.map((agent) => (
          <li key={agent.id}>
            <button
              onClick={() => onSelectEntity("agent", agent.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50"
              aria-label={`${agent.name} agent, ${statusLabel(agent.status)}`}
            >
              <Bot size={12} className="text-[#4a90d9]" />
              <span className="flex-1 text-xs text-white/70">
                {agent.icon} {agent.name}
              </span>
              <span className="text-[10px] text-white/40">
                {statusLabel(agent.status)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OfficeListView() {
  const [open, setOpen] = useState(false);

  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const zones = useOfficeStore((s) => s.zones);
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "l" || e.key === "L") {
        if (e.ctrlKey || e.metaKey) return;
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelectEntity = useCallback(
    (type: "user" | "agent", id: string) => {
      setSelectedEntity({ type, id });
    },
    [setSelectedEntity]
  );

  const [search, setSearch] = useState("");
  const q = search.toLowerCase().trim();

  const filteredUsers = q === "" ? users : users.filter((u) => {
    if (u.name.toLowerCase().includes(q)) return true;
    return zones.some(
      (z) =>
        z.name.toLowerCase().includes(q) &&
        u.x >= z.x && u.x < z.x + z.width &&
        u.y >= z.y && u.y < z.y + z.height
    );
  });

  const filteredAgents = q === "" ? agents : agents.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    return zones.some(
      (z) =>
        z.name.toLowerCase().includes(q) &&
        a.x >= z.x && a.x < z.x + z.width &&
        a.y >= z.y && a.y < z.y + z.height
    );
  });

  const visibleZones = q === ""
    ? zones
    : zones.filter((zone) => {
        if (zone.name.toLowerCase().includes(q)) return true;
        const hasUsers = filteredUsers.some(
          (u) => u.x >= zone.x && u.x < zone.x + zone.width && u.y >= zone.y && u.y < zone.y + zone.height
        );
        const hasAgents = filteredAgents.some(
          (a) => a.x >= zone.x && a.x < zone.x + zone.width && a.y >= zone.y && a.y < zone.y + zone.height
        );
        return hasUsers || hasAgents;
      });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[70vh] w-[360px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-white/15 shadow-2xl"
            style={{
              backgroundColor: "rgba(30, 25, 20, 0.92)",
              backdropFilter: "blur(24px) saturate(180%)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            role="dialog"
            aria-label="Office list view"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-white/90">
                Office Directory
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50"
                aria-label="Close list view"
              >
                <X size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="shrink-0 border-b border-white/10 px-4 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/6 px-2.5 py-1.5">
                <Search size={12} className="shrink-0 text-white/30" />
                <input
                  type="text"
                  placeholder="Search by name or zone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/25 focus:outline-none"
                  aria-label="Search office directory"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-white/30 hover:text-white/60"
                    aria-label="Clear search"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-4 py-3">
              {visibleZones.map((zone) => (
                <ZoneSection
                  key={zone.id}
                  zone={zone}
                  users={filteredUsers}
                  agents={filteredAgents}
                  onSelectEntity={handleSelectEntity}
                />
              ))}

              <UnzonedSection
                users={filteredUsers}
                agents={filteredAgents}
                zones={zones}
                onSelectEntity={handleSelectEntity}
              />

              {filteredUsers.length === 0 &&
                filteredAgents.filter((a) => a.status !== "offline").length === 0 && (
                  <p className="py-8 text-center text-xs text-white/30">
                    {q ? "No results found." : "Your office is quiet. Invite your team!"}
                  </p>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
