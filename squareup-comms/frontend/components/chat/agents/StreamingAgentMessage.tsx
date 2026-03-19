"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { useAgentStore, type StreamingMessage } from "@/lib/stores/agent-store";
import { ToolExecutionCard } from "./ToolExecutionCard";

interface StreamingAgentMessageProps {
  channelId: string;
}

/**
 * Renders all in-progress streaming agent messages for the given channel.
 * Each streaming message shows the accumulating text with a blinking cursor
 * and live tool execution cards.
 */
export function StreamingAgentMessages({ channelId }: StreamingAgentMessageProps) {
  const streamingMessages = useAgentStore((s) => s.streamingMessages);
  const agents = useAgentStore((s) => s.agents);

  // Filter streaming messages for this channel
  const activeStreams = useMemo(() => {
    const streams: StreamingMessage[] = [];
    for (const [key, stream] of Object.entries(streamingMessages)) {
      if (key.startsWith(`${channelId}:`)) {
        streams.push(stream);
      }
    }
    return streams;
  }, [streamingMessages, channelId]);

  if (activeStreams.length === 0) return null;

  return (
    <>
      {activeStreams.map((stream) => {
        const agent = agents.find((a) => a.id === stream.agentId);
        return (
          <SingleStreamingMessage
            key={`${stream.channelId}:${stream.agentId}`}
            stream={stream}
            agentName={agent?.name ?? "Agent"}
            agentIcon={agent?.office_station_icon}
          />
        );
      })}
    </>
  );
}

function SingleStreamingMessage({
  stream,
  agentName,
  agentIcon,
}: {
  stream: StreamingMessage;
  agentName: string;
  agentIcon?: string;
}) {
  const hasText = stream.text.length > 0;
  const hasTools = stream.toolCalls.length > 0;

  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-fade-in-up">
      {/* Agent avatar */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-sq-agent/10 ring-1 ring-sq-agent/20">
        {agentIcon ? (
          <span className="text-sm">{agentIcon}</span>
        ) : (
          <Bot className="w-4 h-4 text-sq-agent" />
        )}
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Agent name */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-sq-agent">
            {agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            responding...
          </span>
        </div>

        {/* Streaming text with cursor */}
        {hasText && (
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
            {stream.text}
            <span
              className={cn(
                "inline-block w-[2px] h-[1em] bg-sq-agent ml-0.5 align-text-bottom",
                "animate-pulse"
              )}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Show cursor when no text yet (pure thinking) */}
        {!hasText && !hasTools && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sq-agent/60 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "600ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-sq-agent/60 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "600ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-sq-agent/60 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "600ms" }} />
            </span>
          </div>
        )}

        {/* Live tool execution cards */}
        {hasTools && <ToolExecutionCard toolCalls={stream.toolCalls} />}
      </div>
    </div>
  );
}
