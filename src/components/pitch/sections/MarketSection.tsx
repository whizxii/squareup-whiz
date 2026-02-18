import { useScrollAnimation } from "@/lib/useScrollAnimation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { SlideMode } from "@/lib/slides";

const BAR_DATA = [
  { year: "2024", value: 26 },
  { year: "2026", value: 38 },
  { year: "2028", value: 54 },
  { year: "2030", value: 71 },
  { year: "2034", value: 84 },
];

const TAM_BREAKDOWN = [
  { label: "Global CX & Insights Market", value: "$142B", sub: "TAM — Grand View Research, 2024", highlight: false },
  { label: "AI-Powered Research Tools", value: "$18B", sub: "SAM — tools replacing human-led research", highlight: false },
  { label: "Consumer Brands (SquareUp ICP)", value: "$2.8B", sub: "SOM — mid-market consumer, India + SEA first", highlight: false },
  { label: "0.5% of SOM in 5 years", value: "$710M", sub: "Our target — highly conservative at that capture rate", highlight: true },
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
            $142B market. Disrupted by AI.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>We're going in at the seam.</span>
          </h2>
          <p className="mt-3 text-sm max-w-lg" style={{ color: "hsl(var(--sq-muted))" }}>
            We're not chasing the whole market. We're starting with the slice traditional firms are worst at serving: consumer brands who need insight in days, not months.
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
              CX Management Market Growth ($B) — Grand View Research
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
                  formatter={(v) => [`$${v}B`, "Market Size"]}
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
            0.5% of our SOM ={" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>$710M.</span>
          </p>
          <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
            We're not betting on capturing the whole market. We're betting on being the only credible tool in the top-right quadrant.
          </p>
        </div>
      </div>
    </section>
  );
}
