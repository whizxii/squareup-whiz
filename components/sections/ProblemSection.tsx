"use client";

import { useRef, useState, useEffect } from "react";
import {
    motion,
    useScroll,
    useTransform,
    useMotionTemplate,
    MotionValue,
} from "framer-motion";
import { Calendar, FileText, Database, Share2, Eye, MousePointerClick } from "lucide-react";
import { useIsMobile } from "../ui/useIsMobile";


const FUNNEL_STEPS = [
    {
        label: "The calls never happen",
        oneLiner: "The Silence of Discovery.",
        creativeCopy: [
            { myth: "We'll talk to users next sprint.", reach: "The calendar fills up; discovery dies in the backlog." },
            { myth: "The roadmap is set.", reach: "We build in a vacuum, guessing what they actually want." }
        ],
        icon: Calendar,
        color: "#FF5A36",
        restBg: "#ffffff",
        restText: "#0b132b",
        widthPct: 100,
    },
    {
        label: "The conversation is wasted",
        oneLiner: "Surface-Level Signals.",
        creativeCopy: [
            { myth: "We took detailed notes.", reach: "Three bullet points that miss every 'why' and 'how'." },
            { myth: "Leading questions only.", reach: "Users give polite answers while the real friction stays hidden." }
        ],
        icon: FileText,
        color: "#FF5A36",
        restBg: "#ffffff",
        restText: "#0b132b",
        widthPct: 82,
    },
    {
        label: "Insights get buried alive",
        oneLiner: "The Notion Graveyard.",
        creativeCopy: [
            { myth: "The recording is on Zoom.", reach: "Unwatched, unsearchable, and forgotten within 48 hours." },
            { myth: "Link shared in Slack.", reach: "Buried under 200 messages by the end of the day." }
        ],
        icon: Database,
        color: "#FF5A36",
        restBg: "#ffffff",
        restText: "#0b132b",
        widthPct: 64,
    },
    {
        label: "The right people never find out",
        oneLiner: "Insights Rot in Silos.",
        creativeCopy: [
            { myth: "Support heard the pain.", reach: "The PM planning the roadmap never knows it exists." },
            { myth: "Lost deals 'for some reason.'", reach: "Sales knows why. Product is building the wrong fix." }
        ],
        icon: Share2,
        color: "#FF5A36",
        restBg: "#ffffff",
        restText: "#0b132b",
        widthPct: 46,
    },
    {
        label: "Zero traceability",
        oneLiner: "Flying Blind on 'Gut Feel'.",
        creativeCopy: [
            { myth: "We are customer-centric.", reach: "No audit log, no proof of listening, zero traceability." },
            { myth: "Data-driven strategy.", reach: "Actually just guesswork with a fancy name." }
        ],
        icon: Eye,
        color: "#FF5A36",
        restBg: "#ffffff",
        restText: "#0b132b",
        widthPct: 34,
    },
];


