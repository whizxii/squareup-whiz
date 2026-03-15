import { create } from "zustand";

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  avatar_url?: string;
  stage: CRMStage;
  stage_changed_at: string;
  value?: number;
  currency: string;
  source?: string;
  tags: string[];
  notes?: string;
  last_contacted_at?: string;
  next_follow_up_at?: string;
  follow_up_note?: string;
  created_by?: string;
  created_by_type: string;
  created_at: string;
  updated_at: string;
}

export type CRMStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "deal_update"
  | "agent_action"
  | "follow_up";

export const STAGES: { id: CRMStage; label: string; color: string }[] = [
  { id: "lead", label: "Lead", color: "bg-gray-400" },
  { id: "qualified", label: "Qualified", color: "bg-blue-500" },
  { id: "proposal", label: "Proposal", color: "bg-yellow-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { id: "won", label: "Won", color: "bg-green-500" },
  { id: "lost", label: "Lost", color: "bg-red-500" },
];

export interface Activity {
  id: string;
  contact_id: string;
  type: ActivityType;
  title?: string;
  content?: string;
  activity_metadata?: Record<string, unknown>;
  performed_by?: string;
  performer_type?: "user" | "agent";
  performer_name?: string;
  created_at: string;
}

// ─── Seed data for development ─────────────────────────────────────
const SEED_CONTACTS: Contact[] = [
  {
    id: "seed-1",
    name: "Rahul Mehta",
    email: "rahul@acmecorp.in",
    phone: "+91 98765 43210",
    company: "Acme Corp",
    title: "CTO",
    stage: "qualified",
    stage_changed_at: "2026-03-10T10:00:00Z",
    value: 250000,
    currency: "INR",
    source: "conference",
    tags: ["enterprise", "tech"],
    notes: "Met at TechSummit 2026. Interested in our platform.",
    last_contacted_at: "2026-03-12T14:30:00Z",
    next_follow_up_at: "2026-03-20T10:00:00Z",
    follow_up_note: "Send demo link",
    created_by: "dev-user-001",
    created_by_type: "user",
    created_at: "2026-03-08T09:00:00Z",
    updated_at: "2026-03-12T14:30:00Z",
  },
  {
    id: "seed-2",
    name: "Priya Sharma",
    email: "priya@startupxyz.com",
    phone: "+91 87654 32109",
    company: "StartupXYZ",
    title: "Founder & CEO",
    stage: "proposal",
    stage_changed_at: "2026-03-11T15:00:00Z",
    value: 180000,
    currency: "INR",
    source: "referral",
    tags: ["startup", "saas"],
    notes: "Referred by Vikram. Needs onboarding by end of March.",
    last_contacted_at: "2026-03-13T11:00:00Z",
    created_by: "dev-user-001",
    created_by_type: "user",
    created_at: "2026-03-05T12:00:00Z",
    updated_at: "2026-03-13T11:00:00Z",
  },
  {
    id: "seed-3",
    name: "Vikram Patel",
    email: "vikram@globaltech.io",
    company: "GlobalTech",
    title: "VP Engineering",
    stage: "negotiation",
    stage_changed_at: "2026-03-09T09:00:00Z",
    value: 500000,
    currency: "INR",
    source: "website",
    tags: ["enterprise", "priority"],
    notes: "Final pricing discussion scheduled. Wants annual contract.",
    last_contacted_at: "2026-03-14T16:00:00Z",
    next_follow_up_at: "2026-03-18T14:00:00Z",
    follow_up_note: "Send revised pricing proposal",
    created_by: "dev-user-001",
    created_by_type: "user",
    created_at: "2026-02-28T08:00:00Z",
    updated_at: "2026-03-14T16:00:00Z",
  },
  {
    id: "seed-4",
    name: "Anjali Desai",
    email: "anjali@novacorp.in",
    phone: "+91 76543 21098",
    company: "NovaCorp",
    title: "Product Manager",
    stage: "lead",
    stage_changed_at: "2026-03-14T08:00:00Z",
    value: 75000,
    currency: "INR",
    source: "website",
    tags: ["smb"],
    created_by: "dev-user-001",
    created_by_type: "user",
    created_at: "2026-03-14T08:00:00Z",
    updated_at: "2026-03-14T08:00:00Z",
  },
  {
    id: "seed-5",
    name: "Arjun Nair",
    email: "arjun@bluewave.co",
    company: "BlueWave Solutions",
    title: "Head of Operations",
    stage: "won",
    stage_changed_at: "2026-03-07T17:00:00Z",
    value: 320000,
    currency: "INR",
    source: "referral",
    tags: ["enterprise", "signed"],
    notes: "Contract signed! Onboarding starts next week.",
    last_contacted_at: "2026-03-07T17:00:00Z",
    created_by: "dev-user-001",
    created_by_type: "user",
    created_at: "2026-02-15T10:00:00Z",
    updated_at: "2026-03-07T17:00:00Z",
  },
  {
    id: "seed-6",
    name: "Neha Gupta",
    email: "neha@quickship.in",
    phone: "+91 65432 10987",
    company: "QuickShip Logistics",
    title: "Director of Technology",
    stage: "lead",
    stage_changed_at: "2026-03-15T06:00:00Z",
    currency: "INR",
    tags: ["logistics"],
    created_by: "dev-user-001",
    created_by_type: "user",
    created_at: "2026-03-15T06:00:00Z",
    updated_at: "2026-03-15T06:00:00Z",
  },
];

const SEED_ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    contact_id: "seed-1",
    type: "meeting",
    title: "Initial discovery call",
    content:
      "Discussed their current tech stack and pain points. Very interested in automation features.",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-08T10:00:00Z",
  },
  {
    id: "act-2",
    contact_id: "seed-1",
    type: "email",
    title: "Sent product overview deck",
    content: "Shared the enterprise overview deck and case studies.",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-09T14:00:00Z",
  },
  {
    id: "act-3",
    contact_id: "seed-1",
    type: "deal_update",
    title: "Stage changed: Lead → Qualified",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "act-4",
    contact_id: "seed-1",
    type: "call",
    title: "Follow-up call — demo walkthrough",
    content:
      "Showed the platform live. Rahul was impressed with the agent system. Wants to loop in their VP.",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-12T14:30:00Z",
  },
  {
    id: "act-5",
    contact_id: "seed-2",
    type: "note",
    title: "Referral from Vikram",
    content:
      "Vikram Patel introduced Priya. She is building a SaaS product and needs our platform for internal comms.",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-05T12:00:00Z",
  },
  {
    id: "act-6",
    contact_id: "seed-2",
    type: "deal_update",
    title: "Stage changed: Qualified → Proposal",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-11T15:00:00Z",
  },
  {
    id: "act-7",
    contact_id: "seed-3",
    type: "meeting",
    title: "Pricing negotiation meeting",
    content:
      "Discussed annual vs monthly pricing. Vikram prefers annual with volume discount.",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-14T16:00:00Z",
  },
  {
    id: "act-8",
    contact_id: "seed-3",
    type: "agent_action",
    title: "CRM Agent: Updated deal value",
    content: "Automatically updated deal value to ₹5,00,000 based on call notes.",
    performer_type: "agent",
    performer_name: "@crm-agent",
    created_at: "2026-03-14T16:15:00Z",
  },
  {
    id: "act-9",
    contact_id: "seed-5",
    type: "deal_update",
    title: "Stage changed: Negotiation → Won",
    content: "Contract signed! 🎉",
    performer_type: "user",
    performer_name: "You",
    created_at: "2026-03-07T17:00:00Z",
  },
];

