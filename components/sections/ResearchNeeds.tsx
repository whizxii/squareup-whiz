"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const rotatingWords = ["funnel", "teams"];

const teamTabs = [
  {
    id: "c-level",
    label: "C-Level",
    heading: "Strategic insights for leadership",
    body: "Equip C-suite executives with board-ready research that connects customer needs to business outcomes, driving confident strategic decisions.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "product",
    label: "Product",
    heading: "Build what users actually need",
    body: "Validate concepts, prioritize features, and test prototypes with real users—so your product roadmap is guided by evidence, not assumptions.",
    color: "green",
    accentColor: "#66bb6a",
  },
  {
    id: "growth",
    label: "Growth",
    heading: "Fuel growth with customer intelligence",
    body: "Uncover the messaging, channels, and experiences that drive acquisition and retention, turning research into your competitive growth lever.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "customer",
    label: "Customer",
    heading: "Deeply understand your customers",
    body: "Go beyond NPS scores to understand the why behind customer behavior, enabling teams to improve satisfaction and reduce churn.",
    color: "blue",
    accentColor: "#4a90d9",
  },
  {
    id: "operations",
    label: "Operations",
    heading: "Streamline with real-world data",
    body: "Identify process bottlenecks and operational friction points through user research, ensuring efficiency improvements are grounded in reality.",
    color: "orange",
    accentColor: "#e8a838",
  },
];

const studyTabs = [
  {
    id: "npd",
    label: "NPD",
    heading: "New Product Development",
    body: "Validate new product concepts early and often. Test ideas with real users before investing in development, reducing risk and accelerating time-to-market.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "churn-analysis",
    label: "Churn Analysis",
    heading: "Understand why customers leave",
    body: "Uncover the root causes of churn through targeted research. Identify at-risk segments and the moments that matter most in the customer lifecycle.",
    color: "blue",
    accentColor: "#4a90d9",
  },
  {
    id: "buyer-persona",
    label: "Buyer Persona",
    heading: "Build data-driven personas",
    body: "Go beyond demographic profiles. Create rich, research-backed buyer personas that capture motivations, pain points, and decision-making criteria.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "purchase-criteria",
    label: "Purchase Criteria",
    heading: "Know what drives buying decisions",
    body: "Map the criteria your buyers use to evaluate and choose solutions. Understand the weight of each factor across segments and buying stages.",
    color: "purple",
    accentColor: "#9c6ade",
  },
  {
    id: "pricing-packaging",
    label: "Pricing & Packaging",
    heading: "Optimize pricing strategy",
    body: "Test pricing models, packaging tiers, and willingness-to-pay with real prospects. Make pricing decisions backed by quantitative research, not guesswork.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "ad-testing",
    label: "Ad Testing",
    heading: "Maximize ad effectiveness",
    body: "Test creative concepts, messaging, and ad formats before launch. Measure attention, recall, and emotional response to optimize campaign performance.",
    color: "green",
    accentColor: "#66bb6a",
  },
  {
    id: "competitive-intel",
    label: "Competitive Intel",
    heading: "Stay ahead of the competition",
    body: "Understand how your brand and products are perceived relative to competitors. Identify whitespace opportunities and competitive vulnerabilities.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "concept-testing",
    label: "Concept Testing",
    heading: "Validate concepts with confidence",
    body: "Test product concepts, features, and value propositions with your target audience. Get clear signals on appeal, uniqueness, and purchase intent.",
    color: "purple",
    accentColor: "#9c6ade",
  },
  {
    id: "messaging-research",
    label: "Messaging Research",
    heading: "Craft messages that resonate",
    body: "Test positioning, taglines, and value propositions with your audience. Understand which messages drive clarity, relevance, and action.",
    color: "orange",
    accentColor: "#e8a838",
  },
  {
    id: "brand-health-tracking",
    label: "Brand Health Tracking",
    heading: "Monitor brand perception over time",
    body: "Track awareness, consideration, and sentiment across key audience segments. Detect shifts early and measure the impact of brand investments.",
    color: "green",
    accentColor: "#66bb6a",
  },
];


const studyTabsRow1 = studyTabs.slice(0, 5);
const studyTabsRow2 = studyTabs.slice(5, 10);

