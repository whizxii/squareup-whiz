"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, useScroll, useMotionValueEvent } from "framer-motion";
import AgentVideoCard from "../ui/AgentVideoCard";
import { useIsMobile } from "../ui/useIsMobile";


const agentsData = [
    {
        name: "Pulse",
        video: "/agent-videos/pulse.mp4",
        poster: "/pulse-frames/frame-117.webp",
        description: "Books meetings and qualifies leads at scale with voice AI.",
    },
    {
        name: "Yoda",
        video: "/agent-videos/yoda.mp4",
        poster: "/yoda-frames/frame-106.webp",
        description: "Turns every conversation into a structured data set.",
    },
    {
        name: "Sage",
        video: "/agent-videos/sage.mp4",
        poster: "/sage2-frames/frame-106.webp",
        description: "Synthesizes millions of data points into clear Intelligence Briefs.",
    },
    {
        name: "Atlas",
        video: "/agent-videos/atlas.mp4",
        poster: "/atlas-frames/frame-111.webp",
        description: "Turns scattered calls into an instant knowledge base.",
    },
    {
        name: "Kairo",
        video: "/agent-videos/kairo.mp4",
        poster: "/kairo-frames/frame-124.webp",
        description: "Routes intelligence directly to the people who can fix it.",
    },
];

const AUTO_ADVANCE_INTERVAL = 6000;
const GAP = 16;


