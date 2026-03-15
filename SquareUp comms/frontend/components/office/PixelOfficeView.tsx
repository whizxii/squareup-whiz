"use client";

import { useOfficeStore, OfficeZone, OfficeUser, OfficeAgent } from "@/lib/stores/office-store";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useCallback, useState } from "react";
import { Bot, Volume2 } from "lucide-react";

/* ---------- Canvas constants ---------- */
const GRID_COLS = 13;
const GRID_ROWS = 12;
const TILE = 48; // pixel tile size (retro feel)
const CANVAS_W = GRID_COLS * TILE;
const CANVAS_H = GRID_ROWS * TILE;

/* ---------- Retro color palette ---------- */
const PALETTE = {
  floor1: "#f5efe6",
  floor2: "#ede7db",
  floorDark1: "#2a2520",
  floorDark2: "#312b25",
  grid: "#d4cbb8",
  gridDark: "#3a342e",
  wall: "#c4b99a",
  wallDark: "#4a4238",
  // Zone fills
  desk: "rgba(255, 159, 67, 0.12)",
  deskStroke: "rgba(255, 107, 0, 0.35)",
  meeting: "rgba(34, 197, 94, 0.10)",
  meetingStroke: "rgba(34, 197, 94, 0.35)",
  lounge: "rgba(234, 179, 8, 0.10)",
  loungeStroke: "rgba(234, 179, 8, 0.35)",
  focus: "rgba(99, 102, 241, 0.10)",
  focusStroke: "rgba(99, 102, 241, 0.35)",
  agent_station: "rgba(74, 144, 217, 0.10)",
  agent_stationStroke: "rgba(74, 144, 217, 0.35)",
} as const;

/* ---------- Furniture pixel shapes ---------- */
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8B7355";
  ctx.fillRect(x + 8, y + 14, 32, 20);
  ctx.fillStyle = "#A08060";
  ctx.fillRect(x + 10, y + 16, 28, 16);
  // Monitor
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 16, y + 6, 16, 12);
  ctx.fillStyle = "#6af";
  ctx.fillRect(x + 18, y + 8, 12, 8);
  // Stand
  ctx.fillStyle = "#555";
  ctx.fillRect(x + 22, y + 18, 4, 3);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#d35400";
  ctx.fillRect(x + 16, y + 32, 16, 10);
  ctx.fillRect(x + 20, y + 28, 8, 4);
}

function drawMeetingTable(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + (w * TILE) / 2;
  const cy = y + (h * TILE) / 2;
  ctx.fillStyle = "#6B4226";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * TILE * 0.3, h * TILE * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8B5A2B";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * TILE * 0.25, h * TILE * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Pot
  ctx.fillStyle = "#a0522d";
  ctx.fillRect(x + 18, y + 30, 12, 10);
  ctx.fillRect(x + 16, y + 28, 16, 4);
  // Leaves
  ctx.fillStyle = "#228B22";
  ctx.beginPath();
  ctx.arc(x + 24, y + 22, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 18, y + 18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 30, y + 19, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoffeeTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8B7355";
  ctx.fillRect(x + 12, y + 16, 24, 16);
  ctx.fillStyle = "#A08060";
  ctx.fillRect(x + 14, y + 18, 20, 12);
  // Cup
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 20, y + 20, 8, 8);
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(x + 21, y + 21, 6, 5);
}

function drawHeadphones(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 24, y + 22, 10, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 12, y + 20, 6, 10);
  ctx.fillRect(x + 30, y + 20, 6, 10);
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(x + 12, y + 8, 24, 32);
  ctx.fillStyle = "#34495e";
  ctx.fillRect(x + 14, y + 10, 20, 6);
  ctx.fillRect(x + 14, y + 18, 20, 6);
  ctx.fillRect(x + 14, y + 26, 20, 6);
  // Lights
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(x + 16, y + 12, 3, 2);
  ctx.fillStyle = "#4a90d9";
  ctx.fillRect(x + 16, y + 20, 3, 2);
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(x + 16, y + 28, 3, 2);
}

