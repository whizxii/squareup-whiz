"use client";

import { useStudy } from "@/lib/study-context";
import StatsSidebar from "@/components/layout/StatsSidebar";
import { useState } from "react";

type RecruitSource = "managed" | "customers" | "link";

const SOURCES: { id: RecruitSource; title: string; description: string; icon: string }[] = [
  { id: "managed", title: "Managed Panel", description: "We source and screen respondents from our research panel", icon: "🎯" },
  { id: "customers", title: "Your Customers", description: "Upload a list of your own customers to invite", icon: "📋" },
  { id: "link", title: "Shareable Link", description: "Generate a link to share on any channel", icon: "🔗" },
];

export default function RecruitPage() {
  const { activeStudy } = useStudy();
  const [selectedSource, setSelectedSource] = useState<RecruitSource>("managed");
  const [sampleSize, setSampleSize] = useState(30);
  const [incentive, setIncentive] = useState(200);

  if (!activeStudy) return null;

  const { study, screenerQuestions } = activeStudy;

  const totalCost = sampleSize * incentive;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display font-bold text-2xl text-maze-black">Recruit Respondents</h1>
            <p className="text-sm text-maze-gray mt-1">Define your audience and launch recruitment</p>
          </div>

          {/* Audience Summary */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm text-maze-black">Target Audience</h2>
              <span className="source-chip">Derived from study design</span>
            </div>
            <div className="bg-cream rounded-xl p-4">
              <p className="text-sm text-maze-black font-medium">{study.targetAudience}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {study.keyDimensions.map((dim) => (
                  <span key={dim.id} className="px-3 py-1 rounded-full border border-maze-black/15 text-xs text-maze-black">
                    {dim.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recruitment Source */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-sm text-maze-black">Recruitment Source</h2>
            <div className="grid grid-cols-3 gap-4">
              {SOURCES.map((src) => (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedSource === src.id
                      ? "border-coral bg-coral/5"
                      : "border-cream-dark bg-white hover:border-coral/30"
                  }`}
                >
                  <span className="text-2xl">{src.icon}</span>
                  <h3 className="font-display font-semibold text-sm text-maze-black mt-2">{src.title}</h3>
                  <p className="text-xs text-maze-gray mt-1 leading-relaxed">{src.description}</p>
                  {selectedSource === src.id && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-coral flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-xs text-coral font-medium">Selected</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Screener Questions */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm text-maze-black">Screener Questions</h2>
              <span className="text-xs text-maze-gray">{screenerQuestions.length} questions</span>
            </div>
            <div className="space-y-3">
              {screenerQuestions.map((sq, i) => (
                <div key={i} className="bg-cream/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-coral/10 text-coral text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-maze-black">{sq.question}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sq.options.map((opt) => (
                          <span key={opt} className="px-2.5 py-1 rounded-full bg-white border border-cream-dark text-xs text-maze-gray">
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feasibility Signal */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="font-display font-semibold text-sm text-green-800">Feasibility: High</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-green-600">Expected fill time</p>
                <p className="text-sm font-semibold text-green-800">5-7 days</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Audience difficulty</p>
                <p className="text-sm font-semibold text-green-800">Moderate</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Panel match rate</p>
                <p className="text-sm font-semibold text-green-800">~82%</p>
              </div>
            </div>
          </div>

          {/* Sample & Cost */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5 space-y-5">
            <h2 className="font-display font-semibold text-sm text-maze-black">Sample & Cost</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Sample size */}
              <div>
                <label className="text-xs text-maze-gray block mb-2">Sample size</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    className="flex-1 accent-coral"
                  />
                  <span className="font-display font-bold text-lg text-maze-black w-12 text-right">{sampleSize}</span>
                </div>
              </div>

              {/* Incentive */}
              <div>
                <label className="text-xs text-maze-gray block mb-2">Incentive per respondent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="100"
                    max="500"
                    step="50"
                    value={incentive}
                    onChange={(e) => setIncentive(Number(e.target.value))}
                    className="flex-1 accent-coral"
                  />
                  <span className="font-display font-bold text-lg text-maze-black w-16 text-right">₹{incentive}</span>
                </div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="bg-cream rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-maze-gray">Total estimated cost</p>
                  <p className="font-display font-bold text-2xl text-maze-black">₹{totalCost.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-maze-gray">{sampleSize} respondents × ₹{incentive}</p>
                  <p className="text-xs text-maze-gray mt-0.5">Platform fee included</p>
                </div>
              </div>
            </div>

            {/* Launch button */}
            <button className="w-full py-3 bg-coral text-white rounded-full font-medium text-sm hover:bg-coral-bright transition-colors">
              Launch Recruitment
            </button>
          </div>
        </div>
      </div>

      <StatsSidebar
        title="Reach the right people"
        description="Source qualified respondents in days, not weeks."
        stats={[
          { value: "10 to 1000+", label: "Flexible sample sizes" },
          { value: "5-7 days", label: "Average recruitment time" },
          { value: "82%", label: "Panel match rate" },
        ]}
      />
    </div>
  );
}
