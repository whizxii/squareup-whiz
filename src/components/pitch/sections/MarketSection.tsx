import { useState, useEffect, useCallback } from "react";
import { useScrollAnimation } from "@/lib/useScrollAnimation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { SlideMode } from "@/lib/slides";

const BAR_DATA = [
  { year: "Yr 1", value: 0.5, note: "India only" },
  { year: "Yr 2", value: 1.5, note: "India + MENA pilot" },
  { year: "Yr 3", value: 5, note: "India + MENA" },
  { year: "Yr 4", value: 10, note: "India + MENA + Global" },
  { year: "Yr 5", value: 25, note: "Multi-market" },
];

const TAM_FUNNEL = [
  {
    label: "Consumer company research in India",
    value: "~$600M",
    sub: "65% of India's $930M custom research spend (MRSI FY2024) — FMCG, platforms, D2C, retail, QSR, BPC",
    highlight: false,
    layer: "Existing Spend",
  },
  {
    label: "Market expansion — AI unlocks new demand",
    value: "+$100M+",
    sub: "10,000+ companies that can't afford ₹30-50L agency studies can now do ₹1-3L AI research",
    highlight: false,
    layer: "New Market",
  },
  {
    label: "India TAM",
    value: "~$700M",
    sub: "TAM — existing disruption + market creation",
    highlight: true,
    layer: "Total",
  },
  {
    label: "Actively outsourcing, metro, funded/profitable",
    value: "~$200M",
    sub: "SAM — companies seeking solutions today",
    highlight: false,
    layer: "SAM",
  },
  {
    label: "High urgency, ₹50Cr-5,000Cr revenue, closeable in <90d",
    value: "~$100M",
    sub: "SOM — initial ICP across FMCG, D2C, platforms",
    highlight: false,
    layer: "SOM",
  },
  {
    label: "Yr 3 target — seed proof point",
    value: "~$4-5M ARR",
    sub: "4-5% SOM capture — proof of repeatable motion",
    highlight: true,
    layer: "Target",
  },
];

const GLOBAL_MARKETS = [
  { flag: "🇮🇳", market: "India (beachhead)", brands: "All consumer-facing", spend: "~$700M", status: "Proving now", active: true },
  { flag: "🌍", market: "MENA — UAE, Saudi, Egypt", brands: "~3,500+", spend: "~$800M", status: "Yr 2–3", active: false },
  { flag: "🌐", market: "Global mid-market (ex-China)", brands: "50,000+", spend: "~$18B+", status: "Series A+", active: false },
];

