"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

export default function PilotFloatingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const whoSection = document.getElementById("who-this-is-for");
      if (whoSection) {
        const rect = whoSection.getBoundingClientRect();
        setVisible(rect.top <= window.innerHeight);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 px-4 transition-all duration-300"
      style={{
        bottom: "calc(19px + env(safe-area-inset-bottom, 0px))",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
      }}
    >
      <div
        className="bg-lime border border-white/20 backdrop-blur-md rounded-[24px] px-1.5 py-1 flex items-center h-[44px] gap-1.5"
        style={{
          boxShadow: "0 18px 60px rgba(24,25,26,0.12)",
        }}
      >
        {/* Slots indicator */}
        <div className="flex items-center gap-1.5 pl-3 pr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[11px] font-bold text-white/90 whitespace-nowrap">
            2 slots left
          </span>
        </div>

        <a
          href="https://cal.com/squareup-ai/discovery-setup-call"
          className="bg-white text-lime h-full px-5 rounded-[18px] font-bold text-[13px] uppercase tracking-tight hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap shadow-lg"
        >
          <Zap size={14} className="fill-current" />
          Book pilot call
        </a>
      </div>
    </div>
  );
}
