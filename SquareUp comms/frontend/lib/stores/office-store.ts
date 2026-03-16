import { create } from "zustand";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserStatus = "online" | "away" | "busy" | "dnd";

export type Direction = "down" | "up" | "left" | "right";

export type AnimationState = "idle" | "walking";

export type AgentVisualState =
  | "idle"
  | "typing"
  | "celebrating"
  | "frustrated"
  | "coffee_break"
  | "chatting";

export type DayPhase =
  | "dawn"
  | "morning"
  | "afternoon"
  | "golden"
  | "dusk"
  | "night";

export type WeatherCondition = "clear" | "cloudy" | "rain" | "storm" | "snow";

export type FloorStyle = "warm-wood" | "modern-tile" | "carpet" | "concrete";

export type ZoneType =
  | "desk"
  | "meeting"
  | "lounge"
  | "focus"
  | "agent_station";

export type FurnitureType =
  | "desk"
  | "chair"
  | "plant"
  | "bookshelf"
  | "whiteboard"
  | "coffee_machine"
  | "server_rack"
  | "lamp"
  | "rug"
  | "divider";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface CharacterAppearance {
  readonly hairStyle: number; // 0-4
  readonly hairColor: string; // hex
  readonly skinTone: string; // hex
  readonly shirtColor: string; // hex
  readonly pantsColor: string; // hex
}

export interface AgentPersonality {
  readonly deskItems: readonly string[]; // emoji array for desk props
  readonly idleQuirk: "stretches" | "sips_coffee" | "checks_phone";
}

export interface OfficeUser {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string;
  readonly status: UserStatus;
  readonly statusMessage?: string;
  readonly statusEmoji?: string;
  readonly x: number;
  readonly y: number;
  readonly activity?: string;
  readonly direction: Direction;
  readonly animationState: AnimationState;
  readonly appearance: CharacterAppearance;
}

export interface OfficeAgent {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly status: "idle" | "thinking" | "working" | "error" | "offline";
  readonly currentTask?: string;
  readonly x: number;
  readonly y: number;
  readonly visualState: AgentVisualState;
  readonly personality: AgentPersonality;
}

export interface OfficeZone {
  readonly id: string;
  readonly name: string;
  readonly type: ZoneType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly icon: string;
  readonly capacity?: number;
  readonly isPrivate?: boolean;
}

export interface OfficeFurniture {
  readonly id: string;
  readonly type: FurnitureType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly zoneId?: string;
}

export interface AmbientEvent {
  readonly id: string;
  readonly type:
    | "coffee_brew"
    | "agent_chat"
    | "delivery"
    | "whiteboard_update"
    | "plant_drop"
    | "agent_stretch"
    | "laughter";
  readonly timestamp: number;
  readonly data?: Record<string, string>;
}

export interface ChatBubble {
  readonly id: string;
  readonly senderId: string;
  readonly text: string;
  readonly timestamp: number;
}