export default function AgentsSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const inView = useInView(sectionRef, { once: true, amount: 0.3 });
    const isMobile = useIsMobile();

    const [activeAgentIndex, setActiveAgentIndex] = useState(0);


    const carouselContainerRef = useRef<HTMLDivElement>(null);
    const [cardWidth, setCardWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const measureCards = useCallback(() => {
        const container = carouselContainerRef.current;
        if (!container) return;
        const cw = container.offsetWidth;
        setContainerWidth(cw);
        const ratio = cw < 480 ? 0.92 : cw < 768 ? 0.88 : cw < 1024 ? 0.76 : 0.72;
        setCardWidth(Math.round(cw * ratio));
    }, []);

    useEffect(() => {
        measureCards();
        const observer = new ResizeObserver(() => measureCards());
        if (carouselContainerRef.current) {
            observer.observe(carouselContainerRef.current);
        }
        return () => observer.disconnect();
    }, [measureCards]);


    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { scrollXProgress } = useScroll({ container: scrollContainerRef });
    const isUserScrolling = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useMotionValueEvent(scrollXProgress, "change", (progress) => {
        if (!isUserScrolling.current) return;
        const rawIndex = Math.floor(progress * agentsData.length);
        const clampedIndex = Math.min(Math.max(rawIndex, 0), agentsData.length - 1);
        if (clampedIndex !== activeAgentIndex) {
            setActiveAgentIndex(clampedIndex);
        }
    });


    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            isUserScrolling.current = true;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                isUserScrolling.current = false;
            }, 150);
        };

        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);


    const scrollToAgent = useCallback((index: number) => {
        const container = scrollContainerRef.current;
        if (!container || cardWidth === 0) return;
        const peekWidth = Math.max((containerWidth - cardWidth) / 2 - GAP, 0);
        const targetX = index * (cardWidth + GAP) - peekWidth;
        container.scrollTo({ left: targetX, behavior: "smooth" });
    }, [cardWidth, containerWidth]);


    const tabContainerRef = useRef<HTMLDivElement>(null);
    const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

    const measurePill = useCallback((index: number) => {
        const container = tabContainerRef.current;
        const btn = tabButtonRefs.current[index];
        if (container && btn) {
            const cRect = container.getBoundingClientRect();
            const bRect = btn.getBoundingClientRect();
            setPillStyle({ left: bRect.left - cRect.left, width: bRect.width });
        }
    }, []);

    useEffect(() => {
        measurePill(activeAgentIndex);
    }, [activeAgentIndex, measurePill]);

    useEffect(() => {
        const handleResize = () => measurePill(activeAgentIndex);
        window.addEventListener("resize", handleResize);
        const t = setTimeout(() => measurePill(activeAgentIndex), 50);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(t);
        };
    }, [activeAgentIndex, measurePill]);


    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startAutoAdvance = useCallback(() => {
        stopAutoAdvance();
        autoTimerRef.current = setInterval(() => {
            setActiveAgentIndex((prev) => {
                const next = (prev + 1) % agentsData.length;
                return next;
            });
        }, AUTO_ADVANCE_INTERVAL);

    }, []);

    const stopAutoAdvance = () => {
        if (autoTimerRef.current) {
            clearInterval(autoTimerRef.current);
            autoTimerRef.current = null;
        }
    };

    useEffect(() => {
        if (isAutoPlaying) {
            startAutoAdvance();
        } else {
            stopAutoAdvance();
        }
        return stopAutoAdvance;
    }, [isAutoPlaying, startAutoAdvance]);


    useEffect(() => {
        if (!isUserScrolling.current) {
            scrollToAgent(activeAgentIndex);
        }
    }, [activeAgentIndex, scrollToAgent]);


    const switchAgent = useCallback(
        (newIndex: number) => {
            if (newIndex === activeAgentIndex) return;
            isUserScrolling.current = false;
            setActiveAgentIndex(newIndex);
            scrollToAgent(newIndex);
            if (isAutoPlaying) {
                startAutoAdvance();
            }
        },
        [activeAgentIndex, isAutoPlaying, startAutoAdvance, scrollToAgent]
    );

    const carouselSpring = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 };


    const totalTrackWidth = agentsData.length * cardWidth + (agentsData.length - 1) * GAP;
    const peekWidth = Math.max((containerWidth - cardWidth) / 2 - GAP, 0);
    const paddingForPeek = peekWidth + GAP;

    return (
        <div
            ref={sectionRef}
            id="agents"
            className="relative flex flex-col items-center overflow-hidden"
            style={{ paddingTop: "clamp(80px, 10vh, 120px)", paddingBottom: "40px" }}
        >
            {}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center mb-4 px-4"
            >
                <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.04em] text-[#0b132b] leading-[1.05]">
                    Square Up doesn&apos;t assist your study.<br /><span className="text-[#FF5A36]">It runs it.</span>
                </h2>
                <p className="mt-3 text-base sm:text-lg text-[#757575] font-medium tracking-[-0.01em]">
                    Five agents. One seamless workflow.
                </p>
            </motion.div>

            {}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="flex items-center justify-center mb-5 px-4"
            >
                <div
                    ref={tabContainerRef}
                    className="relative inline-flex gap-0 p-[3px] rounded-full overflow-hidden"
                    style={{
                        background: "linear-gradient(160deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.18) 60%, rgba(255,255,255,0.30) 100%)",
                        backdropFilter: "blur(48px) saturate(2.0)",
                        WebkitBackdropFilter: "blur(48px) saturate(2.0)",
                        border: "1px solid rgba(255,255,255,0.55)",
                        boxShadow: "0 16px 56px -8px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.90), inset 0 -1px 1px rgba(0,0,0,0.04)",
                    }}
                >
                    <div
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{
                            background: "linear-gradient(180deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.08) 50%, transparent 70%, rgba(255,255,255,0.10) 100%)",
                        }}
                    />
                    <div className="absolute top-0 left-0 right-0 h-px pointer-events-none rounded-full"
                        style={{ background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.80) 50%, transparent 95%)" }} />
                    <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none rounded-full"
                        style={{ background: "linear-gradient(90deg, transparent 10%, rgba(0,0,0,0.04) 50%, transparent 90%)" }} />

                    <motion.div
                        className="absolute top-[3px] bottom-[3px] rounded-full z-0"
                        animate={{ left: pillStyle.left, width: pillStyle.width }}
                        transition={carouselSpring}
                        style={{
                            background: "linear-gradient(135deg, rgba(255,90,54,0.13) 0%, rgba(255,120,80,0.07) 100%)",
                            border: "1px solid rgba(255,90,54,0.16)",
                            boxShadow: "0 0 12px rgba(255,90,54,0.08), inset 0 1px 0 rgba(255,255,255,0.3)",
                        }}
                    />

                    {agentsData.map((agent, i) => {
                        const isActive = activeAgentIndex === i;
                        return (
                            <button
                                ref={(el) => { tabButtonRefs.current[i] = el; }}
                                key={agent.name}
                                onClick={() => switchAgent(i)}
                                className="relative z-10 px-3 sm:px-5 md:px-7 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-colors duration-300 cursor-pointer border-none outline-none bg-transparent text-center whitespace-nowrap active:scale-[0.97]"
                                style={{
                                    color: isActive ? "#FF5A36" : "rgba(11,19,43,0.32)",
                                    letterSpacing: "0.04em",
                                    fontWeight: isActive ? 700 : 500,
                                }}
                            >
                                {agent.name}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {}
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="w-full"
                ref={carouselContainerRef}
            >
                <div
                    ref={scrollContainerRef}
                    className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"
                    style={{
                        scrollSnapType: "x mandatory",
                        WebkitOverflowScrolling: "touch",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}
                >
                    <div
                        className="carousel-track flex items-center"
                        style={{
                            gap: GAP,
                            paddingLeft: paddingForPeek,
                            paddingRight: paddingForPeek,
                            width: totalTrackWidth + paddingForPeek * 2,
                        }}
                    >
                        {agentsData.map((agent, i) => {
                            const isActive = activeAgentIndex === i;
                            const isAdjacent = Math.abs(activeAgentIndex - i) === 1;
                            return (
                                <div
                                    key={agent.name}
                                    className="flex-shrink-0"
                                    style={{
                                        width: cardWidth,
                                        scrollSnapAlign: "center",
                                    }}
                                >
                                    <AgentVideoCard
                                        name={agent.name}
                                        videoSrc={agent.video}
                                        posterSrc={agent.poster}
                                        description={agent.description}
                                        isActive={isActive}
                                        isAdjacent={isAdjacent}
                                        cardWidth={cardWidth}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {}
            <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex items-center justify-center gap-2 mt-5 flex-shrink-0"
            >
                <div className="flex items-center gap-[6px]">
                    {agentsData.map((_, i) => {
                        const isActive = activeAgentIndex === i;
                        return (
                            <motion.button
                                key={i}
                                onClick={() => switchAgent(i)}
                                className="rounded-full cursor-pointer border-none outline-none p-0"
                                animate={{
                                    width: isActive ? (isMobile ? 20 : 24) : (isMobile ? 5 : 6),
                                    backgroundColor: isActive
                                        ? "#0b132b"
                                        : "rgba(11,19,43,0.18)",
                                }}
                                transition={carouselSpring}
                                style={{ height: isMobile ? 5 : 6 }}
                            />
                        );
                    })}
                </div>

                <button
                    onClick={() => setIsAutoPlaying((prev) => !prev)}
                    className="ml-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer outline-none bg-transparent"
                    style={{ border: "1.5px solid rgba(11,19,43,0.15)" }}
                >
                    {isAutoPlaying ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <rect x="1" y="1" width="3" height="8" rx="0.5" fill="#0b132b" />
                            <rect x="6" y="1" width="3" height="8" rx="0.5" fill="#0b132b" />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 1.5L8.5 5L2 8.5V1.5Z" fill="#0b132b" />
                        </svg>
                    )}
                </button>
            </motion.div>
        </div>
    );
}
