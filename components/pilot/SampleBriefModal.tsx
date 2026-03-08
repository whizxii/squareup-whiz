"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Download } from "lucide-react";

// Place your full sample report PDF in website/public/ and update this path
const SAMPLE_REPORT_URL = "/SquareUp-Sample-Report.pdf";

const ROUTE_TO = [
  { team: "Product", action: "Pack architecture decision" },
  { team: "Growth", action: "Entry price positioning" },
  { team: "Leadership", action: "Launch risk flag" },
];

const TAGS = [
  { label: "Critical", accent: true },
  { label: "First-time buyers", accent: false },
  { label: "Urban, 22-28", accent: false },
  { label: "74% of respondents", accent: false },
];

const UNKNOWNS = [
  "Long-term repeat behaviour beyond trial SKU",
  "Price elasticity at scale (needs A/B test in-market)",
];

export default function SampleBriefModal({ onClose }: { onClose: () => void }) {
  // Synchronous check — this component only renders client-side (controlled by useState)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={
          isMobile
            ? "fixed inset-0 z-[101] bg-cream overflow-y-auto overscroll-contain"
            : "fixed inset-0 z-[101] flex items-start justify-center pt-[5vh] pb-[5vh] overflow-y-auto overscroll-contain"
        }
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div
          className={
            isMobile
              ? "min-h-full bg-cream"
              : "max-w-[900px] w-[calc(100%-48px)] rounded-3xl bg-cream my-auto"
          }
        >
          {/* Close bar */}
          <div
            className={`sticky top-0 z-10 flex items-center justify-between bg-cream/95 backdrop-blur-md border-b border-neutral-200/50 ${
              isMobile ? "px-5 h-[52px]" : "px-6 lg:px-10 h-[56px]"
            }`}
          >
            <span className="text-sm font-semibold text-maze-black">
              Sample Brief
            </span>
            <div className="flex items-center gap-1">
              <a
                href={SAMPLE_REPORT_URL}
                download
                className="h-9 px-3 flex items-center gap-1.5 rounded-full text-[12px] font-bold text-lime hover:bg-lime/[0.06] active:scale-[0.95] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download full report
              </a>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-200/50 active:scale-[0.95] transition-all"
              >
                <X className="w-5 h-5 text-maze-black" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 lg:p-10">
            {/* Credibility line */}
            <p className="text-[13px] text-maze-gray text-center italic mb-6">
              Built from real conversations, not assumptions.
            </p>

            {/* Brief Card */}
            <div
              className="rounded-2xl sm:rounded-3xl overflow-hidden"
              style={{
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.06)",
              }}
            >
              {/* Decision strip */}
              <div className="bg-lime/[0.06] border-b border-lime/[0.15] px-5 sm:px-8 py-4 sm:py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-lime mb-1">
                      Decision
                    </p>
                    <p className="font-display text-base sm:text-lg text-maze-black">
                      Test ₹399 / 50ml entry SKU before full launch
                    </p>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="sm:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray">
                        Confidence
                      </p>
                      <p className="font-bold text-sm text-lime">High</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray">
                        Based on
                      </p>
                      <p className="font-bold text-sm text-maze-black">
                        47 interviews
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5 sm:gap-8 p-5 sm:p-8 bg-white">
                {/* Left — Evidence */}
                <div className="space-y-4">
                  {/* Quote */}
                  <div className="rounded-2xl p-4 sm:p-5 bg-cream border border-neutral-200/60">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray mb-2">
                      Customer Quote
                    </p>
                    <p className="text-[15px] sm:text-base font-semibold italic leading-relaxed text-maze-black">
                      &ldquo;₹1200 is too much for an unproven scent. ₹399 for
                      a mini would fly.&rdquo;
                    </p>
                  </div>

                  {/* Theme + Severity */}
                  <div className="rounded-2xl p-4 sm:p-5 bg-cream border border-neutral-200/60">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray mb-1">
                          Theme
                        </p>
                        <p className="font-bold text-[15px] sm:text-base text-maze-black">
                          Price-Pack Mismatch
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray mb-1">
                          Severity
                        </p>
                        <p className="font-bold text-lg text-lime">
                          9.2
                          <span className="text-xs font-bold text-maze-gray">
                            /10
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TAGS.map((tag) => (
                        <span
                          key={tag.label}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            tag.accent
                              ? "bg-lime/10 text-lime"
                              : "bg-neutral-100 text-maze-gray"
                          }`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Evidence Trail */}
                  <div className="rounded-xl px-4 sm:px-5 py-3 bg-lime/[0.04] border border-lime/[0.12]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-lime mb-1">
                      Evidence Trail
                    </p>
                    <p className="text-xs font-medium text-maze-gray">
                      47 conversations · 35 surfaced unprompted · 12
                      contradictions flagged
                    </p>
                  </div>
                </div>

                {/* Right — Action */}
                <div className="space-y-4">
                  {/* Recommendation */}
                  <div className="rounded-2xl p-4 sm:p-5 bg-lime/[0.06] border border-lime/[0.2]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-lime mb-2">
                      Recommendation
                    </p>
                    <p className="font-bold text-[15px] sm:text-base leading-snug text-maze-black">
                      Launch ₹399 / 50ml entry SKU before full launch
                    </p>
                  </div>

                  {/* Route To */}
                  <div className="rounded-2xl p-4 sm:p-5 bg-cream border border-neutral-200/60">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray mb-3">
                      Route To
                    </p>
                    <div className="space-y-2">
                      {ROUTE_TO.map((r) => (
                        <div key={r.team} className="flex items-center gap-2">
                          <span className="font-bold text-xs text-lime flex-shrink-0">
                            →
                          </span>
                          <span className="font-bold text-xs text-maze-black">
                            {r.team}:
                          </span>
                          <span className="text-xs text-maze-gray">
                            {r.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision Owner */}
                  <div className="rounded-xl px-4 sm:px-5 py-3 bg-neutral-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-maze-gray mb-1">
                      Decision Owner
                    </p>
                    <p className="font-bold text-sm text-maze-black">
                      Product Lead
                    </p>
                  </div>
                </div>
              </div>

              {/* What we don't know yet */}
              <div className="px-5 sm:px-8 py-4 sm:py-5 bg-white border-t border-neutral-200/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-maze-gray mb-3">
                  What this does not tell us yet
                </p>
                <div className="rounded-xl bg-cream-dark px-4 sm:px-5 py-3 sm:py-4">
                  <ul className="space-y-1.5">
                    {UNKNOWNS.map((item) => (
                      <li
                        key={item}
                        className="text-xs sm:text-sm text-maze-gray flex items-start gap-2"
                      >
                        <span className="text-maze-gray/40 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-8 py-3 sm:py-4 bg-cream border-t border-neutral-200/30">
                <p className="text-[11px] text-maze-gray/60 text-center">
                  Every recommendation is traceable back to raw customer
                  evidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
