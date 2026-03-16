import { create } from "zustand";
import { crmApi } from "@/lib/api/crm-api";

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

interface CRMState {
  contacts: Contact[];
  activities: Record<string, Activity[]>;
  selectedContactId: string | null;
  view: "pipeline" | "table";
  searchQuery: string;
  loading: boolean;
  error: string | null;

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

  // Async API actions
  fetchContacts: () => Promise<void>;
  fetchActivities: (contactId: string) => Promise<void>;

  // Derived
  getContactsByStage: (stage: CRMStage) => Contact[];
}

export const useCRMStore = create<CRMState>((set, get) => ({
  contacts: [],
  activities: {},
  selectedContactId: null,
  view: "pipeline",
  searchQuery: "",
  loading: false,
  error: null,

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

  fetchContacts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await crmApi.listContacts();
      set({ contacts: response.items as Contact[], loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch contacts";
      set({ error: message, loading: false });
    }
  },

  fetchActivities: async (contactId) => {
    try {
      const response = await crmApi.listActivities(contactId);
      const { setActivities } = get();
      setActivities(contactId, response.items as Activity[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch activities";
      set({ error: message });
    }
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
