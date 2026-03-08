"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, Globe, Briefcase, Heart, Users, BookOpen, Compass } from "lucide-react";

const tabs = [
  {
    id: "call",
    label: "Call",
    title: "Reach the right people, effortlessly",
    body: "Instantly call all your customers to either recruit them for or a study or conduct autonomous interviews. Square Up handles precise targeting and scheduling, giving you room to conduct smarter studies at scale without worrying about logistics.",
    cardBg: "bg-[#FFE5DE]",
    cardContent: "demographics",
    align: "center" as const,
  },
  {
    id: "synthesis",
    label: "Synthesis",
    title: "Influence key decisions with evidence",
    body: "All your discoveries live in one hub, ready to share and act on. Automated reports highlight relevant clips, stats, and stories, turning research into evidence that drives decisions. Square Up cuts through the noise to surface patterns and signals, so you can spend less time on busywork and more time shaping change.",
    cardBg: "bg-[#FFF0E6]",
    cardContent: "criteria",
    align: "center" as const,
  },
  {
    id: "action",
    label: "Action",
    title: "Turn insights into action",
    body: "Whether insights come from calls, interviews, feedback, or reports, Square Up keeps them from disappearing. It transforms findings into actionable outputs and pushes them to the teams who need to act, so nothing important slips through the cracks.",
    cardBg: "bg-[#EDE8E2]",
    cardContent: "report",
    align: "center" as const,
  },
];

const demographicItems = [
  { icon: Globe, label: "Demographics & Geography" },
  { icon: Briefcase, label: "Work & Education" },
  { icon: Heart, label: "Health & Well-being" },
  { icon: Users, label: "Family & Relationships" },
  { icon: BookOpen, label: "Beliefs" },
  { icon: Compass, label: "Interests & Lifestyle" },
];

function DemographicsCard() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 max-w-[280px] mx-auto">
      <div className="space-y-1">
        {demographicItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#FFE5DE] flex items-center justify-center">
                <item.icon className="w-3.5 h-3.5 text-[#FF5A36]" />
              </div>
              <span className="text-sm font-medium text-maze-black">
                {item.label}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-400 -rotate-90 group-hover:text-neutral-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CriteriaCard() {
  const countries = ["Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan"];
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 max-w-[280px] mx-auto">
      <h4 className="text-lg font-semibold mb-4">Criteria</h4>
      <div className="mb-4">
        <label className="text-sm text-neutral-600 mb-1 block">Country *</label>
        <div className="border border-neutral-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-neutral-400">Select</span>
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="mt-1 border border-neutral-100 rounded-lg overflow-hidden">
          {countries.map((c, i) => (
            <div key={i} className="px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer">
              {c}
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="text-sm text-neutral-600 mb-1 block">Advanced criteria</label>
        <div className="border border-neutral-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-neutral-400">Select</span>
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        </div>
      </div>
      <button className="w-full bg-maze-black text-white text-sm rounded-lg py-2 hover:bg-black transition-colors">
        Continue
      </button>
    </div>
  );
}

function ReportCard() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 max-w-[280px] mx-auto">
      <div className="flex items-center gap-2 mb-3 text-xs text-neutral-500">
        <div className="w-4 h-4 rounded bg-[#FF5A36] flex items-center justify-center">
          <span className="text-white text-[7px] font-bold">M</span>
        </div>
        <span>Mobile app / Feature report</span>
      </div>
      <div className="rounded-lg bg-[#FFE5DE] aspect-[16/10] flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 120" className="w-full opacity-30">
          {Array.from({ length: 30 }).map((_, i) => (
            <circle
              key={i}
              cx={20 + (i % 10) * 18}
              cy={20 + Math.floor(i / 10) * 30}
              r={4}
              fill="#FF5A36"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

const rotatingWords = ["Calls", "Reports", "Decisions"];

export default function CoreFeatures() {
  const [activeTab, setActiveTab] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section data-section-name="core-features" className="relative z-10 py-12 sm:py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.03em] text-maze-black leading-[1.2]">
            Square Up helps you across
          </h2>
          <div className="h-[1.2em] relative overflow-hidden text-center" style={{ fontSize: "clamp(32px,4vw,56px)" }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={wordIndex}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="font-display tracking-[-0.03em] text-[#FF5A36] leading-[1.2] absolute inset-x-0"
              >
                {rotatingWords[wordIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {}
        <div className="flex gap-0 mb-0">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`group relative flex-1 flex items-center ${tab.align === "center" ? "justify-center" : "justify-start"} gap-2 cursor-pointer px-2 py-2.5 sm:px-4 sm:py-3 md:px-6 min-h-[44px] rounded-t-lg md:rounded-t-2xl transition-all duration-500 ease-in-out ${
                activeTab === i
                  ? ""
                  : "hover:bg-white/10"
              }`}
              style={
                activeTab === i
                  ? {
                      background: "linear-gradient(160deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.20) 60%, rgba(255,255,255,0.35) 100%)",
                      backdropFilter: "blur(48px) saturate(2.0)",
                      WebkitBackdropFilter: "blur(48px) saturate(2.0)",
                      borderTop: "1px solid rgba(255,255,255,0.55)",
                      borderLeft: "1px solid rgba(255,255,255,0.55)",
                      borderRight: "1px solid rgba(255,255,255,0.55)",
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.90), inset 0 -1px 1px rgba(0,0,0,0.02)",
                    }
                  : {}
              }
            >
              <h2
                className={`font-display text-[clamp(32px,4vw,56px)] tracking-[-0.04em] ${tab.align === "center" ? "text-center" : "text-left"} transition-all duration-300 ${
                  activeTab === i
                    ? "text-maze-black"
                    : "text-neutral-400 group-hover:text-neutral-600"
                }`}
              >
                {tab.label}
              </h2>
            </button>
          ))}
        </div>

        {}
        <div
          className="rounded-b-2xl rounded-tr-2xl lg:rounded-tr-none p-4 sm:p-6 lg:p-10 min-h-[400px] h-auto sm:h-[576px] lg:h-[504px]"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.18) 60%, rgba(255,255,255,0.30) 100%)",
            backdropFilter: "blur(48px) saturate(2.0)",
            WebkitBackdropFilter: "blur(48px) saturate(2.0)",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow: "0 16px 56px -8px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.90), inset 0 -1px 1px rgba(0,0,0,0.04)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-start h-full"
            >
              {}
              <div>
                <h3 className="font-display text-[clamp(24px,3vw,40px)] tracking-[-0.03em] text-maze-black leading-tight mb-4">
                  {tabs[activeTab].title}
                </h3>
                <p className="text-neutral-600 text-sm lg:text-base leading-relaxed max-w-[440px] mb-6">
                  {tabs[activeTab].body}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-maze-black hover:gap-3 transition-all"
                >
                  Learn more <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {}
              <div
                className={`rounded-2xl p-6 lg:p-8 ${tabs[activeTab].cardBg} h-full flex items-center justify-center overflow-hidden`}
              >
                {tabs[activeTab].cardContent === "demographics" && <DemographicsCard />}
                {tabs[activeTab].cardContent === "criteria" && <CriteriaCard />}
                {tabs[activeTab].cardContent === "report" && <ReportCard />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
