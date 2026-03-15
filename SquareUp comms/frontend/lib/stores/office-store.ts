import { create } from "zustand";

export type UserStatus = "online" | "away" | "busy" | "dnd";

export interface OfficeUser {
  id: string;
  name: string;
  avatar?: string;
  status: UserStatus;
  statusMessage?: string;
  statusEmoji?: string;
  x: number;
  y: number;
  activity?: string; // "Writing code" / "In a call" / "AFK"
}

export interface OfficeAgent {
  id: string;
  name: string;
  icon: string;
  status: "idle" | "thinking" | "working" | "error" | "offline";
  currentTask?: string;
  x: number;
  y: number;
}

export interface OfficeZone {
  id: string;
  name: string;
  type: "desk" | "meeting" | "lounge" | "focus" | "agent_station";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
}

interface OfficeState {
  users: OfficeUser[];
  agents: OfficeAgent[];
  zones: OfficeZone[];
  myPosition: { x: number; y: number };
  selectedEntity: { type: "user" | "agent"; id: string } | null;

  setUsers: (users: OfficeUser[]) => void;
  setAgents: (agents: OfficeAgent[]) => void;
  moveUser: (userId: string, x: number, y: number) => void;
  setMyPosition: (x: number, y: number) => void;
  setSelectedEntity: (entity: { type: "user" | "agent"; id: string } | null) => void;
  updateUserStatus: (userId: string, status: UserStatus, message?: string) => void;
  updateAgentStatus: (agentId: string, status: OfficeAgent["status"], task?: string) => void;
}

// Pre-defined office zones with visually distinct colors
const DEFAULT_ZONES: OfficeZone[] = [
  { id: "desk-1", name: "Kunj's Desk",            type: "desk",          x: 2,  y: 2, width: 2, height: 2, color: "bg-orange-50/80 dark:bg-orange-950/30", icon: "\u{1F4BB}" },
  { id: "desk-2", name: "Arjun's Desk",            type: "desk",          x: 5,  y: 2, width: 2, height: 2, color: "bg-blue-50/80 dark:bg-blue-950/30",     icon: "\u{1F4BB}" },
  { id: "desk-3", name: "Riya's Desk",             type: "desk",          x: 8,  y: 2, width: 2, height: 2, color: "bg-purple-50/80 dark:bg-purple-950/30", icon: "\u{1F4BB}" },
  { id: "meeting", name: "Meeting Room",            type: "meeting",       x: 2,  y: 6, width: 3, height: 3, color: "bg-green-50/80 dark:bg-green-950/30",   icon: "\u{1F3A5}" },
  { id: "lounge",  name: "Lounge",                  type: "lounge",        x: 6,  y: 6, width: 3, height: 2, color: "bg-yellow-50/80 dark:bg-yellow-950/30", icon: "\u{2615}" },
  { id: "focus",   name: "Focus Pod",               type: "focus",         x: 10, y: 2, width: 2, height: 2, color: "bg-indigo-50/80 dark:bg-indigo-950/30", icon: "\u{1F3A7}" },
  { id: "agent-crm",    name: "CRM Agent Station",  type: "agent_station", x: 10, y: 6, width: 2, height: 2, color: "bg-cyan-50/80 dark:bg-cyan-950/30",    icon: "\u{1F4CA}" },
  { id: "agent-github", name: "GitHub Agent Station", type: "agent_station", x: 10, y: 9, width: 2, height: 2, color: "bg-rose-50/80 dark:bg-rose-950/30",  icon: "\u{1F419}" },
];

export const useOfficeStore = create<OfficeState>((set) => ({
  users: [
    {
      id: "dev-user-001",
      name: "Kunj",
      status: "online",
      statusEmoji: "\u{1F4BB}",
      activity: "Building SquareUp Comms",
      x: 3,
      y: 3,
    },
  ],
  agents: [
    { id: "crm-agent",       name: "@crm-agent",       icon: "\u{1F4CA}", status: "idle",    x: 11, y: 7 },
    { id: "github-agent",    name: "@github-agent",     icon: "\u{1F419}", status: "working", x: 11, y: 10 },
    { id: "meeting-agent",   name: "@meeting-agent",    icon: "\u{1F4C5}", status: "idle",    x: 10, y: 7 },
    { id: "scheduler-agent", name: "@scheduler-agent",  icon: "\u{23F0}", status: "idle",    x: 10, y: 10 },
  ],
  zones: DEFAULT_ZONES,
  myPosition: { x: 3, y: 3 },
  selectedEntity: null,

  setUsers: (users) => set({ users }),
  setAgents: (agents) => set({ agents }),
  moveUser: (userId, x, y) =>
    set((s) => ({
      users: s.users.map((u) => (u.id === userId ? { ...u, x, y } : u)),
    })),
  setMyPosition: (x, y) => set({ myPosition: { x, y } }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  updateUserStatus: (userId, status, message) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId ? { ...u, status, statusMessage: message } : u
      ),
    })),
  updateAgentStatus: (agentId, status, task) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, status, currentTask: task } : a
      ),
    })),
}));