function FunnelStep({
    step,
    index,
    shatterProgress,
    hoveredFunnel,
    setHoveredFunnel,
    isMobile,
}: {
    step: typeof FUNNEL_STEPS[0];
    index: number;
    shatterProgress: MotionValue<number>;
    hoveredFunnel: number | null;
    setHoveredFunnel: (i: number | null) => void;
    isMobile: boolean;
}) {
    const isHovered = hoveredFunnel === index;
    const Icon = step.icon;
    const isLeft = index % 2 === 0;

    const angle = (index / FUNNEL_STEPS.length) * Math.PI * 2 + Math.PI / 4;

    const distScale = isMobile ? Math.min(window.innerWidth, 1440) / 1440 : 1;
    const dist = (300 + (index % 2) * 150) * distScale;
    const rotMag = (index % 2 === 0 ? 1 : -1) * (15 + index * 12);


    const shatterX = useTransform(shatterProgress, [0, 0.4], [0, Math.cos(angle) * dist]);
    const shatterY = useTransform(shatterProgress, [0, 0.4], [0, Math.sin(angle) * dist]);
    const shatterRotate = useTransform(shatterProgress, [0, 0.4], [0, rotMag]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
            className="relative flex flex-col sm:flex-row items-center justify-center w-full"
            style={{
                minHeight: 80,
                marginBottom: 8,
                x: shatterX,
                y: shatterY,
                rotate: shatterRotate,
                width: isMobile ? "90%" : `${step.widthPct}%`,
                minWidth: 160,
            }}
        >
            {}
            <div
                onMouseEnter={() => { if (!isMobile) setHoveredFunnel(index); }}
                onMouseLeave={() => { if (!isMobile) setHoveredFunnel(null); }}
                onClick={() => { if (isMobile) setHoveredFunnel(isHovered ? null : index); }}
                className="cursor-pointer w-full"
            >
                <div
                    className="w-full h-[80px] rounded-2xl relative overflow-hidden flex items-center justify-center gap-3 px-6 transition-all duration-[400ms] ease-out"
                    style={{
                        backgroundColor: isHovered ? step.color : step.restBg,
                        boxShadow: isHovered
                            ? `0 0 60px ${step.color}25, 0 12px 48px ${step.color}15`
                            : `0 1px 4px ${step.color}06`,
                        transform: `scale(${isHovered ? 1.025 : 1})`,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-2xl" />
                    <Icon
                        size={20}
                        className="flex-shrink-0 transition-all duration-300"
                        style={{ color: isHovered ? "#fff" : step.restText }}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                    />
                    <span
                        className="text-[13px] sm:text-[15px] font-semibold tracking-wide select-none whitespace-nowrap transition-colors duration-300"
                        style={{ color: isHovered ? "#ffffff" : step.restText }}
                    >
                        {step.label}
                    </span>
                </div>
            </div>

            {}
            {}
            <div
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 items-center transition-all duration-[400ms] ease-out z-[60]"
                style={{
                    ...(isLeft
                        ? { right: `calc(50% + ${step.widthPct / 2}% + 4px)`, flexDirection: "row-reverse" as const }
                        : { left: `calc(50% + ${step.widthPct / 2}% + 4px)`, flexDirection: "row" as const }),
                    opacity: isHovered ? 1 : 0,
                    pointerEvents: isHovered ? "auto" : "none",
                }}
            >
                {}
                <div
                    className="w-[6px] h-[6px] rounded-full flex-shrink-0 transition-all duration-300"
                    style={{
                        backgroundColor: step.color,
                        transform: `scale(${isHovered ? 1 : 0})`,
                        boxShadow: `0 0 10px ${step.color}40`,
                    }}
                />
                {}
                <div
                    className="transition-all duration-[350ms] ease-out flex-shrink-0"
                    style={{
                        width: isHovered ? 48 : 0,
                        height: 1,
                        background: `linear-gradient(${isLeft ? "270deg" : "90deg"}, ${step.color}, ${step.color}40, transparent)`,
                    }}
                />
                {}
                <div
                    className="w-[min(280px,calc(100vw-64px))] flex-shrink-0 transition-all duration-[400ms] ease-out"
                    style={{
                        transform: isHovered
                            ? "scale(1) translateX(0)"
                            : `scale(0.93) translateX(${isLeft ? "8px" : "-8px"})`,
                        ...(isLeft ? { marginRight: 8 } : { marginLeft: 8 }),
                    }}
                >
                    <div className="rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28)]" style={{ background: "#0b132b", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <p className="text-[15px] font-bold tracking-tight leading-tight mb-4 pb-2" style={{ color: "#ffffff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {step.oneLiner}
                        </p>
                        <div className="space-y-4">
                            {step.creativeCopy.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                                        <span className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                                        The Myth
                                    </p>
                                    <p className="text-[13px] font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
                                        &ldquo;{item.myth}&rdquo;
                                    </p>
                                    <p className="text-[12px] leading-relaxed italic ml-2.5 pl-2" style={{ color: "rgba(255,255,255,0.38)", borderLeft: "2px solid rgba(255,255,255,0.08)" }}>
                                        Result: {item.reach}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {}
            <div
                className="sm:hidden w-full transition-all duration-[400ms] ease-out overflow-hidden z-[60]"
                style={{
                    maxHeight: isHovered ? 300 : 0,
                    opacity: isHovered ? 1 : 0,
                    marginTop: isHovered ? 4 : 0,
                }}
            >
                <div className="rounded-2xl p-4 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.28)]" style={{ background: "#0b132b", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-[14px] font-bold tracking-tight leading-tight mb-3 pb-2" style={{ color: "#ffffff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {step.oneLiner}
                    </p>
                    <div className="space-y-3">
                        {step.creativeCopy.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                                    <span className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                                    The Myth
                                </p>
                                <p className="text-[12px] font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
                                    &ldquo;{item.myth}&rdquo;
                                </p>
                                <p className="text-[11px] leading-relaxed italic ml-2.5 pl-2" style={{ color: "rgba(255,255,255,0.38)", borderLeft: "2px solid rgba(255,255,255,0.08)" }}>
                                    Result: {item.reach}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}


export default function ProblemSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const funnelRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();
    const [hoveredFunnel, setHoveredFunnel] = useState<number | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleHover = (i: number | null) => {
        setHoveredFunnel(i);
        if (i !== null) setHasInteracted(true);
    };


    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setHasInteracted(false);
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);


    const { scrollYProgress } = useScroll({
        target: funnelRef,
        offset: [isMobile ? "start 32px" : "start 40px", "end start"],
    });
    const shatterProgress = useTransform(scrollYProgress, [0, 0.65], [0, 1]);


    const wrapperOpacity = useTransform(shatterProgress, [0, 0.45], [1, 0]);
    const wrapperBlurV = useTransform(shatterProgress, [0, 0.45], [0, isMobile ? 8 : 16]);
    const wrapperFilter = useMotionTemplate`blur(${wrapperBlurV}px)`;

    return (
        <section
            ref={sectionRef}
            id="problem"
            className="relative py-8 sm:py-16 px-6 overflow-hidden"
        >
            {}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,240,235,0.5) 0%, transparent 70%)" }}
            />

            <div className="relative w-full max-w-[1200px] mx-auto flex flex-col items-center justify-center">

                {}
                <motion.div
                    className="w-full flex flex-col items-center relative z-20"
                    style={{ opacity: wrapperOpacity, filter: wrapperFilter }}
                >
                    {}
                    <div className="text-center mb-[10px] w-full mt-10 sm:mt-[100px]">
                        <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.03em] text-[#0b132b] leading-[1.15] mb-4 mx-auto">
                            Every brand says<br />
                            <span className="text-[#FF5A36]">&ldquo;talk to your customers.&rdquo;</span>
                        </h2>
                        <p className="text-base sm:text-lg text-[#0b132b] font-bold tracking-[-0.01em]">
                            Here&apos;s what actually happens.
                        </p>
                        <motion.div
                            className="mt-6 select-none pointer-events-none"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{
                                opacity: hasInteracted ? 0 : 1,
                                y: hasInteracted ? -5 : 0,
                            }}
                            transition={{
                                duration: hasInteracted ? 0.3 : 0.8,
                                delay: hasInteracted ? 0 : 1.2,
                            }}
                        >
                            <motion.span
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] sm:text-[14px] font-semibold tracking-wide text-white"
                                style={{
                                    background: "#FF5A36",
                                    boxShadow: "0 4px 20px rgba(255,90,54,0.35)",
                                }}
                                animate={hasInteracted ? {} : { scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <MousePointerClick size={15} strokeWidth={2} />
                                {isMobile ? "Tap to explore each layer" : "Hover to explore each layer"}
                            </motion.span>
                        </motion.div>
                    </div>

                    {}
                    <motion.div
                        ref={funnelRef}
                        className="relative flex flex-col w-full items-center mt-6 sm:mt-[50px]"
                        style={{ maxWidth: "min(660px, calc(100vw - 32px))" }}
                    >
                        {FUNNEL_STEPS.map((step, i) => (
                            <FunnelStep
                                key={step.label}
                                step={step}
                                index={i}
                                shatterProgress={shatterProgress}
                                hoveredFunnel={hoveredFunnel}
                                setHoveredFunnel={handleHover}
                                isMobile={isMobile}
                            />
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
