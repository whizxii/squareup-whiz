import { create } from "zustand";

export type AgentStatus = "idle" | "thinking" | "working" | "error" | "offline";

export interface Agent {
  id: string;
  name: string;
  avatar_url?: string;
  avatar_config?: Record<string, unknown>;
  description?: string;
  system_prompt: string;
  model: string;
  tools: string[];
  mcp_servers: string[];
  trigger_mode: "mention" | "auto" | "scheduled" | "webhook";
  schedule_cron?: string;
  personality?: string;
  office_x?: number;
  office_y?: number;
  office_station_icon?: string;
  status: AgentStatus;
  current_task?: string;
  active: boolean;
  total_executions: number;
  total_cost_usd: number;
  success_rate: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  agent_id: string;
  trigger_message_id?: string;
  trigger_channel_id?: string;
  tools_called: ToolCall[];
  response_text?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  num_tool_calls: number;
  status: "success" | "error" | "timeout" | "cancelled";
  error_message?: string;
  created_at: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  duration_ms: number;
  success: boolean;
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: string;
  status?: "sending" | "thinking" | "done" | "error";
}

// ─── Seed data for development ─────────────────────────────────────
const SEED_AGENTS: Agent[] = [
  {
    id: "agent-crm",
    name: "CRM Agent",
    description:
      "Manages contacts and deals. Send it call notes, recordings, or tell it what to update.",
    system_prompt:
      "You are the CRM Agent for SquareUp. You manage contacts, deals, and the sales pipeline.",
    model: "claude-sonnet-4-6",
    tools: [
      "crm_search",
      "crm_create_contact",
      "crm_update_contact",
      "crm_log_activity",
      "crm_update_stage",
      "crm_set_follow_up",
    ],
    mcp_servers: ["crm-tools"],
    trigger_mode: "mention",
    personality: "Organized, thorough. Always confirms before overwriting. Shows what it changed.",
    office_x: 12,
    office_y: 8,
    office_station_icon: "📊",
    status: "idle",
    active: true,
    total_executions: 47,
    total_cost_usd: 1.23,
    success_rate: 97.9,
    created_by: "dev-user-001",
    created_at: "2026-02-15T10:00:00Z",
    updated_at: "2026-03-14T16:15:00Z",
  },
  {
    id: "agent-meeting",
    name: "Meeting Agent",
    description:
      "Schedules meetings, transcribes calls, and auto-logs meeting notes to CRM.",
    system_prompt:
      "You are the Meeting Agent for SquareUp. You manage calendar events and meeting follow-ups.",
    model: "claude-sonnet-4-6",
    tools: [
      "calendar_list_events",
      "calendar_create_event",
      "calendar_find_free_time",
      "crm_log_activity",
      "crm_update_contact",
    ],
    mcp_servers: ["google-workspace", "crm-tools"],
    trigger_mode: "mention",
    personality: "Proactive, brief. Summarizes concisely. Auto-logs meetings to CRM.",
    office_x: 18,
    office_y: 8,
    office_station_icon: "📅",
    status: "idle",
    active: true,
    total_executions: 31,
    total_cost_usd: 0.87,
    success_rate: 100,
    created_by: "dev-user-001",
    created_at: "2026-02-15T10:00:00Z",
    updated_at: "2026-03-13T11:00:00Z",
  },
  {
    id: "agent-github",
    name: "GitHub Agent",
    description:
      "Checks PRs, creates issues, and keeps you updated on repository activity.",
    system_prompt:
      "You are the GitHub Agent for SquareUp. You manage repository issues, PRs, and code review.",
    model: "claude-sonnet-4-6",
    tools: [
      "github_list_prs",
      "github_get_pr",
      "github_create_issue",
      "github_list_issues",
      "github_get_repo",
    ],
    mcp_servers: ["github"],
    trigger_mode: "mention",
    personality: "Developer-friendly, terse. Uses code blocks. Gets straight to the point.",
    office_x: 24,
    office_y: 8,
    office_station_icon: "🐙",
    status: "idle",
    active: true,
    total_executions: 19,
    total_cost_usd: 0.42,
    success_rate: 94.7,
    created_by: "dev-user-001",
    created_at: "2026-02-20T08:00:00Z",
    updated_at: "2026-03-12T09:30:00Z",
  },
  {
    id: "agent-scheduler",
    name: "Scheduler Agent",
    description:
      "Sets reminders, checks team availability, and manages your time.",
    system_prompt:
      "You are the Scheduler Agent for SquareUp. You help with reminders, scheduling, and time management.",
    model: "claude-sonnet-4-6",
    tools: [
      "calendar_list_events",
      "calendar_find_free_time",
      "reminder_create",
      "reminder_list",
      "team_availability",
    ],
    mcp_servers: ["google-workspace"],
    trigger_mode: "mention",
    personality: "Friendly, time-aware. Knows your timezone. Proactive about conflicts.",
    office_x: 30,
    office_y: 8,
    office_station_icon: "⏰",
    status: "idle",
    active: true,
    total_executions: 24,
    total_cost_usd: 0.56,
    success_rate: 100,
    created_by: "dev-user-001",
    created_at: "2026-02-20T08:00:00Z",
    updated_at: "2026-03-15T07:00:00Z",
  },
];

