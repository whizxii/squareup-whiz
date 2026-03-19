"use client";

import Link from "next/link";
import { goldenDemo } from "@/lib/golden-demo";

const study = goldenDemo.study;

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-dark bg-white px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-coral rounded-lg flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">SU</span>
          </div>
          <h1 className="font-display font-semibold text-xl text-maze-black">Square Up</h1>
        </div>
        <p className="text-sm text-maze-gray">From question to decision</p>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display font-bold text-3xl text-maze-black">Your Studies</h2>
            <p className="text-maze-gray mt-1">Research projects powered by AI</p>
          </div>
          <Link
            href={`/study/new/design`}
            className="flex items-center gap-2 px-6 py-3 bg-coral text-white rounded-full font-medium text-sm hover:bg-coral-bright transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Study
          </Link>
        </div>

        {/* Golden Demo Study Card */}
        <Link
          href={`/study/${study.id}/design`}
          className="block group"
        >
          <div className="bg-white rounded-2xl p-6 border border-cream-dark hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-coral/10 text-coral">
                    {study.status === "analyzing" ? "Analyzing" : study.status}
                  </span>
                  <span className="text-xs text-maze-gray">Updated {study.updatedAt}</span>
                </div>

                <h3 className="font-display font-semibold text-xl text-maze-black group-hover:text-coral transition-colors">
                  {study.title}
                </h3>

                <p className="text-sm text-maze-gray mt-2 line-clamp-2">
                  {study.decisionObjective}
                </p>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-cream-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-coral rounded-full transition-all"
                        style={{ width: `${(study.progress.completed / study.progress.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-maze-gray font-medium">
                      {study.progress.completed}/{study.progress.total} interviews
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-6 flex flex-col items-end gap-2">
                <div className="flex -space-x-2">
                  {["A", "R", "V", "N"].map((initial, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-cream-dark border-2 border-white flex items-center justify-center text-xs font-medium text-maze-gray"
                    >
                      {initial}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-coral/10 border-2 border-white flex items-center justify-center text-xs font-medium text-coral">
                    +4
                  </div>
                </div>
                <span className="text-xs text-maze-gray">{study.targetAudience}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cream-dark">
              {study.keyDimensions.slice(0, 4).map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-pill border border-maze-black/15 text-xs text-maze-gray"
                >
                  {d.label}
                </span>
              ))}
              {study.keyDimensions.length > 4 && (
                <span className="text-xs text-maze-gray">+{study.keyDimensions.length - 4} more</span>
              )}
            </div>
          </div>
        </Link>
      </main>
    </div>
  );
}
