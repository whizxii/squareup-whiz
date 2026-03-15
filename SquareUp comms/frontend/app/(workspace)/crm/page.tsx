"use client";

import { useState } from "react";
import {
  useCRMStore,
  Contact,
  Activity,
  ActivityType,
  STAGES,
  CRMStage,
} from "@/lib/stores/crm-store";
import { PipelineView } from "@/components/crm/PipelineView";
import {
  LayoutGrid,
  Table,
  Plus,
  Search,
  X,
  Mail,
  Phone,
  Copy,
  Check,
  ChevronRight,
  MessageSquarePlus,
  PhoneCall,
  Calendar,
  FileText,
  TrendingUp,
  Bot,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";

const STAGE_COLORS: Record<CRMStage, string> = {
  lead: "bg-gray-400 text-white",
  qualified: "bg-blue-500 text-white",
  proposal: "bg-yellow-500 text-black",
  negotiation: "bg-orange-500 text-white",
  won: "bg-green-500 text-white",
  lost: "bg-red-500 text-white",
};

const STAGE_ORDER: CRMStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
];

export default function CRMPage() {
  const {
    view,
    setView,
    searchQuery,
    setSearchQuery,
    contacts,
    selectedContactId,
    setSelectedContact,
    updateContact,
    addContact,
    getActivitiesForContact,
  } = useCRMStore();
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedContact = selectedContactId
    ? contacts.find((c) => c.id === selectedContactId) || null
    : null;

  const activities = selectedContactId
    ? getActivitiesForContact(selectedContactId)
    : [];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMoveToNextStage = () => {
    if (!selectedContact) return;
    const currentIndex = STAGE_ORDER.indexOf(selectedContact.stage);
    if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 1) return;
    const nextStage = STAGE_ORDER[currentIndex + 1];
    updateContact(selectedContact.id, {
      stage: nextStage,
      stage_changed_at: new Date().toISOString(),
    });
  };

  const stageLabel = (stage: CRMStage) =>
    STAGES.find((s) => s.id === stage)?.label || stage;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-sm">CRM</h2>

          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("pipeline")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                view === "pipeline"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Pipeline view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                view === "table"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Table view"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-8 pr-3 py-1.5 w-48 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
            />
          </div>

          {/* Add contact */}
          <button
            onClick={() => setShowCreateContact(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contact</span>
          </button>
        </div>
      </div>

      {/* Main content area with detail panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {contacts.length === 0 && !searchQuery ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">&#x1F465;</span>
                </div>
                <h3 className="text-lg font-display font-bold">
                  Your CRM starts here
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add a contact manually, or send a call recording to @crm-agent
                  and let it do the work.
                </p>
                <button
                  onClick={() => setShowCreateContact(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add your first contact
                </button>
              </div>
            </div>
          ) : view === "pipeline" ? (
            <PipelineView />
          ) : (
            <TableView />
          )}
        </div>

        {/* Contact Detail Slide-in Panel */}
        <div
          className={cn(
            "transition-all duration-300 overflow-hidden border-l border-border bg-card shrink-0",
            selectedContact ? "w-80" : "w-0 border-l-0"
          )}
        >
          {selectedContact && (
            <div className="w-80 h-full overflow-y-auto scrollbar-thin">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-display font-bold">
                  Contact Details
                </h3>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Avatar + Name */}
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">
                      {selectedContact.name}
                    </p>
                    {selectedContact.title && (
                      <p className="text-xs text-muted-foreground">
                        {selectedContact.title}
                      </p>
                    )}
                    {selectedContact.company && (
                      <p className="text-xs text-muted-foreground">
                        {selectedContact.company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="space-y-2">
                  {selectedContact.email && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">
                          {selectedContact.email}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(selectedContact.email!, "email")
                        }
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Copy email"
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">
                          {selectedContact.phone}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(selectedContact.phone!, "phone")
                        }
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Copy phone"
                      >
                        {copiedField === "phone" ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Stage badge */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Stage
                  </p>
                  <span
                    className={cn(
                      "inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                      STAGE_COLORS[selectedContact.stage]
                    )}
                  >
                    {stageLabel(selectedContact.stage)}
                  </span>
                </div>

                {/* Deal value */}
                {selectedContact.value != null && selectedContact.value > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Deal Value
                    </p>
                    <p className="text-lg font-mono font-semibold text-primary">
                      {formatCurrency(
                        selectedContact.value,
                        selectedContact.currency
                      )}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedContact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Notes
                  </p>
                  <textarea
                    value={selectedContact.notes || ""}
                    onChange={(e) =>
                      updateContact(selectedContact.id, {
                        notes: e.target.value,
                      })
                    }
                    placeholder="Add notes about this contact..."
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                  />
                </div>

                {/* Quick actions */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Quick Actions
                  </p>
                  <button
                    onClick={handleMoveToNextStage}
                    disabled={
                      selectedContact.stage === "won" ||
                      selectedContact.stage === "lost"
                    }
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    Move to next stage
                  </button>
                  <button
                    onClick={() => setShowLogActivity(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Log activity
                  </button>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Activity ({activities.length})
                  </p>
                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <div className="flex items-center justify-center h-20 border border-dashed border-border rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          No activity yet
                        </p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create contact dialog */}
      {showCreateContact && (
        <CreateContactDialog
          onClose={() => setShowCreateContact(false)}
          addContact={addContact}
        />
      )}

      {/* Log activity dialog */}
      {showLogActivity && selectedContactId && (
        <LogActivityDialog
          contactId={selectedContactId}
          onClose={() => setShowLogActivity(false)}
        />
      )}
    </div>
  );
}

/* ─── Activity Timeline Item ────────────────────────────────────── */

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <PhoneCall className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  meeting: <Calendar className="w-3.5 h-3.5" />,
  note: <FileText className="w-3.5 h-3.5" />,
  deal_update: <TrendingUp className="w-3.5 h-3.5" />,
  agent_action: <Bot className="w-3.5 h-3.5" />,
  follow_up: <Clock className="w-3.5 h-3.5" />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  email: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  meeting:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  note: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  deal_update:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  agent_action:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  follow_up:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="flex gap-3 group">
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          ACTIVITY_COLORS[activity.type]
        )}
      >
        {ACTIVITY_ICONS[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {activity.title || activity.type}
        </p>
        {activity.content && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {activity.content}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), {
              addSuffix: true,
            })}
          </span>
          {activity.performer_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">
                &middot;
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  activity.performer_type === "agent"
                    ? "text-blue-500 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {activity.performer_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Table View ────────────────────────────────────────────────── */

function TableView() {
  const contacts = useCRMStore((s) => s.contacts);
  const searchQuery = useCRMStore((s) => s.searchQuery);
  const setSelectedContact = useCRMStore((s) => s.setSelectedContact);
  const selectedContactId = useCRMStore((s) => s.selectedContactId);

  const filtered = searchQuery
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">
              Name
            </th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">
              Company
            </th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden lg:table-cell">
              Email
            </th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">
              Stage
            </th>
            <th className="text-right px-4 py-2 font-medium text-muted-foreground">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.id}
              onClick={() => setSelectedContact(c.id)}
              className={cn(
                "border-b border-border hover:bg-accent/30 cursor-pointer transition-colors",
                selectedContactId === c.id && "bg-primary/5 hover:bg-primary/10"
              )}
            >
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                {c.company || "\u2014"}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                {c.email || "\u2014"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    STAGE_COLORS[c.stage]
                  )}
                >
                  {c.stage}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {c.value
                  ? formatCurrency(c.value, c.currency || "INR")
                  : "\u2014"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Create Contact Dialog ─────────────────────────────────────── */

function CreateContactDialog({
  onClose,
  addContact,
}: {
  onClose: () => void;
  addContact: (contact: Contact) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const newContact: Contact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
      stage: "lead",
      stage_changed_at: new Date().toISOString(),
      currency: "INR",
      tags: [],
      created_by: "dev-user-001",
      created_by_type: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/api/crm/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "dev-user-001",
        },
        body: JSON.stringify({
          name: newContact.name,
          email: newContact.email,
          company: newContact.company,
          phone: newContact.phone,
        }),
      });
      if (res.ok) {
        const contact = await res.json();
        addContact({
          ...contact,
          tags:
            typeof contact.tags === "string"
              ? JSON.parse(contact.tags)
              : contact.tags || [],
        });
        onClose();
        return;
      }
    } catch {
      // API not available — use local store
    }

    // Fallback: add directly to store
    addContact(newContact);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-lg animate-fade-in-up">
        <h2 className="text-lg font-display font-bold mb-4">Add Contact</h2>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name *"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            autoFocus
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {saving ? "Creating..." : "Add Contact"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Log Activity Dialog ───────────────────────────────────────── */

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
  { value: "follow_up", label: "Follow-up" },
];

function LogActivityDialog({
  contactId,
  onClose,
}: {
  contactId: string;
  onClose: () => void;
}) {
  const addActivity = useCRMStore((s) => s.addActivity);
  const [type, setType] = useState<ActivityType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    addActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      contact_id: contactId,
      type,
      title: title.trim(),
      content: content.trim() || undefined,
      performer_type: "user",
      performer_name: "You",
      created_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-lg animate-fade-in-up">
        <h2 className="text-lg font-display font-bold mb-4">Log Activity</h2>
        <div className="space-y-3">
          {/* Activity type selector */}
          <div className="flex gap-2 flex-wrap">
            {ACTIVITY_TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  type === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Activity title *"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            autoFocus
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Details (optional)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              Log Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
