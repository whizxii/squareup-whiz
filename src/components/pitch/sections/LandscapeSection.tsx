import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

type Row = { tool: string; good: string; bad: string; players: string; sq?: boolean };

const EXISTING_STACK: Row[] = [
  { tool: "Analytics / BI", good: "Shows what happened", bad: "Cannot explain why customers behaved that way", players: "Google Analytics, Mixpanel, Amplitude, CleverTap" },
  { tool: "Surveys", good: "Fast directional signal", bad: "Weak depth, weak follow-up, weak nuance", players: "SurveyMonkey, Typeform, Google Forms" },
  { tool: "Support / CX Tools", good: "Surfaces complaints at scale", bad: "Reactive noise, not structured decision input", players: "Zendesk, Freshdesk, Intercom, Sprinklr" },
];

const DIRECT_ALTERNATIVES: Row[] = [
  { tool: "VOC / Experience Platforms", good: "Enterprise-grade feedback programs", bad: "Survey-centric, slow to act on, requires large teams", players: "Qualtrics, Medallia, InMoment, Confirmit" },
  { tool: "Qual Research Platforms", good: "Runs remote interviews & usability tests", bad: "No synthesis, no routing, no repository", players: "UserTesting, Discuss.io, dscout, Respondent" },
  { tool: "Research Repositories", good: "Organizes existing research data", bad: "Does not generate fresh signal on demand", players: "Dovetail, Condens, EnjoyHQ, Great Question" },
  { tool: "Research Agencies", good: "Deep custom qualitative work", bad: "Too slow and expensive for operating cadence", players: "Nielsen, Kantar, Ipsos, RedSeer" },
];

const SQUAREUP_ROW: Row = {
  tool: "SquareUp",
  good: "AI-led interviews → synthesis → decision-ready briefs → team routing",
  bad: "",
  players: "",
  sq: true,
};

const WHY_WE_WIN = [
  {
    vs: "Research Agencies",
    players: "Kantar, Nielsen, RedSeer",
    advantage: "₹1-3L in 2 days vs ₹30-50L in 8 weeks",
    detail: "Same interview depth. 10x faster. 10x cheaper. No project managers needed.",
  },
  {
    vs: "Survey Tools",
    players: "Typeform, SurveyMonkey",
    advantage: "AI probes deeper with adaptive follow-ups",
    detail: "70%+ of actionable insights come from follow-up questions. Surveys can't do this.",
  },
  {
    vs: "VOC Platforms",
    players: "Qualtrics, Medallia",
    advantage: "Built for mid-market, deploys in hours",
    detail: "Enterprise pricing and complexity vs. self-serve simplicity. No 6-month implementation.",
  },
  {
    vs: "Research Repos",
    players: "Dovetail, Condens",
    advantage: "Generates fresh signal on demand",
    detail: "They organize old data. We create new customer intelligence and deliver decision-ready briefs.",
  },
];

export default function LandscapeSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  const thCls = `${isPresenter ? "py-2 px-3 text-[10px]" : "py-3 px-4 text-xs"} font-bold tracking-widest uppercase`;
  const tdCls = `${isPresenter ? "py-2.5 px-3 text-xs" : "py-3.5 px-4 text-sm"}`;

  const renderRow = (row: Row) => (
    <tr
      key={row.tool}
      className={`border-b transition-colors ${row.sq ? "border-2" : ""}`}
      style={{
        borderColor: row.sq ? "hsl(var(--sq-orange) / 0.4)" : "hsl(var(--sq-subtle))",
        background: row.sq ? "hsl(var(--sq-orange) / 0.05)" : "transparent",
      }}
    >
      <td className={`${tdCls} font-bold`} style={{ color: row.sq ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
        {row.tool}
      </td>
      {row.sq ? (
        <>
          <td colSpan={3} className={`${tdCls} font-bold`} style={{ color: "hsl(var(--sq-text))" }}>
            {row.good}
          </td>
        </>
      ) : (
        <>
          <td className={`${tdCls} font-medium`} style={{ color: "hsl(var(--sq-text))" }}>{row.good}</td>
          <td className={`${tdCls} font-medium`} style={{ color: "hsl(var(--sq-muted))" }}>{row.bad}</td>
          <td className={`${tdCls} font-medium ${isPresenter ? "text-[10px]" : "text-xs"}`} style={{ color: "hsl(var(--sq-muted) / 0.7)" }}>{row.players}</td>
        </>
      )}
    </tr>
  );

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

        <div className={`overflow-x-auto transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <table className={`w-full text-left border-collapse ${isPresenter ? "" : "min-w-[900px]"}`}>
            <thead>
              <tr className="border-b-2" style={{ borderColor: "hsl(var(--sq-text))" }}>
                <th className={thCls} style={{ color: "hsl(var(--sq-muted))" }}>Category</th>
                <th className={thCls} style={{ color: "hsl(var(--sq-text))" }}>What it does well</th>
                <th className={`${thCls} text-red-400`}>Where it falls short</th>
                <th className={thCls} style={{ color: "hsl(var(--sq-muted))" }}>Key Players</th>
              </tr>
            </thead>
            <tbody>
              {/* Group label: Existing Stack */}
              <tr>
                <td colSpan={4} className={`${isPresenter ? "pt-3 pb-1 px-3 text-[10px]" : "pt-5 pb-2 px-4 text-[11px]"} font-black uppercase tracking-widest`}
                  style={{ color: "hsl(var(--sq-muted) / 0.5)" }}>
                  Existing Stack — Used widely, but not built for customer understanding
                </td>
              </tr>
              {EXISTING_STACK.map(renderRow)}

              {/* Group label: Direct Alternatives */}
              <tr>
                <td colSpan={4} className={`${isPresenter ? "pt-5 pb-1 px-3 text-[10px]" : "pt-8 pb-2 px-4 text-[11px]"} font-black uppercase tracking-widest`}
                  style={{ color: "hsl(var(--sq-muted) / 0.5)" }}>
                  Direct Alternatives — Closest to what SquareUp does
                </td>
              </tr>
              {DIRECT_ALTERNATIVES.map(renderRow)}

              {/* SquareUp */}
              {renderRow(SQUAREUP_ROW)}
            </tbody>
          </table>
        </div>

        {/* Why SquareUp Wins — head-to-head */}
        <div className={`${isPresenter ? "mt-8" : "mt-14"} transition-all duration-700 delay-400 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
            Why SquareUp Wins
          </p>
          <div className={`grid ${isPresenter ? "grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"} gap-4`}>
            {WHY_WE_WIN.map((item) => (
              <div key={item.vs} className={`rounded-2xl ${isPresenter ? "p-4" : "p-5"}`}
                style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>
                  vs {item.players}
                </p>
                <p className={`font-black ${isPresenter ? "text-xs" : "text-sm"} mb-1`} style={{ color: "hsl(var(--sq-orange))" }}>
                  {item.advantage}
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Conveo callout + summary */}
          {!isPresenter && (
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
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
      </div>
    </section>
  );
}