const SEED_CHAT_MESSAGES: Record<string, AgentChatMessage[]> = {
  "agent-crm": [
    {
      id: "crm-chat-1",
      role: "user",
      content: "Can you update Vikram Patel's deal value to 5 lakhs?",
      timestamp: "2026-03-14T16:00:00Z",
      status: "done",
    },
    {
      id: "crm-chat-2",
      role: "agent",
      content:
        "Done! Updated Vikram Patel (GlobalTech) deal value to ₹5,00,000. I also logged this as an activity on his timeline.",
      toolCalls: [
        {
          name: "crm_search",
          input: { query: "Vikram Patel" },
          output: { found: 1, contact_id: "seed-3" },
          duration_ms: 120,
          success: true,
        },
        {
          name: "crm_update_contact",
          input: { id: "seed-3", value: 500000 },
          output: { updated: true },
          duration_ms: 85,
          success: true,
        },
        {
          name: "crm_log_activity",
          input: { contact_id: "seed-3", type: "deal_update", title: "Updated deal value" },
          output: { logged: true },
          duration_ms: 62,
          success: true,
        },
      ],
      timestamp: "2026-03-14T16:01:00Z",
      status: "done",
    },
  ],
  "agent-meeting": [
    {
      id: "meet-chat-1",
      role: "user",
      content: "What meetings do I have tomorrow?",
      timestamp: "2026-03-14T09:00:00Z",
      status: "done",
    },
    {
      id: "meet-chat-2",
      role: "agent",
      content:
        "You have 2 meetings tomorrow (March 15):\n\n1. **10:00 AM** — Team standup (30 min)\n2. **2:00 PM** — Call with Vikram Patel, GlobalTech — pricing discussion (1 hr)\n\nYou're free from 11:00 AM to 2:00 PM and after 3:00 PM.",
      toolCalls: [
        {
          name: "calendar_list_events",
          input: { date: "2026-03-15" },
          output: { count: 2 },
          duration_ms: 340,
          success: true,
        },
      ],
      timestamp: "2026-03-14T09:01:00Z",
      status: "done",
    },
  ],
};

// ─── Simulated agent response generator ─────────────────────────────
interface SimulatedResponse {
  content: string;
  toolCalls: ToolCall[];
}

