"use client";

import { useDonnaStore } from "@/lib/stores/donna-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { cn } from "@/lib/utils";
import { Bot, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating trigger button that opens the Donna sidebar.
 * Displays Donna's current status (idle vs working) via visual cues.
 */
export function DonnaTrigger() {
  const isOpen = useDonnaStore((s) => s.isOpen);
  const toggle = useDonnaStore((s) => s.toggle);
  const isStreaming = useDonnaStore((s) => s.isStreaming);
  const agents = useAgentStore((s) => s.agents);

  const donna = agents.find(
    (a) => a.active && a.name.toLowerCase().replace("@", "") === "donna"
  );
  const donnaStatus = donna?.status ?? "idle";
  const isWorking = donnaStatus === "thinking" || donnaStatus === "working" || isStreaming;

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={toggle}
          className={cn(
            "fixed bottom-6 right-6 z-40 md:bottom-8 md:right-8",
            "w-12 h-12 rounded-full shadow-lg",
            "flex items-center justify-center",
            "transition-colors duration-200",
            "sq-tap sq-focus-ring",
            isWorking
              ? "bg-sq-agent text-white ring-2 ring-sq-agent/30"
              : "bg-card text-sq-agent border border-border hover:border-sq-agent/40 hover:shadow-xl"
          )}
          title="Ask Donna"
          aria-label="Open Donna sidebar"
        >
          {isWorking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : donna?.office_station_icon ? (
            <span className="text-lg">{donna.office_station_icon}</span>
          ) : (
            <Bot className="w-5 h-5" />
          )}

          {/* Activity pulse ring */}
          {isWorking && (
            <span className="absolute inset-0 rounded-full animate-ping bg-sq-agent/20" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
