import { create } from "zustand";

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

export interface OfficeReaction {
  readonly id: string;
  readonly emoji: string;
  readonly createdAt: number;
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
  readonly isTyping?: boolean;
  readonly reactions?: readonly OfficeReaction[];
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

/** Snapshot of editable state for undo/redo and cancel-to-revert. */
export interface EditorSnapshot {
  readonly zones: readonly OfficeZone[];
  readonly furniture: readonly OfficeFurniture[];
  readonly layout: OfficeLayout;
}

const MAX_UNDO_HISTORY = 50;

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
  { id: "desk-2", name: "Tanmay's Desk", type: "desk", x: 5, y: 2, width: 2, height: 2, color: "#4a90d9", icon: "\u{1F4BB}", capacity: 1 },
  { id: "desk-3", name: "Param's Desk", type: "desk", x: 8, y: 2, width: 2, height: 2, color: "#27ae60", icon: "\u{1F4BB}", capacity: 1 },
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
  readonly viewMode: "simplified" | "immersive";
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

  // Editor state (undo/redo + snapshot for cancel)
  readonly editorHistory: readonly EditorSnapshot[];
  readonly editorFuture: readonly EditorSnapshot[];
  readonly editorSnapshot: EditorSnapshot | null;

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
  readonly setViewMode: (mode: "simplified" | "immersive") => void;
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
  readonly moveFurniture: (id: string, x: number, y: number) => void;
  readonly updateFurniture: (id: string, patch: Partial<OfficeFurniture>) => void;
  readonly rotateFurniture: (id: string) => void;
  readonly setLayout: (layout: OfficeLayout) => void;

  // Zone CRUD
  readonly setZones: (zones: readonly OfficeZone[]) => void;
  readonly addZone: (zone: OfficeZone) => void;
  readonly updateZone: (id: string, patch: Partial<OfficeZone>) => void;
  readonly deleteZone: (id: string) => void;

  // Editor undo/redo
  readonly pushEditorUndo: () => void;
  readonly editorUndo: () => void;
  readonly editorRedo: () => void;
  readonly cancelEdits: () => void;

  // Hydration
  readonly hydrateUsers: (
    apiUsers: readonly {
      readonly id: string;
      readonly display_name: string;
      readonly avatar_url?: string;
      readonly avatar_config?: {
        readonly hairStyle?: number;
        readonly hairColor?: string;
        readonly skinTone?: string;
        readonly shirtColor?: string;
        readonly pantsColor?: string;
      };
      readonly status?: string;
      readonly status_message?: string;
      readonly status_emoji?: string;
      readonly office_x?: number;
      readonly office_y?: number;
    }[],
    myUserId: string,
  ) => void;

  // Hydration — populate agents from real agent-store data
  readonly hydrateAgents: (
    apiAgents: readonly {
      readonly id: string;
      readonly name: string;
      readonly office_station_icon?: string;
      readonly status?: string;
      readonly current_task?: string;
      readonly office_x?: number;
      readonly office_y?: number;
      readonly personality?: string;
      readonly active?: boolean;
    }[],
  ) => void;

  // Interaction actions
  readonly setFollowingEntity: (entity: { type: "user" | "agent"; id: string } | null) => void;
  readonly sendWave: (target: { type: "user" | "agent"; id: string }) => void;
  readonly clearWave: () => void;
  readonly addChatBubble: (senderId: string, text: string) => void;
  readonly clearOldChatBubbles: () => void;
  readonly setInteractionPanelOpen: (open: boolean) => void;

  // Typing indicators & reactions
  readonly setUserTyping: (userId: string, isTyping: boolean) => void;
  readonly addUserReaction: (userId: string, emoji: string) => void;
  readonly clearOldUserReactions: () => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  // Entities — hydrated from GET /api/users/ on office mount
  users: [],
  // Agents — hydrated from real agent-store via hydrateAgents()
  agents: [],
  zones: [...DEFAULT_ZONES],
  furniture: [...DEFAULT_FURNITURE],

