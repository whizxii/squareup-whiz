import { useScrollAnimation } from "@/lib/useScrollAnimation";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { SlideMode } from "@/lib/slides";

const PIE_DATA = [
  { name: "SquareUp TAM", value: 0.5 },
  { name: "Rest of Market", value: 99.5 },
];
const BAR_DATA = [
  { year: "2024", value: 26 },
  { year: "2026", value: 38 },
  { year: "2028", value: 54 },
  { year: "2030", value: 71 },
  { year: "2034", value: 84 },
];

export default function MarketSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="market"
      className={`bg-sq-off-white ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-12 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          A <span className="text-sq-orange">$142B industry</span> ready for disruption.
        </h2>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center transition-all duration-600 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>
          {/* Pie */}
          <div className="text-center">
            <p className="font-bold text-sq-muted text-sm uppercase tracking-wider mb-4">Global CX Insights Market</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={65} outerRadius={105} startAngle={90} endAngle={-270} dataKey="value">
                  <Cell fill="hsl(18,100%,60%)" />
                  <Cell fill="hsl(0,0%,90%)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <p className="font-black text-sq-text text-lg mt-2">$142B total market</p>
            <p className="text-sq-orange font-bold text-sm">0.5% capture = <span className="text-xl">$710M</span></p>
          </div>

          {/* Bar */}
          <div>
            <p className="font-bold text-sq-muted text-sm uppercase tracking-wider mb-4 text-center">CX Management Market Growth ($B)</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={BAR_DATA} barCategoryGap="30%">
                <XAxis dataKey="year" tick={{ fill: "hsl(0,0%,50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [`$${v}B`, "Market Size"]} contentStyle={{ background: "white", border: "1px solid hsl(0,0%,90%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(18,100%,60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`mt-10 text-center transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <p className="font-black text-sq-text text-xl sm:text-2xl">
            Capturing <span className="text-sq-orange">0.5% = $710M.</span>
          </p>
          <p className="text-sq-muted text-sm mt-2 max-w-xl mx-auto">
            We're starting with the hardest, most underserved part of this market — and building the distribution moat to own it.
          </p>
        </div>
      </div>
    </section>
  );
}