/* ---------- Canvas rendering ---------- */
function renderCanvas(
  ctx: CanvasRenderingContext2D,
  zones: OfficeZone[],
  isDark: boolean,
) {
  const w = CANVAS_W;
  const h = CANVAS_H;
  ctx.clearRect(0, 0, w, h);

  // Floor — checkerboard
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const isEven = (row + col) % 2 === 0;
      ctx.fillStyle = isDark
        ? (isEven ? PALETTE.floorDark1 : PALETTE.floorDark2)
        : (isEven ? PALETTE.floor1 : PALETTE.floor2);
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }

  // Grid lines
  ctx.strokeStyle = isDark ? PALETTE.gridDark : PALETTE.grid;
  ctx.lineWidth = 0.5;
  for (let col = 0; col <= GRID_COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(col * TILE, 0);
    ctx.lineTo(col * TILE, h);
    ctx.stroke();
  }
  for (let row = 0; row <= GRID_ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * TILE);
    ctx.lineTo(w, row * TILE);
    ctx.stroke();
  }

  // Zone fills + dashed borders
  for (const zone of zones) {
    const zx = zone.x * TILE;
    const zy = zone.y * TILE;
    const zw = zone.width * TILE;
    const zh = zone.height * TILE;

    const fillKey = zone.type as keyof typeof PALETTE;
    const strokeKey = `${zone.type}Stroke` as keyof typeof PALETTE;

    ctx.fillStyle = PALETTE[fillKey] || "rgba(200,200,200,0.08)";
    ctx.fillRect(zx + 2, zy + 2, zw - 4, zh - 4);

    ctx.strokeStyle = PALETTE[strokeKey] || "rgba(150,150,150,0.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(zx + 2, zy + 2, zw - 4, zh - 4);
    ctx.setLineDash([]);

    // Zone label at top-left
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
    ctx.fillText(`${zone.icon} ${zone.name}`, zx + 6, zy + 13);
  }

  // Furniture per zone
  for (const zone of zones) {
    const zx = zone.x * TILE;
    const zy = zone.y * TILE;

    switch (zone.type) {
      case "desk":
        drawDesk(ctx, zx, zy);
        drawChair(ctx, zx, zy);
        break;
      case "meeting":
        drawMeetingTable(ctx, zx, zy, zone.width, zone.height);
        break;
      case "lounge":
        drawCoffeeTable(ctx, zx + TILE, zy);
        drawPlant(ctx, zx, zy);
        break;
      case "focus":
        drawHeadphones(ctx, zx, zy);
        drawPlant(ctx, zx + TILE, zy);
        break;
      case "agent_station":
        drawServerRack(ctx, zx, zy);
        break;
    }
  }

  // Wall border
  ctx.strokeStyle = isDark ? PALETTE.wallDark : PALETTE.wall;
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, w - 2, h - 2);
}