  // Camera & viewport
  myPosition: { x: 5, y: 5 },
  zoom: 1,
  cameraOffset: { x: 0, y: 0 },

  // UI state
  viewMode: "immersive",
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

  // Editor state
  editorHistory: [],
  editorFuture: [],
  editorSnapshot: null,

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
  setEditMode: (editMode) =>
    set((s) => ({
      editMode,
      showGrid: editMode,
      // Snapshot current state when entering edit mode; clear on exit
      editorSnapshot: editMode
        ? { zones: s.zones, furniture: s.furniture, layout: s.layout }
        : null,
      editorHistory: editMode ? [] : s.editorHistory,
      editorFuture: editMode ? [] : s.editorFuture,
    })),
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
  moveFurniture: (id, x, y) =>
    set((s) => ({
      furniture: s.furniture.map((f) => (f.id === id ? { ...f, x, y } : f)),
    })),
  updateFurniture: (id, patch) =>
    set((s) => ({
      furniture: s.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),
  rotateFurniture: (id) =>
    set((s) => ({
      furniture: s.furniture.map((f) =>
        f.id === id
          ? { ...f, rotation: ((f.rotation ?? 0) + 90) % 360 }
          : f
      ),
    })),
  setLayout: (layout) => set({ layout }),

  // Zone CRUD
  setZones: (zones) => set({ zones }),
  addZone: (zone) => set((s) => ({ zones: [...s.zones, zone] })),
  updateZone: (id, patch) =>
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    })),
  deleteZone: (id) =>
    set((s) => ({
      zones: s.zones.filter((z) => z.id !== id),
      // Remove furniture assigned to the deleted zone
      furniture: s.furniture.map((f) =>
        f.zoneId === id ? { ...f, zoneId: undefined } : f
      ),
    })),

  // Editor undo/redo
  pushEditorUndo: () =>
    set((s) => ({
      editorHistory: [
        ...s.editorHistory.slice(-MAX_UNDO_HISTORY + 1),
        { zones: s.zones, furniture: s.furniture, layout: s.layout },
      ],
      editorFuture: [], // clear redo on new action
    })),
  editorUndo: () =>
    set((s) => {
      if (s.editorHistory.length === 0) return s;
      const prev = s.editorHistory[s.editorHistory.length - 1];
      return {
        editorHistory: s.editorHistory.slice(0, -1),
        editorFuture: [
          { zones: s.zones, furniture: s.furniture, layout: s.layout },
          ...s.editorFuture,
        ],
        zones: prev.zones,
        furniture: prev.furniture,
        layout: prev.layout,
      };
    }),
  editorRedo: () =>
    set((s) => {
      if (s.editorFuture.length === 0) return s;
      const next = s.editorFuture[0];
      return {
        editorFuture: s.editorFuture.slice(1),
        editorHistory: [
          ...s.editorHistory,
          { zones: s.zones, furniture: s.furniture, layout: s.layout },
        ],
        zones: next.zones,
        furniture: next.furniture,
        layout: next.layout,
      };
    }),
  cancelEdits: () =>
    set((s) => {
      if (!s.editorSnapshot) return { editMode: false, showGrid: false };
      return {
        zones: s.editorSnapshot.zones,
        furniture: s.editorSnapshot.furniture,
        layout: s.editorSnapshot.layout,
        editMode: false,
        showGrid: false,
        editorSnapshot: null,
        editorHistory: [],
        editorFuture: [],
      };
    }),

  // Hydration — populate users from backend API response
  hydrateUsers: (apiUsers, myUserId) => {
    const me = apiUsers.find((u) => u.id === myUserId);
    set({
      users: apiUsers.map((u) => ({
        id: u.id,
        name: u.display_name,
        avatar: u.avatar_url,
        status: (u.status as UserStatus) || "online",
        statusMessage: u.status_message,
        statusEmoji: u.status_emoji,
        x: u.office_x ?? 5,
        y: u.office_y ?? 5,
        direction: "down" as Direction,
        animationState: "idle" as AnimationState,
        appearance: {
          hairStyle: u.avatar_config?.hairStyle ?? 1,
          hairColor: u.avatar_config?.hairColor ?? "#3B2F2F",
          skinTone: u.avatar_config?.skinTone ?? "#D2A679",
          shirtColor: u.avatar_config?.shirtColor ?? "#FF6B00",
          pantsColor: u.avatar_config?.pantsColor ?? "#3B4252",
        },
      })),
      myPosition: me
        ? { x: me.office_x ?? 5, y: me.office_y ?? 5 }
        : { x: 5, y: 5 },
    });
  },

  // Hydration — populate agents from real agent-store data
  hydrateAgents: (apiAgents) => {
    const DEFAULT_POSITIONS = [
      { x: 11, y: 7 },
      { x: 11, y: 10 },
      { x: 10, y: 7 },
      { x: 10, y: 10 },
    ] as const;

    const DEFAULT_AGENT_PERSONALITY: AgentPersonality = {
      deskItems: ["\u26A1", "\u{1F4CB}", "\u{1F527}"],
      idleQuirk: "sips_coffee",
    };

    const statusToVisual = (status: string): AgentVisualState => {
      switch (status) {
        case "working":
        case "thinking":
          return "typing";
        case "error":
          return "frustrated";
        default:
          return "idle";
      }
    };

    const parsePersonality = (raw?: string): AgentPersonality => {
      if (!raw) return DEFAULT_AGENT_PERSONALITY;
      try {
        const parsed = JSON.parse(raw);
        return {
          deskItems: Array.isArray(parsed.deskItems)
            ? parsed.deskItems
            : DEFAULT_AGENT_PERSONALITY.deskItems,
          idleQuirk: parsed.idleQuirk || DEFAULT_AGENT_PERSONALITY.idleQuirk,
        };
      } catch {
        return DEFAULT_AGENT_PERSONALITY;
      }
    };

    const VALID_STATUSES = new Set(["idle", "thinking", "working", "error", "offline"]);

    set((s) => ({
      agents: apiAgents
        .filter((a) => a.active !== false)
        .map((a, i) => {
          // Preserve existing office agent state if actively working
          const existing = s.agents.find((ea) => ea.id === a.id);
          const isActivelyWorking =
            existing?.status === "working" || existing?.status === "thinking";
          const pos = DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length];

          return {
            id: a.id,
            name: a.name.startsWith("@")
              ? a.name
              : `@${a.name.toLowerCase().replace(/\s+/g, "-")}`,
            icon: a.office_station_icon || "\u{1F916}",
            status: isActivelyWorking
              ? existing.status
              : (VALID_STATUSES.has(a.status || "")
                  ? (a.status as OfficeAgent["status"])
                  : "idle"),
            currentTask: isActivelyWorking
              ? existing.currentTask
              : a.current_task,
            x: a.office_x ?? pos.x,
            y: a.office_y ?? pos.y,
            visualState: isActivelyWorking
              ? existing.visualState
              : statusToVisual(a.status || "idle"),
            personality: parsePersonality(a.personality),
          };
        }),
    }));
  },

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

  // Typing indicators & reactions
  setUserTyping: (userId, isTyping) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId ? { ...u, isTyping } : u
      ),
    })),
  addUserReaction: (userId, emoji) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              reactions: [
                ...(u.reactions ?? []),
                {
                  id: `rxn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  emoji,
                  createdAt: Date.now(),
                },
              ],
            }
          : u
      ),
    })),
  clearOldUserReactions: () =>
    set((s) => ({
      users: s.users.map((u) =>
        u.reactions && u.reactions.some((r) => Date.now() - r.createdAt > 3_500)
          ? {
              ...u,
              reactions: u.reactions.filter((r) => Date.now() - r.createdAt <= 3_500),
            }
          : u
      ),
    })),
}));
