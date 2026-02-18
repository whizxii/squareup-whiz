import { useScrollAnimation } from "@/lib/useScrollAnimation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { SlideMode } from "@/lib/slides";

const BAR_DATA = [
  { year: "Yr 1", value: 0.5, note: "India only" },
  { year: "Yr 2", value: 1.5, note: "India + SEA pilot" },
  { year: "Yr 3", value: 4, note: "India + SEA" },
  { year: "Yr 4", value: 10, note: "India + SEA + MENA" },
  { year: "Yr 5", value: 25, note: "Multi-market" },
];

const TAM_BREAKDOWN = [
  { label: "~4,000 mid-market Indian consumer brands", value: "~₹16,000Cr", sub: "TAM — avg ₹40L/yr research spend each (bottoms-up)", highlight: false },
  { label: "Brands actively buying qual research today", value: "~₹4,000Cr", sub: "SAM — ~25% currently outsource to agencies", highlight: false },
  { label: "Metro brands, ₹100–500Cr revenue, agency-ready", value: "~₹800Cr", sub: "SOM — initial ICP: high urgency, fast to close", highlight: false },
  { label: "5% SOM capture by Yr 3", value: "~₹40Cr ARR", sub: "~$5M — India proof, seed-fundable", highlight: true },
];

const GLOBAL_MARKETS = [
  { flag: "🇮🇳", market: "India (beachhead)", brands: "~4,000", spend: "~₹16,000Cr", status: "Proving now", active: true },
  { flag: "🌏", market: "SEA — Indonesia, Vietnam, Thailand", brands: "~6,000", spend: "~$1.2B", status: "Yr 2–3", active: false },
  { flag: "🌍", market: "MENA — UAE, Saudi, Egypt", brands: "~3,500", spend: "~$800M", status: "Yr 3–4", active: false },
  { flag: "🌐", market: "Global mid-market (ex-China)", brands: "~50,000+", spend: "~$18B+", status: "Series B", active: false },
];

export default function MarketSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="market"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Market Size
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            India is the beachhead.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>The problem is everywhere.</span>
          </h2>
          <p className="mt-3 text-sm max-w-xl" style={{ color: "hsl(var(--sq-muted))" }}>
            We sized India bottoms-up — not from an analyst report. ~4,000 mid-market consumer brands, ₹40L/yr average research spend. That's ₹16,000Cr in India alone. The same ICP exists in SEA, MENA, and every market where consumer brands outgrow gut feel.
          </p>
        </div>

        {/* Two-column: India beachhead + Global expansion */}
        <div className={`grid grid-cols-1 ${isPresenter ? "grid-cols-2" : "md:grid-cols-2"} gap-10 items-start transition-all duration-600 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>

          {/* Left — India TAM breakdown */}
          <div className="space-y-2">
            <p className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
              🇮🇳 India Beachhead (TAM → SOM)
            </p>
            {TAM_BREAKDOWN.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl px-5 py-4"
                style={{
                  background: item.highlight ? "hsl(var(--sq-orange) / 0.08)" : "hsl(var(--sq-card))",
                  border: `1px solid ${item.highlight ? "hsl(var(--sq-orange) / 0.25)" : "hsl(var(--sq-subtle))"}`,
                }}
              >
                <div>
                  <p className="font-bold text-sm" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                    {item.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{item.sub}</p>
                </div>
                <span className="font-black text-base ml-4 flex-shrink-0" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                  {item.value}
                </span>
              </div>
            ))}
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
                  className="rounded-xl px-4 py-4"
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
                          {row.brands} brands · {row.spend}
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
              <p className="text-xs pt-2 font-semibold" style={{ color: "hsl(var(--sq-muted))" }}>
                Total addressable market: <span style={{ color: "hsl(var(--sq-orange))" }}>$20B+</span> globally
              </p>
            </div>
          </div>
        </div>

        {/* ARR trajectory — India → Global */}
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

        {/* Footer callout */}
        <div className={`mt-10 text-center transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <p className="font-black" style={{ fontSize: "clamp(1.2rem, 3vw, 1.75rem)", color: "hsl(var(--sq-text))" }}>
            $20B+ global market.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>We're starting with the hardest 10%.</span>
          </p>
          <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
            India is the proving ground. SEA and MENA are the prize. Global mid-market is the endgame.
          </p>
        </div>

      </div>
    </section>
  );
}