/* ---------- Pixel art character sprite ---------- */
function PixelCharacter({
  x,
  y,
  name,
  color,
  isMe,
  statusEmoji,
  activity,
  statusColor,
  onClick,
}: {
  x: number;
  y: number;
  name: string;
  color: string;
  isMe: boolean;
  statusEmoji?: string;
  activity?: string;
  statusColor: string;
  onClick: () => void;
}) {
  return (
    <div
      className="absolute transition-all duration-300 ease-out cursor-pointer"
      style={{
        left: x * TILE,
        top: y * TILE,
        width: TILE,
        height: TILE,
        imageRendering: "pixelated",
        zIndex: 10 + y,
      }}
      onClick={onClick}
    >
      {/* Activity bubble */}
      {activity && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-card border border-border text-[8px] font-mono text-muted-foreground shadow-sm">
          {statusEmoji} {activity}
        </div>
      )}

      {/* Pixel body — CSS pixel art */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 24, height: 34 }}>
          {/* Head */}
          <div
            className="absolute rounded-sm"
            style={{
              top: 0,
              left: 4,
              width: 16,
              height: 14,
              backgroundColor: "#fcd9b6",
              imageRendering: "pixelated",
            }}
          />
          {/* Hair */}
          <div
            className="absolute rounded-t-sm"
            style={{
              top: -2,
              left: 3,
              width: 18,
              height: 7,
              backgroundColor: color,
              imageRendering: "pixelated",
            }}
          />
          {/* Eyes */}
          <div
            className="absolute"
            style={{ top: 6, left: 7, width: 3, height: 3, backgroundColor: "#333" }}
          />
          <div
            className="absolute"
            style={{ top: 6, left: 14, width: 3, height: 3, backgroundColor: "#333" }}
          />
          {/* Body */}
          <div
            className="absolute"
            style={{
              top: 14,
              left: 2,
              width: 20,
              height: 12,
              backgroundColor: color,
              imageRendering: "pixelated",
            }}
          />
          {/* Legs */}
          <div
            className="absolute"
            style={{ top: 26, left: 4, width: 7, height: 8, backgroundColor: "#4a5568" }}
          />
          <div
            className="absolute"
            style={{ top: 26, left: 13, width: 7, height: 8, backgroundColor: "#4a5568" }}
          />
        </div>
      </div>

      {/* Status dot */}
      <div
        className={cn(
          "absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-card",
          statusColor,
        )}
      />

      {/* Me glow ring */}
      {isMe && (
        <div className="absolute inset-1 rounded border-2 border-sq-orange/50 office-pulse-me pointer-events-none" />
      )}

      {/* Name */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold whitespace-nowrap",
          isMe ? "text-sq-orange" : "text-foreground/80",
        )}
        style={{ top: TILE + 2 }}
      >
        {isMe ? "You" : name}
      </div>
    </div>
  );
}

/* ---------- Pixel art agent sprite ---------- */
function PixelAgent({
  agent,
  isNearMe,
  onClick,
}: {
  agent: OfficeAgent;
  isNearMe: boolean;
  onClick: () => void;
}) {
  const isActive = agent.status === "working" || agent.status === "thinking";

  return (
    <div
      className={cn(
        "absolute transition-all duration-300 ease-out cursor-pointer",
        isNearMe && "scale-110",
      )}
      style={{
        left: agent.x * TILE,
        top: agent.y * TILE,
        width: TILE,
        height: TILE,
        imageRendering: "pixelated",
        zIndex: 10 + agent.y,
      }}
      onClick={onClick}
    >
      {/* Task bubble */}
      {agent.currentTask && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-sq-agent/10 border border-sq-agent/20 text-[8px] font-mono text-sq-agent shadow-sm">
          {agent.currentTask}
        </div>
      )}

      {/* Robot body — CSS pixel art */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 24, height: 32 }}>
          {/* Antenna */}
          <div
            className="absolute"
            style={{ top: -4, left: 10, width: 4, height: 6, backgroundColor: "#4a90d9" }}
          />
          <div
            className={cn(
              "absolute rounded-full",
              isActive ? "animate-pulse" : "",
            )}
            style={{ top: -7, left: 9, width: 6, height: 4, backgroundColor: isActive ? "#ff6b00" : "#4a90d9" }}
          />
          {/* Head */}
          <div
            className="absolute"
            style={{
              top: 2,
              left: 2,
              width: 20,
              height: 14,
              backgroundColor: "#4a90d9",
              borderRadius: 3,
            }}
          />
          {/* Eyes (LED) */}
          <div
            className="absolute"
            style={{ top: 7, left: 5, width: 4, height: 4, backgroundColor: "#fff", borderRadius: 1 }}
          />
          <div
            className="absolute"
            style={{ top: 7, left: 15, width: 4, height: 4, backgroundColor: "#fff", borderRadius: 1 }}
          />
          {/* Eye pupils */}
          <div
            className="absolute"
            style={{ top: 8, left: 6, width: 2, height: 2, backgroundColor: "#1a365d" }}
          />
          <div
            className="absolute"
            style={{ top: 8, left: 16, width: 2, height: 2, backgroundColor: "#1a365d" }}
          />
          {/* Body */}
          <div
            className="absolute"
            style={{
              top: 16,
              left: 3,
              width: 18,
              height: 10,
              backgroundColor: "#3a7ac8",
              borderRadius: 2,
            }}
          />
          {/* Chest icon */}
          <div className="absolute text-[8px]" style={{ top: 17, left: 7 }}>
            {agent.icon}
          </div>
          {/* Legs */}
          <div
            className="absolute"
            style={{ top: 26, left: 5, width: 5, height: 6, backgroundColor: "#2c5282" }}
          />
          <div
            className="absolute"
            style={{ top: 26, left: 14, width: 5, height: 6, backgroundColor: "#2c5282" }}
          />
        </div>
      </div>

      {/* Glow ring when near */}
      {isNearMe && (
        <div className="absolute inset-0 rounded border-2 border-sq-agent/50 shadow-agent-glow pointer-events-none" />
      )}

      {/* Active glow */}
      {isActive && (
        <div className="absolute inset-0 rounded office-agent-glow pointer-events-none" />
      )}

      {/* Name */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-sq-agent whitespace-nowrap"
        style={{ top: TILE + 2 }}
      >
        {agent.name.replace("@", "")}
      </div>
    </div>
  );
}

