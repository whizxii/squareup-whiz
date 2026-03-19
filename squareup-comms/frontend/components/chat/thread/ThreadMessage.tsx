"use client";

import { Message } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseUtcDate } from "@/lib/format";
import { useMemo } from "react";
import DOMPurify from "dompurify";

interface ThreadMessageProps {
  message: Message;
  isOwn: boolean;
}

export function ThreadMessage({ message, isOwn }: ThreadMessageProps) {
  const isAgent = message.sender_type === "agent";

  const timeAgo = useMemo(
    () =>
      formatDistanceToNow(parseUtcDate(message.created_at), { addSuffix: true }),
    [message.created_at]
  );

  const sanitizedHtml = useMemo(() => {
    if (!message.content_html) return null;
    return DOMPurify.sanitize(message.content_html, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "del",
        "code", "pre", "blockquote",
        "ul", "ol", "li",
        "a", "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class", "data-mention-type", "data-type", "data-id"],
    });
  }, [message.content_html]);

  return (
    <div
      className={cn(
        "flex gap-2.5 px-4 py-2 hover:bg-accent/30 transition-colors duration-100",
        isAgent && "bg-sq-agent/[0.03]"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isAgent
            ? "bg-sq-agent/10 ring-1 ring-sq-agent/20"
            : "bg-gradient-brand"
        )}
      >
        {isAgent ? (
          <Bot className="w-3.5 h-3.5 text-sq-agent" />
        ) : (
          <span className="text-white text-[10px] font-bold">
            {(message.sender_name || message.sender_id)
              .charAt(0)
              .toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className={cn(
              "text-xs font-semibold",
              isAgent ? "text-sq-agent" : "text-foreground"
            )}
          >
            {message.sender_name || message.sender_id}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>

        {sanitizedHtml ? (
          <div
            className="text-xs text-foreground/90 leading-relaxed prose prose-sm max-w-none
              prose-p:my-0 prose-pre:my-1 prose-pre:rounded-lg prose-pre:bg-muted/80
              prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[12px] prose-code:font-mono
              prose-a:text-primary prose-a:underline prose-a:underline-offset-2"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
}
