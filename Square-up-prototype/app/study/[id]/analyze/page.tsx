"use client";

import { useStudy } from "@/lib/study-context";
import { useState } from "react";
import { Quote } from "@/lib/types";

function SentimentDonut({ sentiment }: { sentiment: { positive: number; neutral: number; negative: number } }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const posAngle = (sentiment.positive / total) * 360;
  const neuAngle = (sentiment.neutral / total) * 360;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eae5dd" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
            strokeDasharray={`${(posAngle / 360) * 100} ${100 - (posAngle / 360) * 100}`}
            strokeDashoffset="0"
          />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="#eab308" strokeWidth="3"
            strokeDasharray={`${(neuAngle / 360) * 100} ${100 - (neuAngle / 360) * 100}`}
            strokeDashoffset={`${-((posAngle / 360) * 100)}`}
          />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3"
            strokeDasharray={`${((360 - posAngle - neuAngle) / 360) * 100} ${100 - ((360 - posAngle - neuAngle) / 360) * 100}`}
            strokeDashoffset={`${-(((posAngle + neuAngle) / 360) * 100)}`}
          />
        </svg>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-maze-gray">Positive {sentiment.positive}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-maze-gray">Neutral {sentiment.neutral}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-maze-gray">Negative {sentiment.negative}%</span>
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ quote, respondents }: { quote: Quote; respondents: { id: string; name: string; city: string; age: number }[] }) {
  const resp = respondents.find((r) => r.id === quote.respondentId);
  return (
    <div className="bg-cream/60 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-coral/10 flex items-center justify-center text-xs font-bold text-coral">
          {resp?.name.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-medium text-maze-black">{resp?.name}</p>
          <p className="text-[10px] text-maze-gray">{resp?.age}, {resp?.city}</p>
        </div>
      </div>
      <p className="text-sm text-maze-black leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
      <div className="flex gap-1.5">
        <span className="source-chip">Obj {quote.themeId.includes("obj-1") ? "1" : quote.themeId.includes("obj-2") ? "2" : "3"}</span>
        <span className="source-chip">{quote.dimensionId.replace("dim-", "").replace("-", " ")}</span>
      </div>
    </div>
  );
}

function AskYourDataPanel({ responses }: { responses: { id: string; prompt: string; response: string; evidenceTag: string }[] }) {
  const [activeResponse, setActiveResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  const handleChipClick = (id: string) => {
    const resp = responses.find((r) => r.id === id);
    if (!resp) return;
    setActiveResponse(id);
    setIsTyping(true);
    setDisplayedText("");

    let i = 0;
    const interval = setInterval(() => {
      if (i < resp.response.length) {
        setDisplayedText(resp.response.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
  };

  const activeResp = responses.find((r) => r.id === activeResponse);

  return (
    <div className="space-y-3">
      <h4 className="font-display font-semibold text-sm text-maze-black">Ask Your Data</h4>
      <div className="flex flex-wrap gap-2">
        {responses.map((r) => (
          <button
            key={r.id}
            onClick={() => handleChipClick(r.id)}
            className={`text-xs px-3 py-1.5 rounded-pill border transition-all ${
              activeResponse === r.id
                ? "border-coral bg-coral/10 text-coral"
                : "border-maze-black/15 text-maze-gray hover:border-maze-black hover:text-maze-black"
            }`}
          >
            {r.prompt}
          </button>
        ))}
      </div>

      {activeResponse && (
        <div className="bg-cream rounded-xl p-4 space-y-2 animate-fade-in">
          {isTyping && displayedText.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-maze-gray">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot" style={{ animationDelay: "200ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot" style={{ animationDelay: "400ms" }} />
              </div>
              Analyzing your data...
            </div>
          )}
          {displayedText && (
            <p className="text-sm text-maze-black leading-relaxed">{displayedText}</p>
          )}
          {!isTyping && activeResp && (
            <p className="text-[10px] text-maze-gray mt-2">{activeResp.evidenceTag}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  const { activeStudy } = useStudy();
  const [activeObjectiveId, setActiveObjectiveId] = useState("obj-1");
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);

  if (!activeStudy) return null;

  const { study, themes, respondents, askYourDataResponses, recommendations } = activeStudy;

  const activeThemes = themes.filter((t) => t.objectiveId === activeObjectiveId);
  const activeObjective = study.objectives.find((o) => o.id === activeObjectiveId);

  // Set default expanded theme on first render
  if (expandedThemeId === null && activeThemes.length > 0) {
    setTimeout(() => setExpandedThemeId(activeThemes[0].id), 0);
  }

  const expandedTheme = themes.find((t) => t.id === expandedThemeId);

  // Find linked recommendation for active theme
  const linkedRec = expandedThemeId
    ? recommendations.find((r) => r.themeIds.includes(expandedThemeId))
    : null;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex">
        {/* Left Rail — Objectives + Themes */}
        <div className="w-56 border-r border-cream-dark bg-white p-4 space-y-4 overflow-y-auto">
          <p className="text-xs text-maze-gray font-medium uppercase tracking-wider">Objectives</p>
          {study.objectives.map((obj, i) => {
            const objThemes = themes.filter((t) => t.objectiveId === obj.id);
            const isActive = obj.id === activeObjectiveId;
            return (
              <div key={obj.id}>
                <button
                  onClick={() => {
                    setActiveObjectiveId(obj.id);
                    const firstTheme = themes.find((t) => t.objectiveId === obj.id);
                    setExpandedThemeId(firstTheme?.id || null);
                  }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive ? "bg-coral/10 text-coral font-medium" : "text-maze-gray hover:bg-cream"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-coral/10 text-coral text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="line-clamp-2">{obj.title}</span>
                </button>
                {isActive && (
                  <div className="ml-7 mt-1 space-y-1">
                    {objThemes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setExpandedThemeId(theme.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors ${
                          expandedThemeId === theme.id
                            ? "text-coral font-medium"
                            : "text-maze-gray hover:text-maze-black"
                        }`}
                      >
                        {theme.title.slice(0, 50)}...
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Center — Theme Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Decision Lineage Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-maze-gray">
            <span className="text-coral font-medium">Decision</span>
            <span>→</span>
            <span>{activeObjective?.title}</span>
            {expandedTheme && (
              <>
                <span>→</span>
                <span className="text-maze-black font-medium">{expandedTheme.title.slice(0, 40)}...</span>
                <span>→</span>
                <span>{expandedTheme.quotes.length} quotes</span>
              </>
            )}
          </div>

          <h2 className="font-display font-semibold text-xl text-maze-black">
            {activeObjective?.title}
          </h2>

          {/* Theme Cards */}
          <div className="space-y-4">
            {activeThemes.map((theme) => (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border transition-all ${
                  expandedThemeId === theme.id ? "border-coral/30 shadow-sm" : "border-cream-dark hover:border-coral/20"
                }`}
              >
                <button
                  onClick={() => setExpandedThemeId(expandedThemeId === theme.id ? null : theme.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-sm text-maze-black">{theme.title}</h3>
                      <p className="text-xs text-maze-gray mt-1 line-clamp-2">{theme.summary}</p>
                    </div>
                    <span className="source-chip ml-3">{theme.quotes.length} quotes</span>
                  </div>
                </button>

                {expandedThemeId === theme.id && (
                  <div className="px-5 pb-5 space-y-5 border-t border-cream-dark pt-4 animate-fade-in">
                    <p className="text-sm text-maze-black leading-relaxed">{theme.summary}</p>

                    <div className="flex items-start gap-8">
                      <SentimentDonut sentiment={theme.sentiment} />

                      {linkedRec && (
                        <div className="flex-1 bg-coral/5 rounded-xl p-4 border border-coral/15">
                          <p className="text-[10px] text-coral font-medium uppercase tracking-wider mb-1">Linked Recommendation</p>
                          <p className="text-sm text-maze-black">{linkedRec.text}</p>
                          <p className="text-[10px] text-maze-gray mt-1">Based on {linkedRec.evidenceCount} quotes</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-maze-gray font-medium uppercase tracking-wider mb-3">Key Quotes</p>
                      <div className="grid grid-cols-1 gap-3">
                        {theme.quotes.map((quote) => (
                          <QuoteCard key={quote.id} quote={quote} respondents={respondents} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel — Stats + Ask Your Data */}
        <div className="w-72 border-l border-cream-dark bg-white p-5 space-y-6 overflow-y-auto">
          <div>
            <p className="text-xs text-maze-gray font-medium uppercase tracking-wider mb-3">Study Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl p-3 text-center">
                <p className="font-display font-bold text-lg text-coral">{study.progress.completed}</p>
                <p className="text-[10px] text-maze-gray">Interviews</p>
              </div>
              <div className="bg-cream rounded-xl p-3 text-center">
                <p className="font-display font-bold text-lg text-maze-black">13 min</p>
                <p className="text-[10px] text-maze-gray">Avg duration</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-maze-gray font-medium uppercase tracking-wider mb-2">AI Summary</p>
            <p className="text-xs text-maze-black leading-relaxed">
              {activeObjective?.description}
            </p>
          </div>

          <AskYourDataPanel responses={askYourDataResponses} />
        </div>
      </div>
    </div>
  );
}