/* ---------- Pixel MiniMap ---------- */
const MINIMAP_W = 130;
const MINIMAP_H = 110;

function PixelMiniMap({
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

  return (
    <div
      className="absolute bottom-4 right-4 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-md overflow-hidden z-20"
      style={{ width: MINIMAP_W, height: MINIMAP_H, imageRendering: "pixelated" }}
    >
      {/* Zone rectangles */}
      {zones.map((z) => (
        <div
          key={z.id}
          className="absolute rounded-[2px] opacity-50 bg-muted"
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
          className="absolute w-2 h-2 bg-sq-agent"
          style={{
            left: a.x * scaleX + scaleX / 2 - 4,
            top: a.y * scaleY + scaleY / 2 - 4,
          }}
        />
      ))}

      {/* User dots */}
      {users.map((u) => {
        const isMe = u.id === myId;
        return (
          <div
            key={u.id}
            className={cn(
              "absolute w-2.5 h-2.5",
              isMe ? "bg-sq-orange office-minimap-pulse" : "bg-sq-orange-light",
            )}
            style={{
              left: u.x * scaleX + scaleX / 2 - 5,
              top: u.y * scaleY + scaleY / 2 - 5,
            }}
          />
        );
      })}

      <span className="absolute bottom-0.5 right-1 text-[7px] font-mono text-muted-foreground/60 select-none">
        map
      </span>
    </div>
  );
}

/* ---------- Status color mapping ---------- */
const statusColorMap: Record<string, string> = {
  online: "bg-sq-online",
  away: "bg-sq-away",
  busy: "bg-sq-busy",
  dnd: "bg-sq-busy",
};

const agentStatusColorMap: Record<string, string> = {
  idle: "bg-sq-online",
  thinking: "bg-sq-away animate-pulse",
  working: "bg-sq-away animate-pulse",
  error: "bg-sq-busy",
  offline: "bg-gray-400",
};

/* Hair / shirt color by user index */
const AVATAR_COLORS = ["#e74c3c", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c", "#e67e22"];

/* =================================================================
   Main PixelOfficeView Component
   ================================================================= */
export function PixelOfficeView() {
  const { users, agents, zones, myPosition, setMyPosition, moveUser, selectedEntity, setSelectedEntity } =
    useOfficeStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const check = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, zones, isDark);
  }, [zones, isDark]);

  // Keyboard movement
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { x, y } = myPosition;
      let nx = x;
      let ny = y;

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
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE);
    const row = Math.floor((e.clientY - rect.top) / TILE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      setMyPosition(col, row);
      moveUser("dev-user-001", col, row);
    }
  };

  // Proximity check
  const isNearby = (ax: number, ay: number, bx: number, by: number) =>
    Math.abs(ax - bx) <= 2 && Math.abs(ay - by) <= 2;

  return (
    <div className="flex h-full flex-col">
      {/* Instruction banner */}
      <div className="text-center text-xs text-muted-foreground font-mono mb-2">
        <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">WASD</kbd>{" / "}
        <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Arrows</kbd>{" "}
        to move &middot; Click to teleport &middot; Walk near agents to interact
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Pixel canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
          <div
            className="relative rounded-lg border-2 border-border shadow-lg overflow-hidden"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              imageRendering: "pixelated",
            }}
            onClick={handleCanvasClick}
          >
            {/* Background canvas */}
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="absolute inset-0"
              style={{ imageRendering: "pixelated" }}
            />

            {/* HTML overlay: characters + agents */}
            {users.map((user, idx) => (
              <PixelCharacter
                key={user.id}
                x={user.x}
                y={user.y}
                name={user.name}
                color={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                isMe={user.id === "dev-user-001"}
                statusEmoji={user.statusEmoji}
                activity={user.activity}
                statusColor={statusColorMap[user.status] || "bg-sq-online"}
                onClick={() => setSelectedEntity({ type: "user", id: user.id })}
              />
            ))}

            {agents.map((agent) => (
              <PixelAgent
                key={agent.id}
                agent={agent}
                isNearMe={isNearby(myPosition.x, myPosition.y, agent.x, agent.y)}
                onClick={() => setSelectedEntity({ type: "agent", id: agent.id })}
              />
            ))}
          </div>

          {/* Mini-map */}
          <PixelMiniMap
            users={users}
            agents={agents}
            zones={zones}
            myId="dev-user-001"
          />
        </div>

        {/* Side panel */}
        {selectedEntity && (
          <aside className="w-72 border-l border-border bg-card p-4 space-y-4 animate-slide-in-right shrink-0 overflow-y-auto">
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-mono"
            >
              &larr; Close
            </button>
            {selectedEntity.type === "user" ? (
              <PixelUserDetail user={users.find((u) => u.id === selectedEntity.id)} />
            ) : (
              <PixelAgentDetail agent={agents.find((a) => a.id === selectedEntity.id)} />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---------- Side panel details (pixel style) ---------- */
function PixelUserDetail({ user }: { user?: OfficeUser }) {
  if (!user) return null;
  return (
    <div className="space-y-3">
      <div className="w-16 h-16 bg-gradient-brand rounded-lg flex items-center justify-center mx-auto" style={{ imageRendering: "pixelated" }}>
        <span className="text-white font-mono font-bold text-2xl">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <h3 className="text-center font-mono font-bold">{user.name}</h3>
      <div className="flex items-center justify-center gap-2 text-sm font-mono">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            statusColorMap[user.status] || "bg-sq-online",
          )}
        />
        <span className="capitalize text-muted-foreground">{user.status}</span>
      </div>
      {user.activity && (
        <p className="text-center text-xs text-muted-foreground font-mono">
          {user.statusEmoji} {user.activity}
        </p>
      )}
      <div className="pt-2 space-y-2">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-mono font-medium hover:bg-primary/90 transition-colors">
          <Volume2 className="w-4 h-4" />
          Start talking
        </button>
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-mono hover:bg-accent transition-colors">
          Send message
        </button>
      </div>
    </div>
  );
}

function PixelAgentDetail({ agent }: { agent?: OfficeAgent }) {
  if (!agent) return null;
  return (
    <div className="space-y-3">
      <div className="w-16 h-16 rounded-lg bg-sq-agent/10 flex items-center justify-center mx-auto ring-1 ring-sq-agent/20" style={{ imageRendering: "pixelated" }}>
        <span className="text-3xl">{agent.icon}</span>
      </div>
      <h3 className="text-center font-mono font-bold">{agent.name}</h3>
      <div className="flex items-center justify-center gap-2 text-sm font-mono">
        <div className={cn("w-2 h-2 rounded-full", agentStatusColorMap[agent.status] || "bg-sq-online")} />
        <span className="capitalize text-muted-foreground">{agent.status}</span>
      </div>
      {agent.currentTask && (
        <p className="text-center text-xs text-sq-agent font-mono">{agent.currentTask}</p>
      )}
      <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sq-agent text-white text-sm font-mono font-medium hover:bg-sq-agent/90 transition-colors">
        <Bot className="w-4 h-4" />
        Chat with agent
      </button>
    </div>
  );
}
