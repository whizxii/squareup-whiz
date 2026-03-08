import { useEffect, useRef, useState } from "react";
import type { SlideMode } from "@/lib/slides";
import avatarAiAgent from "@/assets/avatar-ai-agent.png";
import demoRecording from "@/assets/demo-recording.mp3";

const MESSAGES = [
  { role: "ai", text: "When you looked at the new personal care range, what stopped you from purchasing?" },
  { role: "user", text: "I liked the fragrance, but the pack size is huge for a first try." },
  { role: "ai", text: "If a smaller, entry-level size was available, how would that change your decision?" },
  { role: "user", text: "I would have definitely bought a 50ml bottle just to test it out." },
  { role: "ai", text: "Did the pricing on the large bottle feel off, or was it purely the volume?" },
  { role: "user", text: "It's the commitment. ₹1200 is too much for an unproven scent. ₹399 for a mini would fly." },
];

type InsightType = {
  after: number;
  type: string;
  label: string;
  value: string;
  color: string;
  sub?: string;
};

const INSIGHTS: InsightType[] = [
  { after: 1, type: "theme", label: "Theme", value: "Price-Pack Mismatch", color: "hsl(var(--sq-orange))", sub: "Frequency: 74% of respondents" },
  { after: 3, type: "severity", label: "Severity", value: "9.2 / 10 — Direct Purchase Block", color: "hsl(0,72%,51%)", sub: "Segment: First-time buyers, Urban, 22-28" },
  { after: 5, type: "recommend", label: "Action", value: "Test ₹399 / 50ml entry SKU", color: "hsl(48,96%,42%)", sub: "Route to: Product, Growth" },
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
      {isAI ? (
        <img src={avatarAiAgent} alt="SQ" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
          style={{ background: "hsl(var(--sq-subtle))", color: "hsl(var(--sq-muted))" }}>
          U
        </div>
      )}
      <div className="max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed font-medium"
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
    if (mode === "presenter") { setStarted(true); return; }
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [started, mode]);

  useEffect(() => {
    if (started) setActiveMsg(mode === "presenter" ? MESSAGES.length : 0);
  }, [started, mode]);

  const handleMsgDone = (i: number) => {
    if (i < MESSAGES.length - 1) setTimeout(() => setActiveMsg(i + 1), 750);
  };

  const visibleInsights = INSIGHTS.filter((ins) => activeMsg >= ins.after);
  const allDone = activeMsg >= MESSAGES.length - 1;

  return (
    <section
      id="aidemo"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={sectionRef}>

        {/* Header */}
        <div className={`${isPresenter ? "mb-6" : "mb-12"} text-center`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Magic Demo
          </p>
          <h2 className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-4xl" : "text-4xl sm:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            Not a transcript. <br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>A live customer truth engine.</span>
          </h2>
          {!isPresenter && (
            <p className="mt-4 text-sm font-medium max-w-sm mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
              As the AI probes, actionable intelligence is synthesized and assigned immediately.
            </p>
          )}
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
            <div className={`${isPresenter ? "p-4 space-y-2" : "p-6 space-y-3 min-h-[340px]"}`} style={{ borderRight: "1px solid hsl(var(--sq-subtle))" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>Live Call Interview</span>
              </div>
              {MESSAGES.map((msg, i) => (
                i <= activeMsg ? (
                  <ChatMessage key={i} msg={msg} index={i} activeMsg={activeMsg} onDone={() => handleMsgDone(i)} />
                ) : null
              ))}
            </div>

            {/* RIGHT — Insights */}
            <div className={`${isPresenter ? "p-4 space-y-2" : "p-6 space-y-3 min-h-[340px]"}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full sq-live-pulse" style={{ background: "#33C748" }} />
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
                <div className="rounded-xl p-4 animate-fade-up sq-glow-pulse"
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

        {/* Audio player — hear the AI interview */}
        {!isPresenter && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>
              Hear a real AI interview
            </p>
            <audio
              controls
              preload="metadata"
              className="w-full max-w-md"
              style={{ borderRadius: "9999px" }}
              src={demoRecording}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    </section>
  );
}