interface CRMState {
  contacts: Contact[];
  activities: Record<string, Activity[]>;
  selectedContactId: string | null;
  view: "pipeline" | "table";
  searchQuery: string;

  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  removeContact: (id: string) => void;
  setSelectedContact: (id: string | null) => void;
  setView: (view: "pipeline" | "table") => void;
  setSearchQuery: (query: string) => void;
  addActivity: (activity: Activity) => void;
  setActivities: (contactId: string, activities: Activity[]) => void;
  getActivitiesForContact: (contactId: string) => Activity[];

  // Derived
  getContactsByStage: (stage: CRMStage) => Contact[];
}

// Group seed activities by contact_id
function groupActivities(
  activities: Activity[]
): Record<string, Activity[]> {
  const grouped: Record<string, Activity[]> = {};
  for (const act of activities) {
    const list = grouped[act.contact_id] ?? [];
    grouped[act.contact_id] = [...list, act];
  }
  return grouped;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  contacts: SEED_CONTACTS,
  activities: groupActivities(SEED_ACTIVITIES),
  selectedContactId: null,
  view: "pipeline",
  searchQuery: "",

  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) =>
    set((s) => ({ contacts: [...s.contacts, contact] })),
  updateContact: (id, updates) =>
    set((s) => ({
      contacts: s.contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  removeContact: (id) =>
    set((s) => ({
      contacts: s.contacts.filter((c) => c.id !== id),
      selectedContactId:
        s.selectedContactId === id ? null : s.selectedContactId,
    })),
  setSelectedContact: (id) => set({ selectedContactId: id }),
  setView: (view) => set({ view }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addActivity: (activity) =>
    set((s) => {
      const existing = s.activities[activity.contact_id] ?? [];
      return {
        activities: {
          ...s.activities,
          [activity.contact_id]: [...existing, activity],
        },
      };
    }),

  setActivities: (contactId, activities) =>
    set((s) => ({
      activities: { ...s.activities, [contactId]: activities },
    })),

  getActivitiesForContact: (contactId) => {
    const { activities } = get();
    return (activities[contactId] ?? []).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getContactsByStage: (stage) => {
    const { contacts, searchQuery } = get();
    let filtered = contacts.filter((c) => c.stage === stage);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  },
}));
