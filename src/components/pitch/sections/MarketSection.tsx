import { useScrollAnimation } from "@/lib/useScrollAnimation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { SlideMode } from "@/lib/slides";

// Bottoms-up: ~4,000 mid-market consumer brands in India × ~₹40L avg annual research spend = ~₹16,000Cr (~$2B TAM)
// SAM: brands actively outsourcing qual research today (~25%) → ~₹4,000Cr (~$480M)
// SOM: brands in metro cities with ₹100–500Cr revenue, already using agencies → ~₹800Cr (~$96M)
const BAR_DATA = [
  { year: "Yr 1", value: 0.8 },
  { year: "Yr 2", value: 2.1 },
  { year: "Yr 3", value: 5.4 },
  { year: "Yr 4", value: 11 },
  { year: "Yr 5", value: 22 },
];

const TAM_BREAKDOWN = [
  { label: "~4,000 mid-market Indian consumer brands", value: "~₹16,000Cr", sub: "TAM — avg ₹40L/yr research spend each (bottoms-up)", highlight: false },
  { label: "Brands actively buying qual research today", value: "~₹4,000Cr", sub: "SAM — ~25% currently outsource to agencies", highlight: false },
  { label: "Metro brands, ₹100–500Cr revenue, agency-ready", value: "~₹800Cr", sub: "SOM — our initial ICP: reachable, high urgency, fast sales", highlight: false },
  { label: "5% SOM capture in 5 years", value: "~₹40Cr ARR", sub: "~$5M — conservative, fully fundable at seed", highlight: true },
];

export default function MarketSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="market"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
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
          India has ~4,000 mid-market consumer brands.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>Most spend ₹40L/yr on research. Most of it is wasted.</span>
          </h2>
          <p className="mt-3 text-sm max-w-lg" style={{ color: "hsl(var(--sq-muted))" }}>
            We sized this bottoms-up — not from a global analyst report. ₹16,000Cr TAM in India alone. 25% are already spending on qual research today. We're replacing the agency with an AI that costs 10x less and delivers in 72 hours.
          </p>
        </div>

        <div className={`grid grid-cols-1 ${isPresenter ? "grid-cols-2" : "md:grid-cols-2"} gap-10 items-start transition-all duration-600 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>

          {/* TAM breakdown */}
          <div className="space-y-2">
            <p className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
              Market Sizing (TAM → SOM)
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
                <span className="font-black text-lg ml-4 flex-shrink-0" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div>
            <p className="font-bold text-xs uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
            SquareUp ARR trajectory — India SOM capture (₹Cr)
          </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={BAR_DATA} barCategoryGap="30%">
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(0,0%,50%)", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [`₹${v}Cr ARR`, "SquareUp"]}
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
        </div>

        <div className={`mt-10 text-center transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <p className="font-black" style={{ fontSize: "clamp(1.2rem, 3vw, 1.75rem)", color: "hsl(var(--sq-text))" }}>
            Prove it in India.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Port the playbook everywhere.</span>
          </p>
          <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
            5% of India SOM = ₹40Cr ARR (~$5M). Then SEA and MENA — same ICP, same problem, same playbook. India is the hardest proving ground. If it works here, it works anywhere.
          </p>
        </div>
      </div>
    </section>
  );
}
