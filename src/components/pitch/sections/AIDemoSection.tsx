import { useEffect, useRef, useState } from "react";
import type { SlideMode } from "@/lib/slides";

const MESSAGES = [
  { role: "ai",   text: "Walk me through the last time your team had to make a big go/no-go call." },
  { role: "user", text: "Q3 launch. 4 months of build. We committed early." },
  { role: "ai",   text: "What did you wish you'd known before you committed?" },
  { role: "user", text: "That our target segment doesn't shop the way we assumed. Found out after launch." },
  { role: "ai",   text: "When you made that call — what data did you actually have?" },
  { role: "user", text: "Internal metrics. Some gut feel. That's honestly it." },
  { role: "ai",   text: "What would different data have changed?" },
];

const INSIGHTS = [
  { after: 1, type: "sentiment", label: "Sentiment",  value: "Cautious — 71%",               color: "hsl(48,96%,42%)" },
  { after: 3, type: "quote",     label: "Key Quote",  value: '"Segment doesn\'t shop the way we assumed"', sub: "Severity: High · 8.3/10", color: "hsl(var(--sq-orange))" },
  { after: 5, type: "risk",      label: "Risk Flag",  value: "Assumption: Purchase behaviour", sub: "Status: Unvalidated ⚠",             color: "hsl(0,72%,51%)" },
];

function useTypewriter(text: string, speed = 36, active = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(""); setDone(false); return; }
    setDisplayed(""); setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= text.length) { clearInterval(timer); setDone(true); return; }
      setDisplayed(text.slice(0, ++i));
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, active]);
  return { displayed, done };
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
    <div className={`flex gap-2.5 ${isAI ? "" : "flex-row-reverse"}`}>
      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
        style={{ background: isAI ? "hsl(var(--sq-orange))" : "hsl(var(--sq-subtle))", color: isAI ? "white" : "hsl(var(--sq-muted))" }}>
        {isAI ? "AI" : "U"}
      </div>
      <div className="max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed"
        style={{
          background: isAI ? "hsl(var(--sq-off-white))" : "hsl(var(--sq-subtle))",
          color: isAI ? "hsl(var(--sq-text))" : "hsl(var(--sq-muted))"
        }}>
        {isPast ? msg.text : displayed}
        {isActive && !done && (
          <span className="inline-block w-0.5 h-3 ml-0.5 align-middle animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
        )}
      </div>
    </div>
  );
}

export default function AIDemoSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const [activeMsg, setActiveMsg] = useState(-1);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => { if (started) setActiveMsg(0); }, [started]);

  const handleMsgDone = (i: number) => {
    if (i < MESSAGES.length - 1) setTimeout(() => setActiveMsg(i + 1), 750);
  };

  const visibleInsights = INSIGHTS.filter((ins) => activeMsg >= ins.after);
  const allDone = activeMsg >= MESSAGES.length - 1;

  return (
    <section
      id="aidemo"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={sectionRef}>

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            AI in Action
          </p>
          <h2 className={`font-black tracking-tight leading-[1.0] ${isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem]"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            The AI that interviews like your{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>best researcher.</span>
          </h2>
          <p className="mt-3 text-sm max-w-sm mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
            Probes naturally. Extracts signal in real time.
          </p>
        </div>

        {/* Light-mode interview card */}
        <div className="rounded-3xl overflow-hidden border mx-auto"
          style={{
            background: "hsl(var(--sq-card))",
            borderColor: "hsl(var(--sq-subtle))",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)"
          }}>

          {/* macOS toolbar */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b"
            style={{ borderColor: "hsl(var(--sq-subtle))", background: "hsl(var(--sq-off-white))" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FC5753" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FDBC2C" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#33C748" }} />
            <div className="flex-1 flex justify-center">
              <span className="text-xs font-mono" style={{ color: "hsl(var(--sq-muted))" }}>squareup — live interview engine</span>
            </div>
          </div>

          <div className={`grid ${isPresenter ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>
            {/* LEFT — Chat */}
            <div className="p-6 space-y-3 min-h-[340px]" style={{ borderRight: "1px solid hsl(var(--sq-subtle))" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>Live Interview</span>
              </div>
              {MESSAGES.map((msg, i) => (
                i <= activeMsg ? (
                  <ChatMessage key={i} msg={msg} index={i} activeMsg={activeMsg} onDone={() => handleMsgDone(i)} />
                ) : null
              ))}
            </div>

            {/* RIGHT — Insights */}
            <div className="p-6 space-y-3 min-h-[340px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#33C748" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>Live Extraction</span>
              </div>

              {visibleInsights.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs" style={{ color: "hsl(var(--sq-muted) / 0.5)" }}>
                  Insights surface as conversation unfolds...
                </div>
              )}

              {visibleInsights.map((ins) => (
                <div key={ins.type} className="rounded-xl p-3 animate-fade-up"
                  style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <div className="text-xs uppercase tracking-widest mb-1 font-bold" style={{ color: "hsl(var(--sq-muted))" }}>{ins.label}</div>
                  <div className="font-bold text-sm" style={{ color: ins.color }}>{ins.value}</div>
                  {ins.sub && <div className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{ins.sub}</div>}
                </div>
              ))}

              {allDone && (
                <div className="rounded-xl p-4 animate-fade-up"
                  style={{ background: "hsl(var(--sq-orange) / 0.07)", border: "1px solid hsl(var(--sq-orange) / 0.25)" }}>
                  <p className="font-bold text-sm mb-3" style={{ color: "hsl(var(--sq-orange))" }}>
                    3 critical risks identified. Brief ready.
                  </p>
                  <a href="https://almost.joinsquareup.com" target="_blank" rel="noopener noreferrer"
                    className="inline-block text-white font-bold text-xs px-4 py-2 rounded-full"
                    style={{ background: "hsl(var(--sq-orange))" }}>
                    See Full Demo →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom link */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <a href="https://almost.joinsquareup.com" target="_blank" rel="noopener noreferrer"
            className="font-bold text-sm px-5 py-2 rounded-full border transition-all hover:opacity-70"
            style={{ borderColor: "hsl(var(--sq-orange) / 0.3)", color: "hsl(var(--sq-orange))" }}>
            Try it yourself → almost.joinsquareup.com
          </a>
        </div>
      </div>
    </section>
  );
}
