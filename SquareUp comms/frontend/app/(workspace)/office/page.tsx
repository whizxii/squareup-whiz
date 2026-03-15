"use client";

import { useOfficeStore, OfficeZone, OfficeUser, OfficeAgent } from "@/lib/stores/office-store";
import { PixelOfficeView } from "@/components/office/PixelOfficeView";
import { cn } from "@/lib/utils";
import { useEffect, useCallback, useState } from "react";
import { Bot, Volume2, Grid3X3, Gamepad2 } from "lucide-react";

/* ---------- Grid constants ---------- */
const GRID_COLS = 13;
const GRID_ROWS = 12;
const CELL_SIZE_DEFAULT = 64; // px on desktop
const CELL_SIZE_SMALL = 48;  // px on smaller screens

/** Hook that picks a responsive cell size based on window width. */
function useCellSize() {
  const [cellSize, setCellSize] = useState(CELL_SIZE_DEFAULT);

  useEffect(() => {
    const update = () => {
      setCellSize(window.innerWidth < 900 ? CELL_SIZE_SMALL : CELL_SIZE_DEFAULT);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return cellSize;
}

/* ---------- Status helpers ---------- */
const statusRing: Record<string, string> = {
  online: "ring-sq-online",
  away: "ring-sq-away",
  busy: "ring-sq-busy",
  dnd: "ring-sq-busy",
};

const agentStatusColor: Record<string, string> = {
  idle: "bg-sq-online",
  thinking: "bg-sq-away animate-pulse",
  working: "bg-sq-away animate-pulse",
  error: "bg-sq-busy",
  offline: "bg-gray-400",
};

/* =================================================================
   Main Page
   ================================================================= */
export default function OfficePage() {
  const { users, agents, zones, myPosition, setMyPosition, moveUser, selectedEntity, setSelectedEntity } =
    useOfficeStore();

  const cellSize = useCellSize();
  const [viewMode, setViewMode] = useState<"grid" | "pixel">("grid");

  // Keyboard movement
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { x, y } = myPosition;
      let nx = x,
        ny = y;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          ny = Math.max(0, y - 1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          ny = Math.min(GRID_ROWS - 1, y + 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          nx = Math.max(0, x - 1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          nx = Math.min(GRID_COLS - 1, x + 1);
          break;
        default:
          return;
      }
      e.preventDefault();
      setMyPosition(nx, ny);
      moveUser("dev-user-001", nx, ny);
    },
    [myPosition, setMyPosition, moveUser],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Click to teleport
  const handleCellClick = (col: number, row: number) => {
    setMyPosition(col, row);
    moveUser("dev-user-001", col, row);
  };

  // Proximity check (within 2 cells)
  const isNearby = (ax: number, ay: number, bx: number, by: number) =>
    Math.abs(ax - bx) <= 2 && Math.abs(ay - by) <= 2;

  const isPixelMode = viewMode === "pixel";
  const isGridMode = viewMode === "grid";

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: instructions (grid only) + view toggle */}
      <div className="flex items-center justify-center gap-4 py-1.5">
        {isGridMode && (
          <div className="text-sm text-muted-foreground">
            Use <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono">WASD</kbd> or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono">Arrow keys</kbd> to
            move &middot; Click to teleport
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              isGridMode
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => setViewMode("pixel")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              isPixelMode
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Pixel
          </button>
        </div>
      </div>

      {/* Pixel mode */}
      {isPixelMode && <PixelOfficeView />}

      {/* Grid mode */}
      {isGridMode && <div className="flex flex-1 min-h-0">
        {/* Office Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
          <div className="relative bg-sq-bg dark:bg-[#1a1a1a] rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Grid */}
            <div
              className="relative"
              style={{
                width: GRID_COLS * cellSize,
                height: GRID_ROWS * cellSize,
              }}
            >
              {/* Floor grid lines */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(90deg, currentColor 1px, transparent 1px),
                    linear-gradient(currentColor 1px, transparent 1px)
                  `,
                  backgroundSize: `${cellSize}px ${cellSize}px`,
                }}
              />

              {/* Zones */}
              {zones.map((zone) => (
                <ZoneElement key={zone.id} zone={zone} cellSize={cellSize} />
              ))}

              {/* Click targets */}
              {Array.from({ length: GRID_ROWS }).map((_, row) =>
                Array.from({ length: GRID_COLS }).map((_, col) => (
                  <div
                    key={`${col}-${row}`}
                    className="absolute cursor-pointer hover:bg-primary/5 transition-colors"
                    style={{
                      left: col * cellSize,
                      top: row * cellSize,
                      width: cellSize,
                      height: cellSize,
                    }}
                    onClick={() => handleCellClick(col, row)}
                  />
                )),
              )}

              {/* Agent avatars */}
              {agents.map((agent) => (
                <AgentAvatar
                  key={agent.id}
                  agent={agent}
                  cellSize={cellSize}
                  isNearMe={isNearby(myPosition.x, myPosition.y, agent.x, agent.y)}
                  onClick={() => setSelectedEntity({ type: "agent", id: agent.id })}
                />
              ))}

              {/* User avatars */}
              {users.map((user) => (
                <UserAvatar
                  key={user.id}
                  user={user}
                  cellSize={cellSize}
                  isMe={user.id === "dev-user-001"}
                  onClick={() => setSelectedEntity({ type: "user", id: user.id })}
                />
              ))}
            </div>
          </div>

          {/* Mini-map */}
          <MiniMap
            users={users}
            agents={agents}
            zones={zones}
            myId="dev-user-001"
          />
        </div>

        {/* Side panel - entity details */}
        {selectedEntity && (
          <aside className="w-72 border-l border-border bg-card p-4 space-y-4 animate-slide-in-right shrink-0 overflow-y-auto">
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
            {selectedEntity.type === "user" ? (
              <UserDetail user={users.find((u) => u.id === selectedEntity.id)} />
            ) : (
              <AgentDetail agent={agents.find((a) => a.id === selectedEntity.id)} />
            )}
          </aside>
        )}
      </div>}
    </div>
  );
}

/* =================================================================
   Zone Element
   ================================================================= */
function ZoneElement({ zone, cellSize }: { zone: OfficeZone; cellSize: number }) {
  return (
    <div
      className={cn(
        "absolute rounded-xl border border-border/50 flex flex-col items-center justify-center gap-1 transition-colors",
        zone.color,
      )}
      style={{
        left: zone.x * cellSize + 4,
        top: zone.y * cellSize + 4,
        width: zone.width * cellSize - 8,
        height: zone.height * cellSize - 8,
      }}
    >
      <span className="text-lg">{zone.icon}</span>
      <span className="text-[10px] font-medium text-muted-foreground">{zone.name}</span>
    </div>
  );
}

/* =================================================================
   User Avatar (with photo circle or gradient letter)
   ================================================================= */
function UserAvatar({
  user,
  cellSize,
  isMe,
  onClick,
}: {
  user: OfficeUser;
  cellSize: number;
  isMe: boolean;
  onClick: () => void;
}) {
  const size = 44;
  return (
    <div
      className="absolute transition-all duration-300 ease-out cursor-pointer z-10"
      style={{
        left: user.x * cellSize + (cellSize - size) / 2,
        top: user.y * cellSize + (cellSize - size) / 2,
      }}
      onClick={onClick}
    >
      {/* Activity bubble */}
      {user.activity && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-card border border-border text-[9px] text-muted-foreground shadow-sm">
          {user.statusEmoji} {user.activity}
        </div>
      )}

      {/* Avatar circle */}
      {user.avatar ? (
        /* Photo avatar */
        <img
          src={user.avatar}
          alt={user.name}
          className={cn(
            "rounded-full object-cover ring-2 shadow-md",
            isMe
              ? "ring-sq-orange/60 shadow-brand-glow office-pulse-me"
              : statusRing[user.status],
          )}
          style={{ width: size, height: size }}
        />
      ) : (
        /* Letter avatar with gradient background */
        <div
          className={cn(
            "rounded-full flex items-center justify-center ring-2 shadow-md transition-shadow",
            isMe
              ? "bg-gradient-brand ring-sq-orange/60 shadow-brand-glow office-pulse-me"
              : "bg-gradient-brand",
            statusRing[user.status],
          )}
          style={{ width: size, height: size }}
        >
          <span className="text-white font-bold text-sm select-none">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Name / "You" label */}
      <p
        className={cn(
          "text-center text-[10px] font-medium mt-1",
          isMe ? "text-sq-orange font-bold" : "text-foreground",
        )}
      >
        {isMe ? "You" : user.name}
      </p>
    </div>
  );
}

/* =================================================================
   Agent Avatar (with blue glow when working/thinking)
   ================================================================= */
function AgentAvatar({
  agent,
  cellSize,
  isNearMe,
  onClick,
}: {
  agent: OfficeAgent;
  cellSize: number;
  isNearMe: boolean;
  onClick: () => void;
}) {
  const size = 40;
  const isActive = agent.status === "working" || agent.status === "thinking";

  return (
    <div
      className={cn(
        "absolute transition-all duration-300 ease-out cursor-pointer z-10",
        isNearMe && "scale-110",
      )}
      style={{
        left: agent.x * cellSize + (cellSize - size) / 2,
        top: agent.y * cellSize + (cellSize - size) / 2,
      }}
      onClick={onClick}
    >
      {/* Task bubble */}
      {agent.currentTask && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-sq-agent/10 border border-sq-agent/20 text-[9px] text-sq-agent shadow-sm">
          {agent.currentTask}
        </div>
      )}

      {/* Avatar with optional blue glow */}
      <div
        className={cn(
          "rounded-xl flex items-center justify-center ring-2 ring-sq-agent/30 bg-sq-agent/10 shadow-sm transition-shadow",
          isNearMe && "shadow-agent-glow ring-sq-agent/60",
          isActive && "office-agent-glow",
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-lg">{agent.icon}</span>
      </div>

      {/* Status dot */}
      <div
        className={cn(
          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
          agentStatusColor[agent.status],
        )}
      />

      {/* Name */}
      <p className="text-center text-[9px] font-medium mt-0.5 text-sq-agent truncate max-w-[60px]">
        {agent.name.replace("@", "")}
      </p>
    </div>
  );
}

/* =================================================================
   Mini-map (bottom-right corner)
   ================================================================= */
const MINIMAP_W = 130;
const MINIMAP_H = 120;

function MiniMap({
  users,
  agents,
  zones,
  myId,
}: {
  users: OfficeUser[];
  agents: OfficeAgent[];
  zones: OfficeZone[];
  myId: string;
}) {
  const scaleX = MINIMAP_W / GRID_COLS;
  const scaleY = MINIMAP_H / GRID_ROWS;

  // Zone color on minimap (simplified)
  const zoneMinimapColor: Record<string, string> = {
    "bg-orange-50/80 dark:bg-orange-950/30": "bg-orange-200 dark:bg-orange-900/40",
    "bg-blue-50/80 dark:bg-blue-950/30": "bg-blue-200 dark:bg-blue-900/40",
    "bg-purple-50/80 dark:bg-purple-950/30": "bg-purple-200 dark:bg-purple-900/40",
    "bg-green-50/80 dark:bg-green-950/30": "bg-green-200 dark:bg-green-900/40",
    "bg-yellow-50/80 dark:bg-yellow-950/30": "bg-yellow-200 dark:bg-yellow-900/40",
    "bg-indigo-50/80 dark:bg-indigo-950/30": "bg-indigo-200 dark:bg-indigo-900/40",
    "bg-cyan-50/80 dark:bg-cyan-950/30": "bg-cyan-200 dark:bg-cyan-900/40",
    "bg-rose-50/80 dark:bg-rose-950/30": "bg-rose-200 dark:bg-rose-900/40",
  };

  return (
    <div
      className="absolute bottom-4 right-4 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-md overflow-hidden z-20"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
    >
      {/* Zone rectangles */}
      {zones.map((z) => (
        <div
          key={z.id}
          className={cn(
            "absolute rounded-[2px] opacity-60",
            zoneMinimapColor[z.color] ?? "bg-muted",
          )}
          style={{
            left: z.x * scaleX,
            top: z.y * scaleY,
            width: z.width * scaleX,
            height: z.height * scaleY,
          }}
        />
      ))}

      {/* Agent dots (blue) */}
      {agents.map((a) => (
        <div
          key={a.id}
          className="absolute w-2 h-2 rounded-full bg-sq-agent"
          style={{
            left: a.x * scaleX + scaleX / 2 - 4,
            top: a.y * scaleY + scaleY / 2 - 4,
          }}
        />
      ))}

      {/* User dots (orange), "me" has pulse glow */}
      {users.map((u) => {
        const isMe = u.id === myId;
        return (
          <div
            key={u.id}
            className={cn(
              "absolute w-2.5 h-2.5 rounded-full",
              isMe
                ? "bg-sq-orange office-minimap-pulse"
                : "bg-sq-orange-light",
            )}
            style={{
              left: u.x * scaleX + scaleX / 2 - 5,
              top: u.y * scaleY + scaleY / 2 - 5,
            }}
          />
        );
      })}

      {/* Label */}
      <span className="absolute bottom-0.5 right-1 text-[7px] text-muted-foreground/60 select-none">
        mini-map
      </span>
    </div>
  );
}

/* =================================================================
   Side-panel detail views
   ================================================================= */
function UserDetail({ user }: { user?: OfficeUser }) {
  if (!user) return null;
  return (
    <div className="space-y-3">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover ring-2 ring-border mx-auto"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mx-auto">
          <span className="text-white font-bold text-2xl">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <h3 className="text-center font-display font-bold">{user.name}</h3>
      <div className="flex items-center justify-center gap-2 text-sm">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            user.status === "online" ? "bg-sq-online" : "bg-sq-away",
          )}
        />
        <span className="capitalize text-muted-foreground">{user.status}</span>
      </div>
      {user.activity && (
        <p className="text-center text-xs text-muted-foreground">
          {user.statusEmoji} {user.activity}
        </p>
      )}
      <div className="pt-2 space-y-2">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Volume2 className="w-4 h-4" />
          Start talking
        </button>
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
          Send message
        </button>
      </div>
    </div>
  );
}

function AgentDetail({ agent }: { agent?: OfficeAgent }) {
  if (!agent) return null;
  return (
    <div className="space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-sq-agent/10 flex items-center justify-center mx-auto ring-1 ring-sq-agent/20">
        <span className="text-3xl">{agent.icon}</span>
      </div>
      <h3 className="text-center font-display font-bold">{agent.name}</h3>
      <div className="flex items-center justify-center gap-2 text-sm">
        <div className={cn("w-2 h-2 rounded-full", agentStatusColor[agent.status])} />
        <span className="capitalize text-muted-foreground">{agent.status}</span>
      </div>
      {agent.currentTask && (
        <p className="text-center text-xs text-sq-agent">{agent.currentTask}</p>
      )}
      <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors">
        <Bot className="w-4 h-4" />
        Chat with agent
      </button>
    </div>
  );
}
