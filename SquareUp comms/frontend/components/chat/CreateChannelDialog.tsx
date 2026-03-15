"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { X } from "lucide-react";

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
      });

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
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                {t === "public" ? "# Public" : "🔒 Private"}
              </button>
            ))}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="channel-name" className="block text-sm font-medium mb-1.5">Name</label>
            <input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="e.g. general, sales, random"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="channel-description" className="block text-sm font-medium mb-1.5">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-colors"
            />
          </div>

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
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