export interface OfficeLayout {
  readonly floorStyle: FloorStyle;
  readonly gridCols: number;
  readonly gridRows: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_APPEARANCE: CharacterAppearance = {
  hairStyle: 1,
  hairColor: "#3B2F2F",
  skinTone: "#D2A679",
  shirtColor: "#FF6B00",
  pantsColor: "#3B4252",
};

const DEFAULT_LAYOUT: OfficeLayout = {
  floorStyle: "warm-wood",
  gridCols: 13,
  gridRows: 12,
};

const DEFAULT_ZONES: readonly OfficeZone[] = [
  { id: "desk-1", name: "Kunj's Desk", type: "desk", x: 2, y: 2, width: 2, height: 2, color: "#FF6B00", icon: "\u{1F4BB}", capacity: 1 },
  { id: "desk-2", name: "Arjun's Desk", type: "desk", x: 5, y: 2, width: 2, height: 2, color: "#4a90d9", icon: "\u{1F4BB}", capacity: 1 },
  { id: "desk-3", name: "Riya's Desk", type: "desk", x: 8, y: 2, width: 2, height: 2, color: "#9b59b6", icon: "\u{1F4BB}", capacity: 1 },
  { id: "meeting", name: "Meeting Room", type: "meeting", x: 2, y: 6, width: 3, height: 3, color: "#22c55e", icon: "\u{1F3A5}", capacity: 4, isPrivate: true },
  { id: "lounge", name: "Lounge", type: "lounge", x: 6, y: 6, width: 3, height: 2, color: "#eab308", icon: "\u{2615}", capacity: 6 },
  { id: "focus", name: "Focus Pod", type: "focus", x: 10, y: 2, width: 2, height: 2, color: "#6366f1", icon: "\u{1F3A7}", capacity: 1, isPrivate: true },
  { id: "agent-crm", name: "CRM Station", type: "agent_station", x: 10, y: 6, width: 2, height: 2, color: "#06b6d4", icon: "\u{1F4CA}" },
  { id: "agent-github", name: "GitHub Station", type: "agent_station", x: 10, y: 9, width: 2, height: 2, color: "#f43f5e", icon: "\u{1F419}" },
];

const DEFAULT_FURNITURE: readonly OfficeFurniture[] = [
  { id: "desk-f1", type: "desk", x: 2, y: 2, width: 2, height: 1, zoneId: "desk-1" },
  { id: "chair-f1", type: "chair", x: 3, y: 3, width: 1, height: 1, zoneId: "desk-1" },
  { id: "desk-f2", type: "desk", x: 5, y: 2, width: 2, height: 1, zoneId: "desk-2" },
  { id: "chair-f2", type: "chair", x: 6, y: 3, width: 1, height: 1, zoneId: "desk-2" },
  { id: "desk-f3", type: "desk", x: 8, y: 2, width: 2, height: 1, zoneId: "desk-3" },
  { id: "chair-f3", type: "chair", x: 9, y: 3, width: 1, height: 1, zoneId: "desk-3" },
  { id: "table-m1", type: "desk", x: 3, y: 7, width: 1, height: 1, zoneId: "meeting" },
  { id: "plant-1", type: "plant", x: 1, y: 1, width: 1, height: 1 },
  { id: "plant-2", type: "plant", x: 12, y: 1, width: 1, height: 1 },
  { id: "coffee-1", type: "coffee_machine", x: 6, y: 7, width: 1, height: 1, zoneId: "lounge" },
  { id: "bookshelf-1", type: "bookshelf", x: 0, y: 5, width: 1, height: 2 },
  { id: "whiteboard-1", type: "whiteboard", x: 2, y: 5, width: 2, height: 1, zoneId: "meeting" },
  { id: "server-1", type: "server_rack", x: 12, y: 6, width: 1, height: 2 },
  { id: "lamp-1", type: "lamp", x: 2, y: 2, width: 1, height: 1, zoneId: "desk-1" },
  { id: "lamp-2", type: "lamp", x: 10, y: 6, width: 1, height: 1, zoneId: "agent-crm" },
  { id: "rug-1", type: "rug", x: 6, y: 6, width: 3, height: 2, zoneId: "lounge" },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface OfficeState {
  // Entities
  readonly users: readonly OfficeUser[];
  readonly agents: readonly OfficeAgent[];
  readonly zones: readonly OfficeZone[];
  readonly furniture: readonly OfficeFurniture[];

  // Camera & viewport
  readonly myPosition: { readonly x: number; readonly y: number };
  readonly zoom: number;
  readonly cameraOffset: { readonly x: number; readonly y: number };

  // UI state
  readonly viewMode: "grid" | "pixel";
  readonly selectedEntity: { readonly type: "user" | "agent"; readonly id: string } | null;
  readonly editMode: boolean;
  readonly showGrid: boolean;
  readonly listViewActive: boolean;
  readonly minimapExpanded: boolean;

  // Interaction state
  readonly followingEntity: { readonly type: "user" | "agent"; readonly id: string } | null;
  readonly waveTarget: { readonly type: "user" | "agent"; readonly id: string } | null;
  readonly chatBubbles: readonly ChatBubble[];
  readonly interactionPanelOpen: boolean;

  // Environment
  readonly layout: OfficeLayout;
  readonly dayPhase: DayPhase;
  readonly weather: WeatherCondition;
  readonly ambientEvents: readonly AmbientEvent[];

  // Actions
  readonly setUsers: (users: readonly OfficeUser[]) => void;
  readonly setAgents: (agents: readonly OfficeAgent[]) => void;
  readonly moveUser: (userId: string, x: number, y: number, direction: Direction) => void;
  readonly setMyPosition: (x: number, y: number) => void;
  readonly setSelectedEntity: (entity: { type: "user" | "agent"; id: string } | null) => void;
  readonly updateUserStatus: (userId: string, status: UserStatus, message?: string) => void;
  readonly updateUserAnimation: (userId: string, state: AnimationState, direction?: Direction) => void;
  readonly updateAgentStatus: (agentId: string, status: OfficeAgent["status"], task?: string) => void;
  readonly updateAgentVisualState: (agentId: string, visualState: AgentVisualState) => void;
  readonly moveAgent: (agentId: string, x: number, y: number) => void;
  readonly setZoom: (zoom: number) => void;
  readonly setCameraOffset: (x: number, y: number) => void;
  readonly setViewMode: (mode: "grid" | "pixel") => void;
  readonly setEditMode: (editMode: boolean) => void;
  readonly setShowGrid: (showGrid: boolean) => void;
  readonly setListViewActive: (active: boolean) => void;
  readonly setMinimapExpanded: (expanded: boolean) => void;
  readonly setDayPhase: (phase: DayPhase) => void;
  readonly setWeather: (weather: WeatherCondition) => void;
  readonly addAmbientEvent: (event: AmbientEvent) => void;
  readonly clearOldAmbientEvents: () => void;
  readonly setFurniture: (furniture: readonly OfficeFurniture[]) => void;
  readonly addFurniture: (item: OfficeFurniture) => void;
  readonly removeFurniture: (id: string) => void;
  readonly setLayout: (layout: OfficeLayout) => void;

  // Interaction actions
  readonly setFollowingEntity: (entity: { type: "user" | "agent"; id: string } | null) => void;
  readonly sendWave: (target: { type: "user" | "agent"; id: string }) => void;
  readonly clearWave: () => void;
  readonly addChatBubble: (senderId: string, text: string) => void;
  readonly clearOldChatBubbles: () => void;
  readonly setInteractionPanelOpen: (open: boolean) => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  // Entities
  users: [
    {
      id: getCurrentUserId(),
      name: "Kunj",
      status: "online" as UserStatus,
      statusEmoji: "\u{1F4BB}",
      activity: "Building SquareUp Comms",
      x: 3,
      y: 3,
      direction: "down" as Direction,
      animationState: "idle" as AnimationState,
      appearance: DEFAULT_APPEARANCE,
    },
    {
      id: "demo-user-arjun",
      name: "Arjun",
      status: "online" as UserStatus,
      statusEmoji: "🎨",
      statusMessage: "Designing the new dashboard",
      activity: "Working on UI components",
      x: 6,
      y: 3,
      direction: "down" as Direction,
      animationState: "idle" as AnimationState,
      appearance: {
        hairStyle: 0,
        hairColor: "#1a1a1a",
        skinTone: "#C68642",
        shirtColor: "#4a90d9",
        pantsColor: "#2d3436",
      },
    },
    {
      id: "demo-user-riya",
      name: "Riya",
      status: "away" as UserStatus,
      statusEmoji: "☕",
      statusMessage: "Coffee break",
      activity: "Reviewing PRs",
      x: 9,
      y: 3,
      direction: "down" as Direction,
      animationState: "idle" as AnimationState,
      appearance: {
        hairStyle: 2,
        hairColor: "#2C1810",
        skinTone: "#D4A574",
        shirtColor: "#9b59b6",
        pantsColor: "#34495e",
      },
    },
  ],
  agents: [
    {
      id: "crm-agent",
      name: "@crm-agent",
      icon: "\u{1F4CA}",
      status: "idle",
      x: 11,
      y: 7,
      visualState: "idle" as AgentVisualState,
      personality: { deskItems: ["\u{26A1}", "\u{1F4DE}", "\u{1F4CC}"], idleQuirk: "sips_coffee" },
    },
    {
      id: "github-agent",
      name: "@github-agent",
      icon: "\u{1F419}",
      status: "working",
      currentTask: "Reviewing PRs",
      x: 11,
      y: 10,
      visualState: "typing" as AgentVisualState,
      personality: { deskItems: ["\u{1F986}", "\u{1F5A5}", "\u{2328}"], idleQuirk: "checks_phone" },
    },
    {
      id: "meeting-agent",
      name: "@meeting-agent",
      icon: "\u{1F4C5}",
      status: "idle",
      x: 10,
      y: 7,
      visualState: "idle" as AgentVisualState,
      personality: { deskItems: ["\u{1F4D3}", "\u{2728}", "\u{1F58A}"], idleQuirk: "stretches" },
    },
    {
      id: "scheduler-agent",
      name: "@scheduler-agent",
      icon: "\u{23F0}",
      status: "idle",
      x: 10,
      y: 10,
      visualState: "idle" as AgentVisualState,
      personality: { deskItems: ["\u{1F4C6}", "\u{1F418}", "\u{1F4DD}"], idleQuirk: "sips_coffee" },
    },
  ],
  zones: [...DEFAULT_ZONES],
  furniture: [...DEFAULT_FURNITURE],

  // Camera & viewport
  myPosition: { x: 3, y: 3 },
  zoom: 1,
  cameraOffset: { x: 0, y: 0 },

  // UI state
  viewMode: "grid",
  selectedEntity: null,
  editMode: false,
  showGrid: false,
  listViewActive: false,
  minimapExpanded: true,

  // Interaction state
  followingEntity: null,
  waveTarget: null,
  chatBubbles: [],
  interactionPanelOpen: false,

  // Environment
  layout: DEFAULT_LAYOUT,
  dayPhase: "morning",
  weather: "clear",
  ambientEvents: [],

  // Actions — all immutable (return new objects)
  setUsers: (users) => set({ users }),
  setAgents: (agents) => set({ agents }),
  moveUser: (userId, x, y, direction) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId
          ? { ...u, x, y, direction, animationState: "walking" as AnimationState }
          : u
      ),
    })),
  setMyPosition: (x, y) => set({ myPosition: { x, y } }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  updateUserStatus: (userId, status, message) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId ? { ...u, status, statusMessage: message } : u
      ),
    })),
  updateUserAnimation: (userId, animationState, direction) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId
          ? { ...u, animationState, ...(direction ? { direction } : {}) }
          : u
      ),
    })),
  updateAgentStatus: (agentId, status, task) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, status, currentTask: task } : a
      ),
    })),
  updateAgentVisualState: (agentId, visualState) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, visualState } : a
      ),
    })),
  moveAgent: (agentId, x, y) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, x, y } : a
      ),
    })),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(2.0, zoom)) }),
  setCameraOffset: (x, y) => set({ cameraOffset: { x, y } }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setEditMode: (editMode) => set({ editMode, showGrid: editMode }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setListViewActive: (active) => set({ listViewActive: active }),
  setMinimapExpanded: (expanded) => set({ minimapExpanded: expanded }),
  setDayPhase: (dayPhase) => set({ dayPhase }),
  setWeather: (weather) => set({ weather }),
  addAmbientEvent: (event) =>
    set((s) => ({ ambientEvents: [...s.ambientEvents, event] })),
  clearOldAmbientEvents: () =>
    set((s) => ({
      ambientEvents: s.ambientEvents.filter(
        (e) => Date.now() - e.timestamp < 30_000
      ),
    })),
  setFurniture: (furniture) => set({ furniture }),
  addFurniture: (item) =>
    set((s) => ({ furniture: [...s.furniture, item] })),
  removeFurniture: (id) =>
    set((s) => ({ furniture: s.furniture.filter((f) => f.id !== id) })),
  setLayout: (layout) => set({ layout }),

  // Interaction actions
  setFollowingEntity: (entity) => set({ followingEntity: entity }),
  sendWave: (target) => set({ waveTarget: target }),
  clearWave: () => set({ waveTarget: null }),
  addChatBubble: (senderId, text) =>
    set((s) => ({
      chatBubbles: [
        ...s.chatBubbles,
        {
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          senderId,
          text,
          timestamp: Date.now(),
        },
      ],
    })),
  clearOldChatBubbles: () =>
    set((s) => ({
      chatBubbles: s.chatBubbles.filter(
        (b) => Date.now() - b.timestamp < 8_000
      ),
    })),
  setInteractionPanelOpen: (open) => set({ interactionPanelOpen: open }),
}));
