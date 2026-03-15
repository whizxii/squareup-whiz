"use client";

import { useChatStore, Channel } from "@/lib/stores/chat-store";
import { Hash, Lock, Bot, MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const channelIcon = (channel: Channel) => {
  switch (channel.type) {
    case "dm":
      return <MessageSquare className="w-4 h-4" />;
    case "agent":
      return <Bot className="w-4 h-4 text-sq-agent" />;
    case "private":
      return <Lock className="w-4 h-4" />;
    default:
      return <Hash className="w-4 h-4" />;
  }
};

export function ChannelList({
  onCreateChannel,
}: {
  onCreateChannel?: () => void;
}) {
  const channels = useChatStore((s) => s.channels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  const publicChannels = channels.filter(
    (c) => c.type === "public" || c.type === "private"
  );
  const dmChannels = channels.filter((c) => c.type === "dm");
  const agentChannels = channels.filter((c) => c.type === "agent");

  return (
    <nav className="flex flex-col h-full overflow-y-auto scrollbar-thin" aria-label="Channel list">
      {/* Channels section */}
      <ChannelSection
        title="Channels"
        channels={publicChannels}
        activeId={activeChannelId}
        onSelect={setActiveChannel}
        onAdd={onCreateChannel}
      />

      {/* DMs section */}
      {dmChannels.length > 0 && (
        <ChannelSection
          title="Direct Messages"
          channels={dmChannels}
          activeId={activeChannelId}
          onSelect={setActiveChannel}
        />
      )}

      {/* Agent channels */}
      {agentChannels.length > 0 && (
        <ChannelSection
          title="Agents"
          channels={agentChannels}
          activeId={activeChannelId}
          onSelect={setActiveChannel}
        />
      )}

      {/* Empty state */}
      {channels.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">No channels yet</p>
            <button
              onClick={onCreateChannel}
              className="text-sm text-primary hover:underline"
            >
              Create your first channel
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function ChannelSection({
  title,
  channels,
  activeId,
  onSelect,
  onAdd,
}: {
  title: string;
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
        >
          {title}
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="p-0.5 rounded hover:bg-accent transition-colors"
            aria-label={`Add new channel`}
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {!collapsed &&
        channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.id)}
            aria-current={activeId === channel.id ? "page" : undefined}
            aria-label={`${channel.name} channel${(channel.unread_count ?? 0) > 0 ? `, ${channel.unread_count} unread` : ""}`}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-100",
              activeId === channel.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {channelIcon(channel)}
            <span className="truncate">
              {channel.icon ? `${channel.icon} ` : ""}
              {channel.name}
            </span>
            {(channel.unread_count ?? 0) > 0 && (
              <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {channel.unread_count}
              </span>
            )}
          </button>
        ))}
    </div>
  );
}
