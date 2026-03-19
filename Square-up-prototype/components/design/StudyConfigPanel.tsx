"use client";

import { StudyModel } from "@/lib/types";
import { useState } from "react";

export default function StudyConfigPanel({ study }: { study: StudyModel }) {
  const [expandedObj, setExpandedObj] = useState<string>("obj-1");

  return (
    <div className="w-[420px] overflow-y-auto bg-white p-6 space-y-6">
      {/* Decision Objective Block */}
      <div className="bg-coral/5 border border-coral/20 rounded-2xl p-5 space-y-3">
        <h4 className="font-display font-semibold text-sm text-coral uppercase tracking-wider">
          Decision Objective
        </h4>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-maze-gray">What decision are you trying to make?</p>
            <p className="text-sm font-medium text-maze-black mt-0.5">{study.decisionObjective}</p>
          </div>
          <div>
            <p className="text-xs text-maze-gray">Who is this for?</p>
            <p className="text-sm font-medium text-maze-black mt-0.5">{study.stakeholder}, {study.brandName}</p>
          </div>
          <div>
            <p className="text-xs text-maze-gray">What will change?</p>
            <p className="text-sm font-medium text-maze-black mt-0.5">{study.whatChanges}</p>
          </div>
        </div>
      </div>

      {/* Study Title */}
      <div>
        <p className="text-xs text-maze-gray font-medium uppercase tracking-wider mb-1">Study Title</p>
        <h3 className="font-display font-semibold text-lg text-maze-black">{study.title}</h3>
      </div>

      {/* Key Dimensions */}
      <div>
        <p className="text-xs text-maze-gray font-medium uppercase tracking-wider mb-2">Key Dimensions</p>
        <div className="flex flex-wrap gap-2">
          {study.keyDimensions.map((dim) => (
            <span
              key={dim.id}
              className="inline-flex items-center px-3 py-1.5 rounded-pill border border-maze-black/20 text-xs font-medium text-maze-black hover:bg-maze-black hover:text-white transition-colors cursor-default"
            >
              {dim.label}
            </span>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div>
        <p className="text-xs text-maze-gray font-medium uppercase tracking-wider mb-3">Research Objectives</p>
        <div className="space-y-2">
          {study.objectives.map((obj, i) => (
            <div key={obj.id} className="border border-cream-dark rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedObj(expandedObj === obj.id ? "" : obj.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-coral/10 text-coral text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-maze-black text-left">{obj.title}</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform ${expandedObj === obj.id ? "rotate-180" : ""}`}
                >
                  <path d="M4 6l4 4 4-4" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {expandedObj === obj.id && (
                <div className="px-4 pb-4 space-y-3 animate-fade-in">
                  <p className="text-xs text-maze-gray">{obj.description}</p>
                  <div className="space-y-2">
                    {obj.questions.map((q, qi) => (
                      <div key={q.id} className="flex gap-2">
                        <span className="text-xs text-maze-gray mt-0.5 w-4 flex-shrink-0">{qi + 1}.</span>
                        <p className="text-xs text-maze-black leading-relaxed">{q.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Interview Duration */}
      <div className="bg-cream rounded-xl px-4 py-3">
        <p className="text-xs text-maze-gray">Estimated Interview Duration</p>
        <p className="font-display font-semibold text-lg text-maze-black">12-15 minutes</p>
      </div>
    </div>
  );
}
