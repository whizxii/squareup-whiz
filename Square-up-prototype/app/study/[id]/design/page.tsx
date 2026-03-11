"use client";

import { useStudy } from "@/lib/study-context";
import StatsSidebar from "@/components/layout/StatsSidebar";
import StudyConfigPanel from "@/components/design/StudyConfigPanel";

export default function DesignPage() {
  const { activeStudy } = useStudy();
  if (!activeStudy) return null;

  const { study } = activeStudy;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col border-r border-cream-dark">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* AI welcome message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-coral flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="bg-cream rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
                  <p className="text-sm text-maze-black leading-relaxed">
                    Welcome! I&apos;m here to help you design your research study. Let&apos;s start with the most important question:
                  </p>
                  <p className="text-sm text-maze-black leading-relaxed mt-2 font-medium">
                    What decision are you trying to make?
                  </p>
                </div>
              </div>

              {/* Golden demo: pre-existing conversation */}
              <div className="flex gap-3 justify-end">
                <div className="bg-coral/10 rounded-2xl rounded-tr-md px-4 py-3 max-w-lg">
                  <p className="text-sm text-maze-black leading-relaxed">
                    We&apos;re launching a new fragrance under Titan Skinn and need to decide whether to position it as &apos;everyday confidence&apos; or &apos;occasion wear&apos;. Target is men 21-35 in metro India.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-maze-black flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">You</span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-coral flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="bg-cream rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
                  <p className="text-sm text-maze-black leading-relaxed">
                    Great — that&apos;s a clear positioning decision. I&apos;ve built your study around three research objectives:
                  </p>
                  <ol className="text-sm text-maze-black leading-relaxed mt-2 space-y-1 list-decimal list-inside">
                    <li>Understanding current fragrance habits and brand associations</li>
                    <li>Testing reactions to both positioning concepts</li>
                    <li>Identifying purchase drivers and barriers</li>
                  </ol>
                  <p className="text-sm text-maze-black leading-relaxed mt-2">
                    I&apos;ve generated 12 interview questions with follow-ups across 5 key dimensions. Check the study panel on the right to review everything.
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex flex-col gap-2 ml-11">
                {["Building study model", "Generating interview guide", "Setting key dimensions"].map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs text-maze-gray animate-fade-in">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-6" stroke="#FF5A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {status}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="border-t border-cream-dark p-4">
            <div className="max-w-2xl mx-auto flex gap-3">
              <input
                type="text"
                placeholder="Refine your study design..."
                className="flex-1 px-4 py-3 rounded-xl bg-cream border border-cream-dark text-sm text-maze-black placeholder:text-maze-gray focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
              />
              <button className="px-5 py-3 bg-coral text-white rounded-xl font-medium text-sm hover:bg-coral-bright transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Study Config Panel */}
        <StudyConfigPanel study={study} />
      </div>

      <StatsSidebar
        title="From question to decision"
        description="Define your business question. AI designs the research."
        stats={[
          { value: "5 min", label: "From brief to interview guide" },
          { value: "No expertise", label: "Share your goals, AI does the rest" },
        ]}
      />
    </div>
  );
}
