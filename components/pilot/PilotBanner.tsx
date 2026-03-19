"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const STORAGE_KEY = "pilot-banner-dismissed";

export default function PilotBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -44 }}
          animate={{ y: 0 }}
          exit={{ y: -44 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 left-0 right-0 z-[60]"
        >
          <a
            href="/pilot"
            className="flex items-center justify-center h-[44px] sm:h-[40px] bg-maze-black text-white px-5 relative"
          >
            <span className="text-[13px] font-medium tracking-tight text-center">
              48-hour pilot: customer research brief in 2 days →
            </span>
            <span className="hidden sm:inline text-[11px] text-white/50 ml-3">
              4 slots open
            </span>

            <button
              onClick={dismiss}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-[44px] h-[44px] sm:w-[40px] sm:h-[40px] flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
