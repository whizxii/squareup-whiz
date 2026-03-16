"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "read";

interface MessageStatusProps {
  status: DeliveryStatus;
  className?: string;
}

/**
 * WhatsApp-style progressive message status indicator.
 * pending → clock, sent → single check, delivered → double check, read → blue double check
 */
export function MessageStatus({ status, className }: MessageStatusProps) {
  const icon = useMemo(() => {
    switch (status) {
      case "pending":
        return <ClockIcon />;
      case "sent":
        return <SingleCheck />;
      case "delivered":
        return <DoubleCheck color="currentColor" />;
      case "read":
        return <DoubleCheck color="var(--color-primary, #3b82f6)" />;
      default:
        return null;
    }
  }, [status]);

  return (
    <span
      className={cn(
        "inline-flex items-center shrink-0",
        status === "pending" && "text-muted-foreground/50",
        status === "sent" && "text-muted-foreground/70",
        status === "delivered" && "text-muted-foreground/70",
        status === "read" && "text-primary",
        className
      )}
      aria-label={`Message ${status}`}
      role="img"
    >
      {icon}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="animate-pulse"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M7 4.5V7L8.5 8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SingleCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7.5L6 10.5L11 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-check-draw"
      />
    </svg>
  );
}

function DoubleCheck({ color }: { color: string }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <path
        d="M1 7.5L4 10.5L9 4"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 7.5L8.5 10.5L13.5 4"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
