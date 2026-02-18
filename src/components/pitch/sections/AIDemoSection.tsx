import { useEffect, useRef, useState } from "react";
import type { SlideMode } from "@/lib/slides";

const MESSAGES = [
  { role: "ai",   text: "Walk me through the last time your team had to make a big go/no-go call." },
  { role: "user", text: "Q3 launch. 4 months of build. We committed early." },
  { role: "ai",   text: "What did you wish you'd known before you committed?" },
  { role: "user", text: "That our target segment doesn't shop the way we assumed. We found out after launch." },
  { role: "ai",   text: "When you made that call — what data did you actually have?" },
  { role: "user", text: "Internal metrics. Some gut feel. That's honestly it." },
  { role: "ai",   text: "What would different data have changed?" },
];

const INSIGHTS = [
  { after: 1, type: "sentiment", label: "Sentiment", value: "Cautious — 71%", color: "hsl(48,96%,53%)" },
  { after: 3, type: "quote",     label: "Key Quote", value: '"Segment doesn\'t shop the way we assumed"', sub: "Severity: High · 8.3/10", color: "hsl(18,100%,60%)" },
  { after: 5, type: "risk",      label: "Risk Flag", value: "Assumption: Purchase behaviour", sub: "Status: Unvalidated ⚠", color: "hsl(0,84%,60%)" },
];

function useTypewriter(text: string, speed = 36, active = false) {
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

  useEffect(() => {
    if (!started) return;
    setActiveMsg(0);
  }, [started]);

  const handleMsgDone = (i: number) => {
    if (i < MESSAGES.length - 1) {
      setTimeout(() => setActiveMsg(i + 1), 750);
    }
  };

  const visibleInsights = INSIGHTS.filter((ins) => activeMsg >= ins.after);
  const allDone = activeMsg >= MESSAGES.length - 1;

  return (
    <section
      id="aidemo"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={sectionRef}>

        {/* Header */}
        <div className="mb-12 text-center">
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Live Demo
          </p>
          <h2 className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            The AI that interviews like your{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>best researcher.</span>
          </h2>
          <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
            Probes naturally. Extracts signal in real time.
          </p>
        </div>

        {/* Dark terminal card — sits on light background */}
        <div className="rounded-3xl overflow-hidden mx-auto" style={{
          background: "hsl(var(--sq-dark))",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.04)"
        }}>

          {/* Terminal toolbar */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
            <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-70" />
            <div className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
            <div className="flex-1 flex justify-center">
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>squareup — live interview engine</span>
            </div>
          </div>

          <div className={`grid ${isPresenter ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>
            {/* LEFT — Chat */}
            <div className="p-6 space-y-4 min-h-[380px]" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Live Interview</span>
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
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Live Extraction</span>
              </div>

              {visibleInsights.length === 0 && (
                <div className="flex items-center justify-center h-32 text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
                  Insights surface as the conversation unfolds...
                </div>
              )}

              {visibleInsights.map((ins) => (
                <div key={ins.type} className="rounded-2xl p-4 animate-fade-up" style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}>
                  <div className="text-xs uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{ins.label}</div>
                  <div className="font-bold text-sm" style={{ color: ins.color }}>{ins.value}</div>
                  {ins.sub && <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{ins.sub}</div>}
                </div>
              ))}

              {allDone && (
                <div className="rounded-2xl p-4 animate-fade-up" style={{
                  background: "hsl(var(--sq-orange) / 0.12)",
                  border: "1px solid hsl(var(--sq-orange) / 0.35)"
                }}>
                  <p className="font-bold text-sm mb-3" style={{ color: "hsl(var(--sq-orange))" }}>
                    3 critical risks identified. Brief ready.
                  </p>
                  <a
                    href="https://almost.joinsquareup.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-white font-bold text-xs px-4 py-2 rounded-full transition-opacity hover:opacity-90"
                    style={{ background: "hsl(var(--sq-orange))" }}
                  >
                    See Full Demo →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <p className="text-sm font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
            Try it yourself →
          </p>
          <a
            href="https://almost.joinsquareup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-sm px-5 py-2.5 rounded-full border transition-all hover:opacity-80"
            style={{
              borderColor: "hsl(var(--sq-orange) / 0.35)",
              color: "hsl(var(--sq-orange))"
            }}
          >
            almost.joinsquareup.com
          </a>
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
  const { displayed, done } = useTypewriter(msg.text, 36, isActive || isPast);

  useEffect(() => { if (done && isActive) onDone(); }, [done, isActive]);

  const isAI = msg.role === "ai";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
        style={{
          background: isAI ? "hsl(var(--sq-orange))" : "rgba(255,255,255,0.1)",
          color: isAI ? "white" : "rgba(255,255,255,0.6)"
        }}>
        {isAI ? "AI" : "U"}
      </div>
      <div
        className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
        style={{ background: isAI ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)", color: isAI ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)" }}
      >
        {isPast ? msg.text : displayed}
        {isActive && !done && <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />}
      </div>
    </div>
  );
}
