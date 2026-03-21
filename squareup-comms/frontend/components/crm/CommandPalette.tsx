"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useContacts } from "@/lib/hooks/use-crm-queries";
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
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
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

// ─── ContactResult ──────────────────────────────────────────────

function ContactResult({
  contact,
  active,
  onSelect,
}: {
  contact: Contact;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        active ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/50"
      )}
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{contact.name}</p>
        {(contact.title || contact.email) && (
          <p className="text-xs text-muted-foreground truncate">
            {contact.title ?? contact.email}
          </p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground capitalize shrink-0">
        {contact.stage}
      </span>
    </button>
  );
}

// ─── ActionRow ──────────────────────────────────────────────────

function ActionRow({
  item,
  active,
  onSelect,
}: {
  item: ActionItem | NavItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        active ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/50"
      )}
    >
      <span className="w-5 h-5 text-muted-foreground shrink-0">{item.icon}</span>
      <span className="text-sm flex-1">{item.label}</span>
      {"shortcut" in item && item.shortcut && (
        <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {item.shortcut}
        </kbd>
      )}
    </button>
  );
}

// ─── CommandPalette ─────────────────────────────────────────────

export function CommandPalette() {
  const open = useCRMUIStore((s) => s.commandPaletteOpen);
  const setOpen = useCRMUIStore((s) => s.setCommandPaletteOpen);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const setActiveView = useCRMUIStore((s) => s.setActiveView);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const { data: contactsData } = useContacts(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined,
    { limit: 5 }
  );
  const contacts: Contact[] = contactsData?.items ?? [];

  const actions: ActionItem[] = useMemo(
    () => [
      {
        id: "new-contact",
        label: "New Contact",
        icon: <UserPlus className="w-4 h-4" />,
        shortcut: "⌘⇧N",
        onSelect: () => { openDialog("create-contact"); setOpen(false); },
      },
      {
        id: "new-deal",
        label: "New Deal",
        icon: <TrendingUp className="w-4 h-4" />,
        shortcut: "⌘⇧D",
        onSelect: () => { openDialog("create-deal"); setOpen(false); },
      },
      {
        id: "log-activity",
        label: "Log Activity",
        icon: <ClipboardList className="w-4 h-4" />,
        shortcut: "⌘⇧A",
        onSelect: () => { openDialog("log-activity"); setOpen(false); },
      },
      {
        id: "upload-recording",
        label: "Upload Recording",
        icon: <Mic className="w-4 h-4" />,
        onSelect: () => { openDialog("upload-recording"); setOpen(false); },
      },
    ],
    [openDialog, setOpen]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        onSelect: () => { setActiveView("dashboard"); setOpen(false); },
      },
      {
        id: "nav-pipeline",
        label: "Go to Pipeline",
        icon: <GitBranch className="w-4 h-4" />,
        onSelect: () => { setActiveView("pipeline"); setOpen(false); },
      },
      {
        id: "nav-calendar",
        label: "Go to Calendar",
        icon: <Calendar className="w-4 h-4" />,
        onSelect: () => { setActiveView("calendar"); setOpen(false); },
      },
      {
        id: "nav-analytics",
        label: "Go to Analytics",
        icon: <BarChart2 className="w-4 h-4" />,
        onSelect: () => { setActiveView("analytics"); setOpen(false); },
      },
    ],
    [setActiveView, setOpen]
  );

  // Build flat list of all selectable items for keyboard nav
  const allItems = useMemo(() => {
    const items: { onSelect: () => void }[] = [];
    if (debouncedQuery.length >= 2) {
      contacts.forEach((c) =>
        items.push({ onSelect: () => { /* handled inline */ } })
      );
    } else {
      actions.forEach((a) => items.push(a));
      navItems.forEach((n) => items.push(n));
    }
    return items;
  }, [debouncedQuery, contacts, actions, navItems]);

  // Flat ordered list with type tags for rendering
  const flatItems = useMemo(() => {
    if (debouncedQuery.length >= 2) {
      return contacts.map((c) => ({ type: "contact" as const, data: c }));
    }
    const filtered_actions = actions.filter((a) =>
      query.length === 0 || a.label.toLowerCase().includes(query.toLowerCase())
    );
    const filtered_nav = navItems.filter((n) =>
      query.length === 0 || n.label.toLowerCase().includes(query.toLowerCase())
    );
    return [
      ...filtered_actions.map((a) => ({ type: "action" as const, data: a })),
      ...filtered_nav.map((n) => ({ type: "nav" as const, data: n })),
    ];
  }, [debouncedQuery, contacts, actions, navItems, query]);

  // Reset state when opened/closed
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Reset active index when list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length]);

  const handleSelect = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (!item) return;
      if (item.type === "contact") {
        // Navigate to contact — dispatch via store if available, else close
        setOpen(false);
      } else {
        item.data.onSelect();
      }
    },
    [flatItems, setOpen]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
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
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, flatItems.length, activeIndex, handleSelect, setOpen]);

  if (!open) return null;

  const showContactResults = debouncedQuery.length >= 2;
  const showActions = !showContactResults;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts or type a command…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd
            onClick={() => setOpen(false)}
            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded cursor-pointer"
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {showContactResults && (
            <>
              {contacts.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No contacts found for &quot;{debouncedQuery}&quot;
                </p>
              ) : (
                <>
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Contacts
                  </p>
                  {contacts.map((contact, i) => (
                    <ContactResult
                      key={contact.id}
                      contact={contact}
                      active={activeIndex === i}
                      onSelect={() => {
                        setOpen(false);
                        // Navigate to contact detail
                        window.dispatchEvent(
                          new CustomEvent("crm:navigate-contact", {
                            detail: { contactId: contact.id },
                          })
                        );
                      }}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {showActions && (
            <>
              {/* Actions group */}
              {actions.filter((a) =>
                query.length === 0 ||
                a.label.toLowerCase().includes(query.toLowerCase())
              ).length > 0 && (
                <>
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Actions
                  </p>
                  {actions
                    .filter(
                      (a) =>
                        query.length === 0 ||
                        a.label.toLowerCase().includes(query.toLowerCase())
                    )
                    .map((action, i) => (
                      <ActionRow
                        key={action.id}
                        item={action}
                        active={activeIndex === i}
                        onSelect={action.onSelect}
                      />
                    ))}
                </>
              )}

              {/* Navigate group */}
              {navItems.filter((n) =>
                query.length === 0 ||
                n.label.toLowerCase().includes(query.toLowerCase())
              ).length > 0 && (
                <>
                  <div className="my-1 border-t border-border" />
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Navigate
                  </p>
                  {navItems
                    .filter(
                      (n) =>
                        query.length === 0 ||
                        n.label.toLowerCase().includes(query.toLowerCase())
                    )
                    .map((nav, i) => (
                      <ActionRow
                        key={nav.id}
                        item={nav}
                        active={activeIndex === actions.filter(
                          (a) => query.length === 0 || a.label.toLowerCase().includes(query.toLowerCase())
                        ).length + i}
                        onSelect={nav.onSelect}
                      />
                    ))}
                </>
              )}

              {flatItems.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No results for &quot;{query}&quot;
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="bg-muted px-1 py-0.5 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-muted px-1 py-0.5 rounded">↵</kbd> select</span>
          <span><kbd className="bg-muted px-1 py-0.5 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