export default function MarketSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter" || mode === "download");
  const [funnelReveal, setFunnelReveal] = useState(isPresenter ? 0 : TAM_FUNNEL.length);

  const advanceFunnel = useCallback(() => {
    setFunnelReveal(prev => Math.min(prev + 1, TAM_FUNNEL.length));
  }, []);

  useEffect(() => {
    if (!isPresenter) { setFunnelReveal(TAM_FUNNEL.length); return; }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowDown") {
        if (funnelReveal < TAM_FUNNEL.length) { e.preventDefault(); e.stopPropagation(); advanceFunnel(); }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isPresenter, funnelReveal, advanceFunnel]);

  return (
    <section
      id="market"
      className={`${isPresenter ? "min-h-screen flex items-center px-16 py-10" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`${isPresenter ? "mb-8" : "mb-14"} transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Market Size
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-4xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Not just replacing agencies.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>Creating a market that didn't exist.</span>
          </h2>
          <p className={`mt-3 text-sm max-w-xl`} style={{ color: "hsl(var(--sq-muted))" }}>
            India is the world's 3rd largest research & insights market at $3.2B (MRSI FY2024). Today, only the top 100-200 companies can afford structured qualitative research. AI makes it accessible to tens of thousands more.
          </p>
          {!isPresenter && (
            <div className="mt-4 flex flex-wrap gap-3 max-w-2xl">
              {[
                { val: "$3.2B", label: "India research industry (MRSI FY2024)", desc: "3rd largest globally, 12.6% YoY growth" },
                { val: "$930M", label: "Custom research segment (29%)", desc: "Tailored qual & quant for business decisions" },
                { val: "$140B", label: "Global research industry (ESOMAR)", desc: "SquareUp's long-term market" },
              ].map((a) => (
                <div key={a.label} className="flex-1 min-w-[160px] rounded-xl px-4 py-3"
                  style={{ background: "hsl(var(--sq-orange) / 0.05)", border: "1px solid hsl(var(--sq-orange) / 0.15)" }}>
                  <p className="font-black text-base" style={{ color: "hsl(var(--sq-orange))" }}>{a.val}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: "hsl(var(--sq-text))" }}>{a.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{a.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Two-column: India TAM + Global expansion */}
        <div className={`grid grid-cols-1 ${isPresenter ? "grid-cols-2" : "md:grid-cols-2"} gap-10 items-start transition-all duration-600 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>

          {/* Left — India TAM funnel */}
          <div className="space-y-2">
            <p className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
              🇮🇳 India TAM — How We Sized It
            </p>
            {TAM_FUNNEL.map((item, i) => {
              const widthPct = 100 - i * 8;
              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-xl ${isPresenter ? "px-4 py-3" : "px-5 py-4"} transition-all duration-500 ${isPresenter && i >= funnelReveal ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}`}
                  style={{
                    width: `${widthPct}%`,
                    marginLeft: "auto",
                    marginRight: "auto",
                    transitionDelay: !isPresenter ? `${i * 100}ms` : "0ms",
                    background: item.highlight ? "hsl(var(--sq-orange) / 0.08)" : "hsl(var(--sq-card))",
                    border: `1px solid ${item.highlight ? "hsl(var(--sq-orange) / 0.25)" : "hsl(var(--sq-subtle))"}`,
                  }}
                >
                  <div className="min-w-0 mr-3">
                    <p className="font-bold text-sm" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                      {item.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{item.sub}</p>
                  </div>
                  <span className="font-black text-base ml-4 flex-shrink-0" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                    {item.value}
                  </span>
                </div>
              );
            })}
            {!isPresenter && (
              <p className="text-[10px] pt-2 font-semibold" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>
                Sources: MRSI Annual Industry Report FY2024 · ESOMAR Global Market Research 2024 · Avendus D2C Report
              </p>
            )}
          </div>

          {/* Right — Global expansion table */}
          <div>
            <p className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
              🌐 Global Expansion Roadmap
            </p>
            <div className="space-y-2">
              {GLOBAL_MARKETS.map((row) => (
                <div
                  key={row.market}
                  className={`rounded-xl ${isPresenter ? "px-3 py-3" : "px-4 py-4"}`}
                  style={{
                    background: row.active ? "hsl(var(--sq-orange) / 0.06)" : "hsl(var(--sq-card))",
                    border: `1px solid ${row.active ? "hsl(var(--sq-orange) / 0.3)" : "hsl(var(--sq-subtle))"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">{row.flag}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: "hsl(var(--sq-text))" }}>{row.market}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>
                          {row.brands} · {row.spend}
                        </p>
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: row.active ? "hsl(var(--sq-orange))" : "hsl(var(--sq-subtle))",
                        color: row.active ? "white" : "hsl(var(--sq-muted))",
                      }}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}

              {/* Conveo validation callout */}
              <div className="rounded-xl px-4 py-3 mt-2"
                style={{ background: "hsl(var(--sq-orange) / 0.04)", border: "1px dashed hsl(var(--sq-orange) / 0.25)" }}>
                <p className="text-xs font-bold" style={{ color: "hsl(var(--sq-orange))" }}>Category validation</p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--sq-muted))" }}>
                  Conveo.ai (YC S24) raised $5.3M targeting the same $140B global market. They serve Unilever & P&G. SquareUp goes after that same market starting from India.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ARR trajectory — India → Global (hidden in presenter) */}
        {!isPresenter && (
          <div className={`mt-12 transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
              SquareUp ARR trajectory — India → Global ($M)
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={BAR_DATA} barCategoryGap="30%">
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(0,0%,50%)", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v, _name, props) => [`$${v}M ARR`, props.payload?.note ?? "SquareUp"]}
                  contentStyle={{
                    background: "white",
                    border: "1px solid hsl(0,0%,90%)",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {BAR_DATA.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === BAR_DATA.length - 1
                        ? "hsl(var(--sq-orange))"
                        : "hsl(var(--sq-orange) / 0.35)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer callout */}
        <div className={`${isPresenter ? "mt-6" : "mt-10"} text-center transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <p className="font-black" style={{ fontSize: "clamp(1.2rem, 3vw, 1.75rem)", color: "hsl(var(--sq-text))" }}>
            $140B global research industry.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>India is proving ground. Global is the prize.</span>
          </p>
          {!isPresenter && (
            <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
              Like Canva democratized design, SquareUp makes structured customer intelligence accessible to every consumer brand — not just the top 200.
            </p>
          )}
        </div>

      </div>
    </section>
  );
}