function HalftoneIllustration({ color }: { color: string }) {
  const colorMap: Record<string, { fill: string; bg: string }> = {
    blue: { fill: "#4a90d9", bg: "#dbeafe" },
    green: { fill: "#66bb6a", bg: "#dcfce7" },
    orange: { fill: "#e8a838", bg: "#fef3c7" },
    purple: { fill: "#9c6ade", bg: "#f3e8ff" },
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full">
        {Array.from({ length: 400 }).map((_, i) => {
          const col = i % 20;
          const row = Math.floor(i / 20);
          const x = col * 10 + 5;
          const y = row * 10 + 5;
          const centerX = 100;
          const dist = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - 120, 2)
          );
          const inShape = y > 40 && y < 180 && Math.abs(x - 100) < (y - 40) * 0.6;
          if (!inShape) return null;
          const size = Math.max(0.5, 3.5 - dist * 0.02);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={size}
              fill={c.fill}
              opacity={0.3 + (1 - dist / 150) * 0.5}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function ResearchNeeds() {
  const [activeCategory, setActiveCategory] = useState<"team" | "study">("team");
  const [activeTeamTab, setActiveTeamTab] = useState(0);
  const [activeStudyTab, setActiveStudyTab] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const activeData =
    activeCategory === "team"
      ? teamTabs[activeTeamTab]
      : studyTabs[activeStudyTab];

  const handleTeamClick = (i: number) => {
    setActiveTeamTab(i);
    setActiveCategory("team");
  };

  const handleStudyClick = (i: number) => {
    setActiveStudyTab(i);
    setActiveCategory("study");
  };

  return (
    <section data-section-name="core-values" className="relative z-10 py-12 sm:py-20 lg:py-28 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {}
        <div className="mb-10 lg:mb-16">
          <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.04em] text-maze-black leading-[1.2]">
            Studies across the{" "}
            <span className="inline-block overflow-hidden h-[1.2em] align-bottom relative" style={{ minWidth: "5.5ch", width: "auto" }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  exit={{ y: "-110%" }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="text-[#FF5A36] block"
                >
                  {rotatingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h2>
        </div>

        {}
        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">
            Explore studies by team:
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:snap-none sm:pb-0">
            {teamTabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleTeamClick(i)}
                className={`shrink-0 snap-start cursor-pointer rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] transition-all duration-500 text-sm font-medium uppercase tracking-wide active:scale-[0.97] ${
                  activeCategory === "team" && activeTeamTab === i
                    ? ""
                    : ""
                }`}
                style={
                  activeCategory === "team" && activeTeamTab === i
                    ? {
                        background: "linear-gradient(160deg, rgba(232,168,56,0.18) 0%, rgba(232,168,56,0.10) 40%, rgba(232,168,56,0.08) 60%, rgba(232,168,56,0.15) 100%)",
                        backdropFilter: "blur(48px) saturate(2.0)",
                        WebkitBackdropFilter: "blur(48px) saturate(2.0)",
                        border: "1px solid rgba(232,168,56,0.35)",
                        boxShadow: "0 8px 32px -4px rgba(232,168,56,0.10), inset 0 1px 1px rgba(255,255,255,0.60), inset 0 -1px 1px rgba(0,0,0,0.03)",
                      }
                    : {
                        background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.18) 100%)",
                        backdropFilter: "blur(24px) saturate(1.5)",
                        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.50)",
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="mb-10 lg:mb-16">
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">
            Explore studies by use case:
          </p>
          {}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:snap-none sm:pb-0 mb-2">
            {studyTabsRow1.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleStudyClick(i)}
                className={`shrink-0 snap-start cursor-pointer rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] transition-all duration-500 text-sm font-medium uppercase tracking-wide active:scale-[0.97] ${
                  activeCategory === "study" && activeStudyTab === i
                    ? ""
                    : ""
                }`}
                style={
                  activeCategory === "study" && activeStudyTab === i
                    ? {
                        background: "linear-gradient(160deg, rgba(232,168,56,0.18) 0%, rgba(232,168,56,0.10) 40%, rgba(232,168,56,0.08) 60%, rgba(232,168,56,0.15) 100%)",
                        backdropFilter: "blur(48px) saturate(2.0)",
                        WebkitBackdropFilter: "blur(48px) saturate(2.0)",
                        border: "1px solid rgba(232,168,56,0.35)",
                        boxShadow: "0 8px 32px -4px rgba(232,168,56,0.10), inset 0 1px 1px rgba(255,255,255,0.60), inset 0 -1px 1px rgba(0,0,0,0.03)",
                      }
                    : {
                        background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.18) 100%)",
                        backdropFilter: "blur(24px) saturate(1.5)",
                        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.50)",
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          {}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:snap-none sm:pb-0">
            {studyTabsRow2.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleStudyClick(i + 5)}
                className={`shrink-0 snap-start cursor-pointer rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] transition-all duration-500 text-sm font-medium uppercase tracking-wide active:scale-[0.97] ${
                  activeCategory === "study" && activeStudyTab === i + 5
                    ? ""
                    : ""
                }`}
                style={
                  activeCategory === "study" && activeStudyTab === i + 5
                    ? {
                        background: "linear-gradient(160deg, rgba(232,168,56,0.18) 0%, rgba(232,168,56,0.10) 40%, rgba(232,168,56,0.08) 60%, rgba(232,168,56,0.15) 100%)",
                        backdropFilter: "blur(48px) saturate(2.0)",
                        WebkitBackdropFilter: "blur(48px) saturate(2.0)",
                        border: "1px solid rgba(232,168,56,0.35)",
                        boxShadow: "0 8px 32px -4px rgba(232,168,56,0.10), inset 0 1px 1px rgba(255,255,255,0.60), inset 0 -1px 1px rgba(0,0,0,0.03)",
                      }
                    : {
                        background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.18) 100%)",
                        backdropFilter: "blur(24px) saturate(1.5)",
                        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.50)",
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${activeCategory === "team" ? activeTeamTab : activeStudyTab}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start"
          >
            {}
            <div>
              <h3 className="font-display text-[clamp(24px,3vw,40px)] tracking-[-0.04em] text-maze-black leading-[1.1] mb-6">
                {activeData.heading}
              </h3>
              <p className="text-neutral-500 text-base lg:text-lg leading-relaxed max-w-[480px] mb-8">
                {activeData.body}
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#book-call" className="px-5 py-2.5 text-sm font-medium text-white bg-maze-black rounded-lg hover:bg-black transition-colors">
                  Talk to us
                </a>
                <a href="#book-call" className="px-5 py-2.5 text-sm font-medium text-maze-black border border-neutral-400 rounded-full hover:border-maze-black hover:bg-white/80 backdrop-blur-sm transition-all">
                  Get a demo
                </a>
              </div>
            </div>

            {}
            <div>
              <HalftoneIllustration color={activeData.color} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