const SIMULATED_RESPONSES: Record<string, (msg: string) => SimulatedResponse> = {
  "agent-crm": (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("search") || lower.includes("find")) {
      return {
        content:
          "I found 2 matching contacts:\n\n1. **Rahul Mehta** — CTO at Acme Corp (Qualified, ₹2,50,000)\n2. **Priya Sharma** — Founder & CEO at StartupXYZ (Proposal, ₹1,80,000)\n\nWould you like me to open either contact's details?",
        toolCalls: [
          {
            name: "crm_search",
            input: { query: msg },
            output: { found: 2 },
            duration_ms: 145,
            success: true,
          },
        ],
      };
    }
    if (lower.includes("add") || lower.includes("create")) {
      return {
        content:
          "Created new contact and added to the pipeline as a Lead. I've also logged this as an activity. You can view them in the CRM tab.",
        toolCalls: [
          {
            name: "crm_create_contact",
            input: { name: "New Contact", stage: "lead" },
            output: { id: "new-contact-id", created: true },
            duration_ms: 210,
            success: true,
          },
          {
            name: "crm_log_activity",
            input: { type: "note", title: "Contact created via agent" },
            output: { logged: true },
            duration_ms: 68,
            success: true,
          },
        ],
      };
    }
    if (lower.includes("update") || lower.includes("change") || lower.includes("move")) {
      return {
        content:
          "Done! I've updated the contact record and logged the change. The activity timeline has been updated as well.",
        toolCalls: [
          {
            name: "crm_search",
            input: { query: msg },
            output: { found: 1 },
            duration_ms: 95,
            success: true,
          },
          {
            name: "crm_update_contact",
            input: { updates: "parsed from message" },
            output: { updated: true },
            duration_ms: 130,
            success: true,
          },
        ],
      };
    }
    if (lower.includes("follow") || lower.includes("remind")) {
      return {
        content:
          "Follow-up reminder set! I'll notify you when it's time. The reminder has been logged on the contact's timeline.",
        toolCalls: [
          {
            name: "crm_set_follow_up",
            input: { note: msg },
            output: { set: true },
            duration_ms: 88,
            success: true,
          },
        ],
      };
    }
    return {
      content:
        "I can help with your CRM tasks. Try asking me to:\n• Search for contacts\n• Create or update contacts\n• Log activities (calls, emails, meetings)\n• Change deal stages\n• Set follow-up reminders\n\nWhat would you like to do?",
      toolCalls: [],
    };
  },

  "agent-meeting": (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("schedule") || lower.includes("book") || lower.includes("set up")) {
      return {
        content:
          "Meeting scheduled! Here are the details:\n\n📅 **Tomorrow at 3:00 PM** (30 min)\n📍 Google Meet link generated\n👥 Invite sent to attendees\n\nI've also logged this in the CRM activity timeline.",
        toolCalls: [
          {
            name: "calendar_find_free_time",
            input: { date: "tomorrow" },
            output: { slots: ["3:00 PM", "4:00 PM"] },
            duration_ms: 280,
            success: true,
          },
          {
            name: "calendar_create_event",
            input: { title: "Meeting", time: "3:00 PM" },
            output: { created: true, meet_link: "https://meet.google.com/abc-def" },
            duration_ms: 350,
            success: true,
          },
        ],
      };
    }
    if (lower.includes("what") || lower.includes("today") || lower.includes("tomorrow") || lower.includes("calendar")) {
      return {
        content:
          "Here's your schedule:\n\n**Today:**\n• 10:00 AM — Team standup (30 min)\n• 2:00 PM — Client call with Priya (1 hr)\n\n**Tomorrow:**\n• 11:00 AM — Design review (45 min)\n\nYou have 3 free hours this afternoon.",
        toolCalls: [
          {
            name: "calendar_list_events",
            input: { range: "today+tomorrow" },
            output: { count: 3 },
            duration_ms: 290,
            success: true,
          },
        ],
      };
    }
    return {
      content:
        "I can help manage your meetings. Try asking me to:\n• Check your calendar\n• Schedule a meeting\n• Find free time slots\n• Summarize meeting notes\n\nWhat would you like to do?",
      toolCalls: [],
    };
  },

  "agent-github": (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("pr") || lower.includes("pull request") || lower.includes("review")) {
      return {
        content:
          "Here are the open PRs needing review:\n\n```\n#142  fix: auth token refresh  (2 files, +45 -12)\n#139  feat: dark mode toggle   (8 files, +230 -45)\n```\n\nBoth are ready for review. Want me to add you as a reviewer?",
        toolCalls: [
          {
            name: "github_list_prs",
            input: { state: "open", reviewer: "pending" },
            output: { count: 2 },
            duration_ms: 420,
            success: true,
          },
        ],
      };
    }
    if (lower.includes("issue") || lower.includes("bug") || lower.includes("create")) {
      return {
        content:
          "Issue created:\n\n```\n#156  [Bug] Login redirect fails on Safari\nLabels: bug, priority:high\nAssigned: @kunj\n```\n\nAnything else you'd like me to add to it?",
        toolCalls: [
          {
            name: "github_create_issue",
            input: { title: "Bug report", labels: ["bug"] },
            output: { number: 156, created: true },
            duration_ms: 310,
            success: true,
          },
        ],
      };
    }
    return {
      content:
        "I can help with GitHub tasks. Try asking me to:\n• List open PRs or issues\n• Create issues or bug reports\n• Check repository status\n• Review PR changes\n\nWhat do you need?",
      toolCalls: [],
    };
  },

  "agent-scheduler": (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("remind") || lower.includes("reminder")) {
      return {
        content:
          "Reminder set! I'll ping you when it's time. Here's what I've saved:\n\n⏰ **Reminder**: " + msg.replace(/remind me (to )?/i, "") + "\n📅 Scheduled for the next available slot",
        toolCalls: [
          {
            name: "reminder_create",
            input: { text: msg },
            output: { created: true },
            duration_ms: 75,
            success: true,
          },
        ],
      };
    }
    if (lower.includes("free") || lower.includes("available") || lower.includes("when")) {
      return {
        content:
          "Here's your availability today:\n\n🟢 **Free:** 11:00 AM – 12:30 PM, 3:00 PM – 5:00 PM\n🔴 **Busy:** 10:00 AM standup, 1:00 PM client call, 2:00 PM design review\n\nWant me to block time for focus work?",
        toolCalls: [
          {
            name: "calendar_find_free_time",
            input: { date: "today" },
            output: { free_slots: 2 },
            duration_ms: 260,
            success: true,
          },
          {
            name: "team_availability",
            input: {},
            output: { members_available: 2 },
            duration_ms: 180,
            success: true,
          },
        ],
      };
    }
    return {
      content:
        "I can help manage your time. Try asking me to:\n• Set reminders\n• Find free time slots\n• Check team availability\n• Block focus time\n\nWhat would you like to do?",
      toolCalls: [],
    };
  },
};

