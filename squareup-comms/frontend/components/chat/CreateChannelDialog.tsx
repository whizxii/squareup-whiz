"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { X, Search, Check } from "lucide-react";

interface User {
  id: string;
  display_name: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateChannelDialog({ open, onClose }: Props) {
  const addChannel = useChatStore((s) => s.addChannel);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-fetch users when dialog opens
  if (open && users.length === 0 && !isSearching) {
    setIsSearching(true);
    api.getUsers().then(res => setUsers(res)).finally(() => setIsSearching(false));
  }

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const channel = await api.createChannel({
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        type,
        description: description.trim() || undefined,
        is_private: type === "private"
      });

      // If private and users are selected, bulk add them
      if (type === "private" && selectedUserIds.length > 0) {
        await api.addChannelMembers(channel.id, selectedUserIds);
      }

      addChannel({
        ...channel,
        unread_count: 0,
        type: channel.type as "public" | "private" | "dm" | "agent",
      });
      setActiveChannel(channel.id);
      onClose();
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Create channel">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-lg animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-accent transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <h2 className="text-lg font-display font-bold mb-4">Create Channel</h2>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["public", "private"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === t
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground border border-transparent"
                  }`}
              >
                {t === "public" ? "# Public" : "🔒 Private"}
              </button>
            ))}
          </div>

          {/* Name & Description — always shown */}
          <div>
            <label htmlFor="channel-name" className="block text-sm font-medium mb-1.5">Name</label>
            <input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleCreate(); }}
              placeholder={type === "public" ? "e.g. general, sales, random" : "e.g. project-alpha, design-team"}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="channel-description" className="block text-sm font-medium mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleCreate(); }}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
            />
          </div>

          {/* User picker — only for private channels */}
          {type === "private" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Add people to this group</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 mt-2 border border-border rounded-lg p-1 bg-background">
                {users.filter(u => u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                        } else {
                          setSelectedUserIds(prev => [...prev, u.id]);
                        }
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{u.display_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
                {users.length === 0 && !isSearching && (
                  <p className="text-center text-xs p-3 text-muted-foreground">No users found.</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || (type === "public" ? !name.trim() : selectedUserIds.length === 0)}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Creating..." : type === "public" ? "Create Channel" : "Create Group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
