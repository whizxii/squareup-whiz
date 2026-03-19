"use client";

import { useStudy } from "@/lib/study-context";
import StatsSidebar from "@/components/layout/StatsSidebar";

function BarChart({ title, items }: { title: string; items: { label: string; value: number; color?: string }[] }) {
  const maxValue = Math.max(...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      <h4 className="font-display font-semibold text-sm text-maze-black">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-maze-gray w-28 text-right flex-shrink-0">{item.label}</span>
            <div className="flex-1 h-6 bg-cream-dark rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || "#FF5A36",
                }}
              />
            </div>
            <span className="text-xs font-medium text-maze-black w-10">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ title, items }: { title: string; items: { label: string; value: number; color?: string }[] }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {items.map((item) => {
            const pct = (item.value / total) * 100;
            const offset = cumulative;
            cumulative += pct;
            return (
              <circle
                key={item.label}
                cx="18" cy="18" r="15.9" fill="none"
                stroke={item.color || "#eae5dd"}
                strokeWidth="3.5"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={`${-offset}`}
              />
            );
          })}
        </svg>
      </div>
      <div className="space-y-2">
        <h4 className="font-display font-semibold text-sm text-maze-black">{title}</h4>
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || "#eae5dd" }} />
            <span className="text-maze-gray">{item.label}</span>
            <span className="font-medium text-maze-black">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { activeStudy } = useStudy();
  if (!activeStudy) return null;

  const {
    study,
    executiveSummary,
    whatWeLearned,
    whatItMeans,
    recommendations,
    charts,
    themes,
    respondents,
  } = activeStudy;

  const positioningChart = charts.find((c) => c.id === "chart-positioning");
  const discoveryChart = charts.find((c) => c.id === "chart-discovery");
  const priceChart = charts.find((c) => c.id === "chart-price");
  const driversChart = charts.find((c) => c.id === "chart-drivers");

  // Get featured quotes — one per objective
  const featuredQuotes = study.objectives.map((obj) => {
    const objThemes = themes.filter((t) => t.objectiveId === obj.id);
    const firstQuote = objThemes[0]?.quotes[0];
    return firstQuote;
  }).filter(Boolean);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-2xl text-maze-black">{study.title}</h1>
              <p className="text-sm text-maze-gray mt-1">Decision Brief for {study.stakeholder}</p>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-coral text-white rounded-full text-sm font-medium hover:bg-coral-bright transition-colors">
                Share
              </button>
              <button className="px-5 py-2.5 border border-maze-black/15 text-maze-black rounded-full text-sm font-medium hover:bg-cream transition-colors">
                Download PDF
              </button>
            </div>
          </div>

          {/* Executive Summary — with coral glow */}
          <div className="coral-glow rounded-2xl p-6 bg-white space-y-4 animate-fade-in">
            <h2 className="font-display font-bold text-lg text-coral">Key Takeaway</h2>
            <p className="font-display font-semibold text-xl text-maze-black leading-snug">
              {executiveSummary.keyTakeaway}
            </p>
            <p className="text-sm text-maze-gray leading-relaxed">
              {executiveSummary.whyItMatters}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                {executiveSummary.confidence}
              </span>
            </div>
          </div>

          {/* Why We Believe This */}
          <div className="bg-cream rounded-2xl p-5 space-y-2">
            <h3 className="font-display font-semibold text-sm text-maze-black">Why We Believe This</h3>
            <ul className="space-y-1.5">
              {executiveSummary.whyWeBelieveThis.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-maze-black">
                  <span className="text-coral mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* What We Learned */}
          <div className="space-y-6">
            <h2 className="font-display font-bold text-lg text-maze-black">What We Learned</h2>
            {whatWeLearned.map((item, i) => {
              const obj = study.objectives.find((o) => o.id === item.objectiveId);
              return (
                <div key={item.objectiveId} className="bg-white rounded-2xl border border-cream-dark p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-coral/10 text-coral text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <h3 className="font-display font-semibold text-sm text-maze-black">{obj?.title}</h3>
                  </div>
                  <p className="text-sm text-maze-black leading-relaxed">{item.summary}</p>

                  {/* Inline chart if available */}
                  {i === 0 && driversChart && <BarChart title={driversChart.title} items={driversChart.items} />}
                  {i === 1 && positioningChart && <DonutChart title={positioningChart.title} items={positioningChart.items} />}
                  {i === 2 && discoveryChart && <BarChart title={discoveryChart.title} items={discoveryChart.items} />}
                </div>
              );
            })}
          </div>

          {/* What It Means */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-maze-black">What It Means</h2>
            <div className="bg-white rounded-2xl border border-cream-dark p-5 space-y-3">
              {whatItMeans.map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-coral mt-2 flex-shrink-0" />
                  <p className="text-sm text-maze-black leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence — Featured Quotes */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-maze-black">Evidence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredQuotes.map((quote) => {
                if (!quote) return null;
                const resp = respondents.find((r) => r.id === quote.respondentId);
                const theme = themes.find((t) => t.id === quote.themeId);
                return (
                  <div key={quote.id} className="bg-white rounded-2xl border border-cream-dark p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center text-sm font-bold text-coral">
                        {resp?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-maze-black">{resp?.name}</p>
                        <p className="text-[10px] text-maze-gray">{resp?.age}, {resp?.city}</p>
                      </div>
                    </div>
                    <p className="text-sm text-maze-black leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
                    <div className="flex gap-1.5">
                      <span className="source-chip">{theme?.title.slice(0, 30)}...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="bg-coral/5 border border-coral/20 rounded-2xl p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-coral">What To Do Next</h2>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const linkedThemes = themes.filter((t) => rec.themeIds.includes(t.id));
                return (
                  <div key={rec.id} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-coral text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-maze-black">{rec.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="source-chip">{rec.evidenceCount} supporting quotes</span>
                        {linkedThemes.slice(0, 2).map((t) => (
                          <span key={t.id} className="source-chip">{t.title.slice(0, 25)}...</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price chart */}
          {priceChart && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <BarChart title={priceChart.title} items={priceChart.items} />
            </div>
          )}
        </div>
      </div>

      <StatsSidebar
        title="Decision-ready insights"
        description="Take this to your stakeholders today."
        stats={[
          { value: "Engaging", label: "Hear it from real people, backed with data" },
          { value: "Shareable", label: "One click to share with your team" },
        ]}
      />
    </div>
  );
}
