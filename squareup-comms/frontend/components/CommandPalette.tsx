"use client";

import { Command } from "cmdk";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MessageSquare,
  Users,
  FolderOpen,
  Bot,
  Settings,
  Plus,
  Search,
  Hash,
  User,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useCRMStore } from "@/lib/stores/crm-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { useDriveStore } from "@/lib/stores/drive-store";

const GROUP_HEADING_CLASSES =
  "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5";

// Shared open state so the search button in the topbar can trigger the palette
let externalOpen: (() => void) | null = null;
export function openCommandPalette() {
  externalOpen?.();
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const channels = useChatStore((s) => s.channels);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const contacts = useCRMStore((s) => s.contacts);
  const setSelectedContact = useCRMStore((s) => s.setSelectedContact);
  const agents = useAgentStore((s) => s.agents);
  const setSelectedAgent = useAgentStore((s) => s.setSelectedAgent);
  const files = useDriveStore((s) => s.files);

  const isSearching = search.trim().length > 0;
  const maxVisible = isSearching ? 8 : 3;

  const visibleChannels = useMemo(
    () => channels.slice(0, maxVisible),
    [channels, maxVisible]
  );
  const visibleContacts = useMemo(
    () => contacts.slice(0, maxVisible),
    [contacts, maxVisible]
  );
  const visibleAgents = useMemo(
    () => agents.slice(0, maxVisible),
    [agents, maxVisible]
  );
  const visibleFiles = useMemo(
    () => files.slice(0, maxVisible),
    [files, maxVisible]
  );

  // Register external opener
  useEffect(() => {
    externalOpen = () => setOpen(true);
    return () => {
      externalOpen = null;
    };
  }, []);

  // Toggle with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset search when closing
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const selectChannel = (channelId: string) => {
    setActiveChannel(channelId);
    router.push("/chat");
    setOpen(false);
  };

  const openContact = (contactId: string) => {
    setSelectedContact(contactId);
    router.push("/crm");
    setOpen(false);
  };

  const openAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    router.push("/agents");
    setOpen(false);
  };

  const openFile = () => {
    router.push("/drive");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Command palette" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 350,
              mass: 0.8
            }}
            className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg origin-top"
          >
            <Command
              className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-2xl overflow-hidden"
              label="Command palette"
            >
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Command.Input
                  placeholder="Search commands, contacts, agents, files..."
                  className="w-full py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  value={search}
                  onValueChange={setSearch}
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground shrink-0">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {/* Navigation */}
                <Command.Group heading="Navigate" className={GROUP_HEADING_CLASSES}>
                  <CommandItem
                    icon={<Building2 className="w-4 h-4" />}
                    onSelect={() => navigate("/office")}
                  >
                    Office
                  </CommandItem>
                  <CommandItem
                    icon={<MessageSquare className="w-4 h-4" />}
                    onSelect={() => navigate("/chat")}
                  >
                    Chat
                  </CommandItem>
                  <CommandItem
                    icon={<Users className="w-4 h-4" />}
                    onSelect={() => navigate("/crm")}
                  >
                    CRM
                  </CommandItem>
                  <CommandItem
                    icon={<FolderOpen className="w-4 h-4" />}
                    onSelect={() => navigate("/drive")}
                  >
                    Drive
                  </CommandItem>
                  <CommandItem
                    icon={<Bot className="w-4 h-4" />}
                    onSelect={() => navigate("/agents")}
                  >
                    Agents
                  </CommandItem>
                  <CommandItem
                    icon={<Settings className="w-4 h-4" />}
                    onSelect={() => navigate("/settings")}
                  >
                    Settings
                  </CommandItem>
                </Command.Group>

                {/* Channels */}
                {channels.length > 0 && (
                  <Command.Group heading="Channels" className={GROUP_HEADING_CLASSES}>
                    {visibleChannels.map((ch) => (
                      <CommandItem
                        key={ch.id}
                        icon={<Hash className="w-4 h-4" />}
                        subtitle={ch.description || ch.type}
                        onSelect={() => selectChannel(ch.id)}
                      >
                        {ch.name}
                      </CommandItem>
                    ))}
                    {channels.length > maxVisible && (
                      <CommandItem
                        icon={<ArrowRight className="w-4 h-4" />}
                        onSelect={() => navigate("/chat")}
                        muted
                      >
                        View all {channels.length} channels
                      </CommandItem>
                    )}
                  </Command.Group>
                )}

                {/* Contacts */}
                {contacts.length > 0 && (
                  <Command.Group heading="Contacts" className={GROUP_HEADING_CLASSES}>
                    {visibleContacts.map((c) => (
                      <CommandItem
                        key={c.id}
                        icon={<User className="w-4 h-4" />}
                        subtitle={[c.title, c.company].filter(Boolean).join(" at ") || undefined}
                        onSelect={() => openContact(c.id)}
                      >
                        {c.name}
                      </CommandItem>
                    ))}
                    {contacts.length > maxVisible && (
                      <CommandItem
                        icon={<ArrowRight className="w-4 h-4" />}
                        onSelect={() => navigate("/crm")}
                        muted
                      >
                        View all {contacts.length} contacts
                      </CommandItem>
                    )}
                  </Command.Group>
                )}

                {/* Agents */}
                {agents.length > 0 && (
                  <Command.Group heading="Agents" className={GROUP_HEADING_CLASSES}>
                    {visibleAgents.map((a) => (
                      <CommandItem
                        key={a.id}
                        icon={
                          a.office_station_icon ? (
                            <span className="text-sm w-4 text-center">{a.office_station_icon}</span>
                          ) : (
                            <Bot className="w-4 h-4" />
                          )
                        }
                        subtitle={a.status === "idle" ? "Online" : a.status}
                        onSelect={() => openAgent(a.id)}
                      >
                        {a.name}
                      </CommandItem>
                    ))}
                    {agents.length > maxVisible && (
                      <CommandItem
                        icon={<ArrowRight className="w-4 h-4" />}
                        onSelect={() => navigate("/agents")}
                        muted
                      >
                        View all {agents.length} agents
                      </CommandItem>
                    )}
                  </Command.Group>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <Command.Group heading="Files" className={GROUP_HEADING_CLASSES}>
                    {visibleFiles.map((f) => (
                      <CommandItem
                        key={f.id}
                        icon={<FileText className="w-4 h-4" />}
                        subtitle={f.folder}
                        onSelect={openFile}
                      >
                        {f.name}
                      </CommandItem>
                    ))}
                    {files.length > maxVisible && (
                      <CommandItem
                        icon={<ArrowRight className="w-4 h-4" />}
                        onSelect={() => navigate("/drive")}
                        muted
                      >
                        View all {files.length} files
                      </CommandItem>
                    )}
                  </Command.Group>
                )}

                {/* Actions */}
                <Command.Group heading="Actions" className={GROUP_HEADING_CLASSES}>
                  <CommandItem
                    icon={<Plus className="w-4 h-4" />}
                    onSelect={() => navigate("/chat")}
                  >
                    New Channel
                  </CommandItem>
                  <CommandItem
                    icon={<Plus className="w-4 h-4" />}
                    onSelect={() => navigate("/crm")}
                  >
                    New Contact
                  </CommandItem>
                </Command.Group>
              </Command.List>

              {/* Footer — keyboard hints */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono">esc</kbd>
                  close
                </span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CommandItem({
  children,
  icon,
  subtitle,
  onSelect,
  muted,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  subtitle?: string;
  onSelect: () => void;
  muted?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="sq-tap flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary text-muted-foreground transition-all duration-150 relative group"
    >
      <span className="shrink-0 transition-transform group-active:scale-95 group-data-[selected=true]:scale-110">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={muted ? "text-xs opacity-70" : ""}>{children}</span>
        {subtitle && (
          <span className="block text-[11px] text-muted-foreground/60 truncate">
            {subtitle}
          </span>
        )}
      </span>
    </Command.Item>
  );
}
