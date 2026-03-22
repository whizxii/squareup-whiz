"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useContacts, useAICopilot } from "@/lib/hooks/use-crm-queries";
import type { Contact } from "@/lib/types/crm";
import {
  Search,
  X,
  UserPlus,
  TrendingUp,
  ClipboardList,
  Mic,
  LayoutDashboard,
  GitBranch,
  Calendar,
  BarChart2,
  User,
  Building2,
  Zap,
  ListFilter,
  Mail,
  ScrollText,
  Sparkles,
  ArrowRight,
  FileDown,
  FileUp,
  Loader2,
  Bot,
  Users,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  shortcut?: string;
  category: "contact" | "action" | "navigate" | "ai";
  onSelect: () => void;
}

// ─── useDebounce ────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Result Row ─────────────────────────────────────────────────

function PaletteRow({
  item,
  active,
}: {
  item: PaletteItem;
  active: boolean;
}) {
  return (
    <button
      onClick={item.onSelect}
      className={cn(
        "w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-foreground hover:bg-accent/50",
      )}
    >
      {item.category === "contact" ? (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
          {item.label.charAt(0).toUpperCase()}
        </div>
      ) : (
        <span className="w-5 h-5 text-muted-foreground shrink-0">
          {item.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.label}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        )}
      </div>
      {item.shortcut && (
        <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {item.shortcut}
        </kbd>
      )}
      {item.category === "navigate" && (
        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

// ─── AI Response ────────────────────────────────────────────────

function AIResponse({
  message,
  isLoading,
}: {
  message: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Thinking...</span>
      </div>
    );
  }
  if (!message) return null;
  return (
    <div className="px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap border-t border-border">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">{message}</div>
      </div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      {label}
    </p>
  );
}

// ─── CommandPalette ─────────────────────────────────────────────

export function CommandPalette() {
  const open = useCRMUIStore((s) => s.commandPaletteOpen);
  const setOpen = useCRMUIStore((s) => s.setCommandPaletteOpen);
  const mode = useCRMUIStore((s) => s.commandPaletteMode);
  const setMode = useCRMUIStore((s) => s.setCommandPaletteMode);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const setActiveView = useCRMUIStore((s) => s.setActiveView);
  const setSelectedContactId = useCRMUIStore((s) => s.setSelectedContactId);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const copilot = useAICopilot();

  // ─── Contact search ─────────────────────────────────────────
  const { data: contactsData } = useContacts(
    mode === "search" && debouncedQuery.length >= 2
      ? { search: debouncedQuery }
      : undefined,
    { limit: 5 },
  );
  const contacts: Contact[] = contactsData?.items ?? [];

  // ─── Close helper ───────────────────────────────────────────
  const close = useCallback(() => {
    setOpen(false);
    setAiResponse(null);
  }, [setOpen]);

  // ─── Navigate to contact ────────────────────────────────────
  const navigateToContact = useCallback(
    (contact: Contact) => {
      setSelectedContactId(contact.id);
      setActiveView("table");
      close();
      window.dispatchEvent(
        new CustomEvent("crm:navigate-contact", {
          detail: { contactId: contact.id },
        }),
      );
    },
    [setSelectedContactId, setActiveView, close],
  );

  // ─── Action items ───────────────────────────────────────────
  const actions: PaletteItem[] = useMemo(
    () => [
      {
        id: "new-contact",
        label: "New Contact",
        icon: <UserPlus className="w-4 h-4" />,
        shortcut: "\u2318\u21e7N",
        category: "action",
        onSelect: () => {
          openDialog("create-contact");
          close();
        },
      },
      {
        id: "new-deal",
        label: "New Deal",
        icon: <TrendingUp className="w-4 h-4" />,
        shortcut: "\u2318\u21e7D",
        category: "action",
        onSelect: () => {
          openDialog("create-deal");
          close();
        },
      },
      {
        id: "log-activity",
        label: "Log Activity",
        icon: <ClipboardList className="w-4 h-4" />,
        shortcut: "\u2318\u21e7A",
        category: "action",
        onSelect: () => {
          openDialog("log-activity");
          close();
        },
      },
      {
        id: "create-event",
        label: "New Calendar Event",
        icon: <Calendar className="w-4 h-4" />,
        category: "action",
        onSelect: () => {
          openDialog("create-event");
          close();
        },
      },
      {
        id: "upload-recording",
        label: "Upload Recording",
        icon: <Mic className="w-4 h-4" />,
        category: "action",
        onSelect: () => {
          openDialog("upload-recording");
          close();
        },
      },
      {
        id: "import",
        label: "Import Contacts",
        icon: <FileUp className="w-4 h-4" />,
        category: "action",
        onSelect: () => {
          openDialog("import");
          close();
        },
      },
      {
        id: "export",
        label: "Export Data",
        icon: <FileDown className="w-4 h-4" />,
        category: "action",
        onSelect: () => {
          openDialog("export");
          close();
        },
      },
    ],
    [openDialog, close],
  );

  // ─── Navigation items ──────────────────────────────────────
  const navItems: PaletteItem[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("dashboard");
          close();
        },
      },
      {
        id: "nav-pipeline",
        label: "Pipeline",
        icon: <GitBranch className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("pipeline");
          close();
        },
      },
      {
        id: "nav-contacts",
        label: "Contacts Table",
        icon: <Users className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("table");
          close();
        },
      },
      {
        id: "nav-calendar",
        label: "Calendar",
        icon: <Calendar className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("calendar");
          close();
        },
      },
      {
        id: "nav-analytics",
        label: "Analytics",
        icon: <BarChart2 className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("analytics");
          close();
        },
      },
      {
        id: "nav-leads",
        label: "Lead Scoring",
        icon: <Sparkles className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("leads");
          close();
        },
      },
      {
        id: "nav-companies",
        label: "Companies",
        icon: <Building2 className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("companies");
          close();
        },
      },
      {
        id: "nav-sequences",
        label: "Email Sequences",
        icon: <Mail className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("sequences");
          close();
        },
      },
      {
        id: "nav-workflows",
        label: "Workflows",
        icon: <Zap className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("workflows");
          close();
        },
      },
      {
        id: "nav-smart-lists",
        label: "Smart Lists",
        icon: <ListFilter className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("smart_lists");
          close();
        },
      },
      {
        id: "nav-digest",
        label: "Weekly Digest",
        icon: <ScrollText className="w-4 h-4" />,
        category: "navigate",
        onSelect: () => {
          setActiveView("digest");
          close();
        },
      },
    ],
    [setActiveView, close],
  );

  // ─── Flat list for keyboard navigation ─────────────────────
  const flatItems: PaletteItem[] = useMemo(() => {
    if (mode === "ai") return [];

    const q = query.toLowerCase().trim();

    // Contact search mode
    if (debouncedQuery.length >= 2) {
      return contacts.map(
        (c): PaletteItem => ({
          id: c.id,
          label: c.name,
          description: [c.title, c.company, c.email]
            .filter(Boolean)
            .join(" \u00b7 "),
          icon: <User className="w-4 h-4" />,
          category: "contact",
          onSelect: () => navigateToContact(c),
        }),
      );
    }

    // Filter actions + nav by query
    const matchedActions = q
      ? actions.filter((a) => a.label.toLowerCase().includes(q))
      : actions;
    const matchedNav = q
      ? navItems.filter((n) => n.label.toLowerCase().includes(q))
      : navItems;

    return [...matchedActions, ...matchedNav];
  }, [mode, query, debouncedQuery, contacts, actions, navItems, navigateToContact]);

  // ─── Reset on open/close ────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setAiResponse(null);
      setMode("search");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, setMode]);

  // Reset active index on list change
  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ─── AI query submission ────────────────────────────────────
  const submitAIQuery = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setAiResponse(null);
      try {
        const result = await copilot.mutateAsync({ query: q });
        setAiResponse(result.message);
      } catch {
        setAiResponse("Sorry, something went wrong. Please try again.");
      }
    },
    [copilot],
  );

  // ─── Handle selection ──────────────────────────────────────
  const handleSelect = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (!item) return;
      item.onSelect();
    },
    [flatItems],
  );

  // ─── Keyboard handler ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Tab toggles mode
      if (e.key === "Tab") {
        e.preventDefault();
        const next = mode === "search" ? "ai" : "search";
        setMode(next);
        setAiResponse(null);
        setActiveIndex(0);
        return;
      }
      if (mode === "ai") {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submitAIQuery(query);
        } else if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
        return;
      }
      // Search mode keyboard nav
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(activeIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    open,
    mode,
    query,
    flatItems.length,
    activeIndex,
    handleSelect,
    close,
    setMode,
    submitAIQuery,
  ]);

  if (!open) return null;

  // Group items by category for section headers
  const contactItems = flatItems.filter((i) => i.category === "contact");
  const actionItems = flatItems.filter((i) => i.category === "action");
  const navigateItems = flatItems.filter((i) => i.category === "navigate");

  // Build ordered list with section info for active index
  const orderedSections: { label: string; items: PaletteItem[] }[] = [];
  if (contactItems.length > 0)
    orderedSections.push({ label: "Contacts", items: contactItems });
  if (actionItems.length > 0)
    orderedSections.push({ label: "Actions", items: actionItems });
  if (navigateItems.length > 0)
    orderedSections.push({ label: "Navigate", items: navigateItems });

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
        {/* Mode tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => {
              setMode("search");
              setAiResponse(null);
            }}
            className={cn(
              "flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
              mode === "search"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          <button
            onClick={() => {
              setMode("ai");
              setAiResponse(null);
              setTimeout(() => inputRef.current?.focus(), 10);
            }}
            className={cn(
              "flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
              mode === "ai"
                ? "text-foreground border-b-2 border-purple-500"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Copilot
          </button>
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {mode === "ai" ? (
            <Bot className="w-4 h-4 text-purple-500 shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "ai"
                ? "Ask anything... e.g. 'show hot leads' or 'create deal for John'"
                : "Search contacts, actions, views..."
            }
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                setAiResponse(null);
              }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd
            onClick={close}
            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded cursor-pointer"
          >
            Esc
          </kbd>
        </div>

        {/* Results / AI Response */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {mode === "ai" ? (
            <div className="p-2">
              <AIResponse
                message={aiResponse}
                isLoading={copilot.isPending}
              />
              {!aiResponse && !copilot.isPending && (
                <div className="space-y-1 py-2">
                  <SectionHeader label="Quick prompts" />
                  {[
                    "Show my hot leads",
                    "At-risk deals this week",
                    "Summarize pipeline",
                    "What should I do today?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setQuery(prompt);
                        submitAIQuery(prompt);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {orderedSections.map((section) => {
                const sectionStart = runningIndex;
                const rows = section.items.map((item, i) => {
                  const idx = sectionStart + i;
                  return (
                    <div key={item.id} data-active={activeIndex === idx}>
                      <PaletteRow item={item} active={activeIndex === idx} />
                    </div>
                  );
                });
                runningIndex += section.items.length;
                return (
                  <div key={section.label}>
                    {section !== orderedSections[0] && (
                      <div className="my-1 border-t border-border" />
                    )}
                    <SectionHeader label={section.label} />
                    {rows}
                  </div>
                );
              })}
              {flatItems.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {debouncedQuery.length >= 2
                    ? `No results for "${debouncedQuery}"`
                    : `No matches for "${query}"`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>
            <kbd className="bg-muted px-1 py-0.5 rounded">Tab</kbd>{" "}
            {mode === "search" ? "AI mode" : "search"}
          </span>
          {mode === "search" ? (
            <>
              <span>
                <kbd className="bg-muted px-1 py-0.5 rounded">&uarr;&darr;</kbd>{" "}
                navigate
              </span>
              <span>
                <kbd className="bg-muted px-1 py-0.5 rounded">&crarr;</kbd>{" "}
                select
              </span>
            </>
          ) : (
            <span>
              <kbd className="bg-muted px-1 py-0.5 rounded">&crarr;</kbd> ask
            </span>
          )}
          <span>
            <kbd className="bg-muted px-1 py-0.5 rounded">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
