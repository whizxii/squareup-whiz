import { useState, useEffect, useCallback } from "react";
import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import { Swords } from "lucide-react";

const CATEGORIES = [
  { label: "Analytics / BI", players: "Mixpanel, Amplitude, CleverTap", gap: "Shows what — not why" },
  { label: "Surveys", players: "Typeform, SurveyMonkey", gap: "No depth or follow-ups" },
  { label: "Support / CX", players: "Zendesk, Freshdesk, Sprinklr", gap: "Reactive, not decision input" },
];

const BATTLE_CARDS = [
  {
    vs: "Research Agencies",
    players: "Kantar, Nielsen, RedSeer",
    them: "₹30–50L · 8 weeks · manual analysis",
    us: "₹1–3L · 2 days · AI-synthesized briefs",
    punchline: "Same depth. 10× faster. 10× cheaper.",
  },
  {
    vs: "Survey Tools",
    players: "Typeform, SurveyMonkey",
    them: "Fixed questions · no follow-ups · surface-level data",
    us: "Adaptive AI probing · 70%+ insights from follow-ups",
    punchline: "Surveys collect answers. SquareUp uncovers truth.",
  },
  {
    vs: "VOC Platforms",
    players: "Qualtrics, Medallia",
    them: "Enterprise pricing · 6-month implementation · large teams",
    us: "Self-serve · deploys in hours · built for mid-market",
    punchline: "No implementation. No consulting fees. Just answers.",
  },
  {
    vs: "Research Repos",
    players: "Dovetail, Condens",
    them: "Organizes old research · no fresh signal generation",
    us: "Creates new intelligence on demand · decision-ready briefs",
    punchline: "They file the past. We generate the future.",
  },
];

export default function LandscapeSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter" || mode === "download");
  const [revealIndex, setRevealIndex] = useState(isPresenter ? 0 : BATTLE_CARDS.length);

  const advanceReveal = useCallback(() => {
    setRevealIndex(prev => Math.min(prev + 1, BATTLE_CARDS.length));
  }, []);

  useEffect(() => {
    if (!isPresenter) { setRevealIndex(BATTLE_CARDS.length); return; }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowDown") {
        if (revealIndex < BATTLE_CARDS.length) { e.preventDefault(); e.stopPropagation(); advanceReveal(); }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isPresenter, revealIndex, advanceReveal]);

  return (
    <section
      id="landscape"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        <div className={`${isPresenter ? "mb-8" : "mb-14"} transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Competitive Landscape
          </p>
          <h2 className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-5xl" : "text-4xl sm:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            The current stack collects fragments.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>SquareUp delivers decisions.</span>
          </h2>
        </div>

        {/* Compact existing stack tags */}
        {!isPresenter && (
          <div className={`mb-10 transition-all duration-700 delay-100 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--sq-muted) / 0.5)" }}>
              Adjacent tools — useful, but not built for customer understanding
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <div key={cat.label} className="inline-flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <span className="text-xs font-bold" style={{ color: "hsl(var(--sq-text))" }}>{cat.label}</span>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>{cat.gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Battle Cards — primary content */}
        <div className={`grid ${isPresenter ? "grid-cols-2 gap-5" : "grid-cols-1 sm:grid-cols-2 gap-5"}`}>
          {BATTLE_CARDS.map((card, i) => (
            <div
              key={card.vs}
              className={`rounded-2xl overflow-hidden transition-all duration-300 ${isPresenter && i >= revealIndex ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}`}
              style={{
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              }}
            >
              {/* Card header */}
              <div className={`flex items-center gap-2 ${isPresenter ? "px-4 py-2.5" : "px-5 py-3"}`}
                style={{ background: "hsl(var(--sq-subtle) / 0.5)", borderBottom: "1px solid hsl(var(--sq-subtle))" }}>
                <Swords size={14} style={{ color: "hsl(var(--sq-orange))" }} />
                <span className={`font-black ${isPresenter ? "text-xs" : "text-sm"}`} style={{ color: "hsl(var(--sq-text))" }}>
                  vs {card.vs}
                </span>
                <span className="text-[10px] font-medium ml-auto" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>
                  {card.players}
                </span>
              </div>

              <div className={`${isPresenter ? "p-4" : "p-5"}`}>
                {/* Them */}
                <div className="mb-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted) / 0.5)" }}>They offer</p>
                  <p className={`${isPresenter ? "text-xs" : "text-sm"} font-medium leading-relaxed`} style={{ color: "hsl(var(--sq-muted))" }}>
                    {card.them}
                  </p>
                </div>

                {/* Us */}
                <div className="mb-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-orange) / 0.7)" }}>SquareUp</p>
                  <p className={`${isPresenter ? "text-xs" : "text-sm"} font-bold leading-relaxed`} style={{ color: "hsl(var(--sq-text))" }}>
                    {card.us}
                  </p>
                </div>

                {/* Punchline */}
                <div className="rounded-lg px-3 py-2" style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.15)" }}>
                  <p className={`${isPresenter ? "text-[11px]" : "text-xs"} font-black`} style={{ color: "hsl(var(--sq-orange))" }}>
                    {card.punchline}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category validation + summary */}
        {!isPresenter && (
          <div className={`mt-8 flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-400 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex-1 rounded-xl px-5 py-4"
              style={{ background: "hsl(var(--sq-orange) / 0.04)", border: "1px dashed hsl(var(--sq-orange) / 0.25)" }}>
              <p className="text-xs font-bold" style={{ color: "hsl(var(--sq-orange))" }}>Category validation</p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--sq-muted))" }}>
                Conveo (YC S24, $5.3M) validates the category globally — they target Unilever & P&G. SquareUp owns India's consumer brands.
              </p>
            </div>
            <div className="flex-1 rounded-xl px-5 py-4"
              style={{ background: "hsl(var(--sq-orange) / 0.08)", border: "1px solid hsl(var(--sq-orange) / 0.25)" }}>
              <p className="text-xs font-bold" style={{ color: "hsl(var(--sq-orange))" }}>The only end-to-end platform</p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--sq-text))" }}>
                AI interviews → real-time synthesis → decision briefs → team routing. No one else does all four.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
