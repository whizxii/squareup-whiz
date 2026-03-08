"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Zap, ChevronUp, Sparkles } from "lucide-react";

const SOLUTIONS = [
    {
        label: "Talk to customers",
        description: "AI-DRIVEN INTERVIEW SYNTHESIS",
        badge: null
    },
    {
        label: "Social listener",
        description: "GLOBAL SENTIMENT TRACKING",
        badge: "Soon"
    },
    {
        label: "Intelligence Hub",
        description: "CENTRAL SIGNAL BRAIN",
        badge: null
    },
];

export default function FloatingNav() {
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setMounted(true);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setActiveTab(null);
        };
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setActiveTab(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("touchstart", handleClickOutside);
        window.addEventListener("mousedown", handleClickOutside);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("touchstart", handleClickOutside);
            window.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!mounted) return null;

    const handleMouseEnter = () => {
        if (!window.matchMedia("(hover: hover)").matches) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setActiveTab("solutions");
    };

    const handleMouseLeave = () => {
        if (!window.matchMedia("(hover: hover)").matches) return;
        timeoutRef.current = setTimeout(() => {
            setActiveTab(null);
        }, 150);
    };

    const handleToggle = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setActiveTab((prev) => (prev === "solutions" ? null : "solutions"));
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveTab(null);
    };

    return (
        <div
            ref={containerRef}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4"
            style={{ bottom: "calc(19px + env(safe-area-inset-bottom, 0px))" }}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                className="relative bg-lime text-white border border-white/20 backdrop-blur-md overflow-hidden flex flex-col items-center w-[calc(100vw-32px)] max-w-[400px]"
                style={{
                    borderRadius: "24px",
                    boxShadow: "0 18px 60px rgba(24,25,26,0.12)",
                }}
            >
                {}
                <AnimatePresence>
                    {activeTab === "solutions" && (
                        <motion.div
                            key="submenu"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: "linear" }}
                            className="w-full px-5 pt-6 pb-2"
                            onMouseEnter={handleMouseEnter}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 space-y-1">
                                    {SOLUTIONS.map((item) => (
                                        <button
                                            key={item.label}
                                            className="group block w-full text-left outline-none h-[44px] sm:h-[54px] flex flex-col justify-center px-3 rounded-xl transition-colors hover:bg-white/10 active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-bold tracking-tight text-white leading-none">{item.label}</span>
                                                {item.badge && (
                                                    <span className="text-[7px] bg-white/30 px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest text-white">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-white/50 leading-tight mt-1 group-hover:text-white/80 transition-colors uppercase tracking-tight">
                                                {item.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>

                                {}
                                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-inner relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Sparkles size={24} className="text-white/60 group-hover:text-white transition-colors relative z-10" />
                                </div>
                            </div>

                            <div className="w-full h-[1px] bg-white/10 mt-4" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {}
                <div className="flex items-center px-1.5 py-1 h-[44px] w-full gap-1">
                    {}
                    <div className="flex items-center justify-center w-[48px] shrink-0">
                        <button
                            onClick={scrollToTop}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-all active:scale-90"
                            title="Home"
                        >
                            <Home size={20} />
                        </button>
                    </div>

                    <div className="w-[1px] h-5 bg-white/20 shrink-0" />

                    {}
                    <div className="flex-1 flex items-center h-full">
                        <div
                            onClick={handleToggle}
                            onMouseEnter={handleMouseEnter}
                            className={`w-full h-full flex items-center justify-center gap-2 rounded-[18px] cursor-pointer ${activeTab === "solutions" ? "bg-white/20" : ""}`}
                        >
                            <span className="font-bold text-[13px] tracking-tight whitespace-nowrap uppercase">Our Solutions</span>
                            <ChevronUp size={14} className={`transition-transform duration-200 ${activeTab === "solutions" ? "rotate-180" : ""}`} />
                        </div>
                    </div>

                    <div className="w-[1px] h-5 bg-white/20 shrink-0" />

                    {}
                    <div className="flex-1 flex items-center h-full">
                        <a
                            href="#book-call"
                            className="bg-white text-lime w-full h-full rounded-[18px] font-bold text-[13px] hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Zap size={14} className="fill-current" />
                            <span className="uppercase tracking-tight whitespace-nowrap">Book Pilot</span>
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
