import { useEffect, useRef, useState } from "react";
import type { SlideMode } from "@/lib/slides";

const MESSAGES = [
  { role: "ai",   text: "Walk me through the last time your team launched something new." },
  { role: "user", text: "We did a big push in Q3. Took 4 months to build." },
  { role: "ai",   text: "What did you wish you'd known before you committed to it?" },
  { role: "user", text: "Honestly? That our target group doesn't shop the way we assumed." },
  { role: "ai",   text: "When you made that call — what data did you actually have?" },
  { role: "user", text: "Internal metrics. Some gut feel. That's about it." },
  { role: "ai",   text: "What would different data have changed for you?" },
];

const INSIGHTS = [
  { after: 1, type: "sentiment", label: "Sentiment", value: "Cautious 71%", color: "text-yellow-400" },
  { after: 3, type: "quote",     label: "Key Quote", value: '"Target group doesn\'t shop the way we assumed"', sub: "Severity: High 8.3/10", color: "text-sq-orange" },
  { after: 5, type: "risk",      label: "Risk Flag", value: "Assumption: Purchase Behaviour", sub: "Status: Unvalidated ⚠", color: "text-red-400" },
];

function useTypewriter(text: string, speed = 40, active = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(""); setDone(false); return; }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= text.length) { clearInterval(timer); setDone(true); return; }
      setDisplayed(text.slice(0, ++i));
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, active]);
  return { displayed, done };
}

export default function AIDemoSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const [activeMsg, setActiveMsg] = useState(-1);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Start demo on scroll into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) { setStarted(true); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  // Chain messages
  useEffect(() => {
    if (!started) return;
    setActiveMsg(0);
  }, [started]);

  const handleMsgDone = (i: number) => {
    if (i < MESSAGES.length - 1) {
      setTimeout(() => setActiveMsg(i + 1), 700);
    }
  };

  const visibleInsights = INSIGHTS.filter((ins) => activeMsg >= ins.after);
  const allDone = activeMsg >= MESSAGES.length - 1;

  return (
    <section
      id="aidemo"
      className={`bg-sq-off-white ${isPresenter ? "h-full flex items-center px-16" : "py-20 px-6"}`}
    >
      <div className="max-w-6xl mx-auto w-full" ref={sectionRef}>
        <div className="text-center mb-10">
          <h2 className={`font-black text-sq-text tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}>
            The AI that interviews like your{" "}
            <span className="text-sq-orange">best researcher.</span>
          </h2>
          <p className="text-sq-muted mt-3">Watch SquareUp extract decision-grade insight — in real time.</p>
        </div>

        <div className="bg-sq-dark rounded-3xl overflow-hidden shadow-2xl shadow-sq-dark/50 border border-white/5">
          <div className={`grid ${isPresenter ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>
            {/* LEFT — Chat */}
            <div className="p-6 space-y-4 border-r border-white/10 min-h-[380px]">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-sq-orange animate-pulse" />
                <span className="text-white/50 text-xs font-mono uppercase tracking-widest">Live Interview</span>
              </div>
              {MESSAGES.map((msg, i) => (
                i <= activeMsg ? (
                  <ChatMessage key={i} msg={msg} index={i} activeMsg={activeMsg} onDone={() => handleMsgDone(i)} />
                ) : null
              ))}
            </div>

            {/* RIGHT — Insights */}
            <div className="p-6 space-y-4 min-h-[380px]">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/50 text-xs font-mono uppercase tracking-widest">Live Extraction</span>
              </div>

              {visibleInsights.length === 0 && (
                <div className="flex items-center justify-center h-32 text-white/20 text-sm">
                  Insights will appear as the conversation unfolds...
                </div>
              )}

              {visibleInsights.map((ins) => (
                <div key={ins.type} className="bg-white/5 rounded-xl p-4 border border-white/10 animate-fade-up">
                  <div className="text-xs text-white/40 uppercase tracking-widest mb-1">{ins.label}</div>
                  <div className={`font-bold text-sm ${ins.color}`}>{ins.value}</div>
                  {ins.sub && <div className="text-white/50 text-xs mt-1">{ins.sub}</div>}
                </div>
              ))}

              {allDone && (
                <div className="bg-sq-orange/10 border border-sq-orange/30 rounded-xl p-4 animate-fade-up">
                  <p className="text-sq-orange font-bold text-sm">3 critical risks identified. Insight Brief ready.</p>
                  <a
                    href="https://almost.joinsquareup.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block bg-sq-orange text-white font-bold text-xs px-4 py-2 rounded-full hover:bg-sq-amber transition-colors"
                  >
                    See the Full Demo →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatMessage({ msg, index, activeMsg, onDone }: {
  msg: typeof MESSAGES[0]; index: number; activeMsg: number; onDone: () => void;
}) {
  const isActive = index === activeMsg;
  const isPast = index < activeMsg;
  const { displayed, done } = useTypewriter(msg.text, 38, isActive || isPast);

  useEffect(() => { if (done && isActive) onDone(); }, [done, isActive]);

  const isAI = msg.role === "ai";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${isAI ? "bg-sq-orange text-white" : "bg-white/10 text-white/60"}`}>
        {isAI ? "AI" : "U"}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isAI ? "bg-white/8 text-white/90" : "bg-white/5 text-white/70"}`}
        style={{ background: isAI ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)" }}>
        {isPast ? msg.text : displayed}
        {isActive && !done && <span className="inline-block w-0.5 h-3.5 bg-sq-orange ml-0.5 align-middle animate-pulse" />}
      </div>
    </div>
  );
}