export function getSimulatedResponse(agentId: string, message: string): SimulatedResponse {
  const handler = SIMULATED_RESPONSES[agentId];
  if (handler) return handler(message);
  return {
    content: "I received your message. This is a simulated response — connect the backend to enable live agent execution.",
    toolCalls: [],
  };
}

// ─── Store ─────────────────────────────────────────────────────────
interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  chatMessages: Record<string, AgentChatMessage[]>;

  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgent: (id: string | null) => void;
  addChatMessage: (agentId: string, message: AgentChatMessage) => void;
  setChatMessages: (agentId: string, messages: AgentChatMessage[]) => void;
  updateChatMessage: (agentId: string, messageId: string, updates: Partial<AgentChatMessage>) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: SEED_AGENTS,
  selectedAgentId: null,
  chatMessages: SEED_CHAT_MESSAGES,

  setAgents: (agents) => set({ agents }),
  addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
  updateAgent: (id, updates) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeAgent: (id) =>
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
    })),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  addChatMessage: (agentId, message) =>
    set((s) => ({
      chatMessages: {
        ...s.chatMessages,
        [agentId]: [...(s.chatMessages[agentId] || []), message],
      },
    })),
  setChatMessages: (agentId, messages) =>
    set((s) => ({
      chatMessages: { ...s.chatMessages, [agentId]: messages },
    })),
  updateChatMessage: (agentId, messageId, updates) =>
    set((s) => {
      const msgs = s.chatMessages[agentId] || [];
      return {
        chatMessages: {
          ...s.chatMessages,
          [agentId]: msgs.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      };
    }),
}));
