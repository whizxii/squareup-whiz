"use client";

import { useStudy } from "@/lib/study-context";
import StatsSidebar from "@/components/layout/StatsSidebar";
import { useState, useRef, useEffect, useCallback } from "react";

type Channel = "text" | "voice" | "video";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

const RESPONSE_CHIPS: Record<number, string[]> = {
  0: ["Every morning", "A few times a week", "Only for events"],
  1: ["I stick with one", "I rotate 2-3", "Depends on my mood"],
  2: ["It lasts long", "I love the scent", "It was a gift"],
  3: ["Park Avenue", "Titan Skinn", "Imported brands"],
  4: ["Reliable, safe", "Bit old-fashioned", "Good value"],
  5: ["Sounds great!", "Interesting idea", "Not sure about it"],
  6: ["Very different", "Similar but better", "I prefer special moments"],
  7: ["Instagram / YouTube", "Friends told me", "Found it in a store"],
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-maze-gray/40 animate-pulse-dot" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-maze-gray/40 animate-pulse-dot" style={{ animationDelay: "200ms" }} />
      <div className="w-2 h-2 rounded-full bg-maze-gray/40 animate-pulse-dot" style={{ animationDelay: "400ms" }} />
    </div>
  );
}

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[380px]">
      {/* Phone frame */}
      <div className="bg-maze-black rounded-[2.5rem] p-3 shadow-2xl">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-28 h-6 bg-maze-black rounded-b-2xl" />
        </div>
        {/* Screen */}
        <div className="bg-white rounded-[2rem] overflow-hidden h-[600px] flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

function TextChatInterview() {
  const { activeStudy } = useStudy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [exchangeIndex, setExchangeIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transcript = activeStudy?.interviewTranscript || [];
  // AI messages from the transcript (every other starting at 0)
  const aiMessages = transcript.filter((m) => m.role === "ai");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Send first AI message on mount
  useEffect(() => {
    if (aiMessages.length > 0 && messages.length === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setMessages([{ role: "ai", text: aiMessages[0].text }]);
        setIsTyping(false);
        setExchangeIndex(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || isTyping || isComplete) return;

    const userMsg: ChatMessage = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    const nextAiIndex = exchangeIndex + 1;

    if (nextAiIndex >= aiMessages.length) {
      setIsComplete(true);
      return;
    }

    // Show typing indicator then AI response
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", text: aiMessages[nextAiIndex].text }]);
      setIsTyping(false);
      setExchangeIndex(nextAiIndex);

      // Check if this was the last AI message
      if (nextAiIndex >= aiMessages.length - 1) {
        setIsComplete(true);
      }
    }, 1500 + Math.random() * 500);
  }, [isTyping, isComplete, exchangeIndex, aiMessages]);

  const chips = RESPONSE_CHIPS[exchangeIndex] || [];

  return (
    <PhoneMockup>
      {/* Header */}
      <div className="bg-coral px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-white text-sm font-bold">SU</span>
        </div>
        <div>
          <p className="text-white font-medium text-sm">Square Up Research</p>
          <p className="text-white/70 text-xs">Interview with Arjun K.</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-white/70 text-xs">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream/30">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-coral text-white rounded-br-md"
                  : "bg-white text-maze-black rounded-bl-md shadow-sm border border-cream-dark"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white rounded-2xl rounded-bl-md shadow-sm border border-cream-dark">
              <TypingIndicator />
            </div>
          </div>
        )}
        {isComplete && (
          <div className="flex justify-center animate-fade-in">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-xs font-medium">
              Interview complete — thank you, Arjun!
            </div>
          </div>
        )}
      </div>

      {/* Response chips */}
      {!isComplete && !isTyping && chips.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-cream-dark bg-white">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="px-3 py-1.5 text-xs rounded-full border border-coral/30 text-coral hover:bg-coral/5 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-cream-dark bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)}
            placeholder={isComplete ? "Interview complete" : "Type your answer..."}
            disabled={isComplete || isTyping}
            className="flex-1 px-4 py-2.5 bg-cream rounded-full text-sm placeholder:text-maze-gray/50 focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim() || isComplete || isTyping}
            className="w-9 h-9 rounded-full bg-coral text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L7 9M14 2L10 14L7 9M14 2L2 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </PhoneMockup>
  );
}

function VoicePreview() {
  const { activeStudy } = useStudy();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const questions = activeStudy?.study.objectives[0]?.questions || [];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentQ((prev) => {
        if (prev >= questions.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying, questions.length]);

  return (
    <PhoneMockup>
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-maze-black to-maze-black/90">
        {/* Waveform visualization */}
        <div className="flex items-center gap-1 h-24 mb-8">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-300 ${isPlaying ? "bg-coral" : "bg-white/20"}`}
              style={{
                height: isPlaying
                  ? `${20 + Math.sin((i + currentQ * 3) * 0.5) * 40 + Math.random() * 20}px`
                  : "8px",
                transition: "height 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Current question */}
        <div className="text-center mb-8">
          <p className="text-white/50 text-xs mb-2">Question {currentQ + 1} of {questions.length}</p>
          <p className="text-white text-sm leading-relaxed max-w-[280px]">
            {questions[currentQ]?.text || "Loading..."}
          </p>
        </div>

        {/* Timer */}
        <div className="text-white/40 text-xs font-mono mb-6">
          {isPlaying ? `0:${String((currentQ + 1) * 4).padStart(2, "0")}` : "0:00"} / ~12:00
        </div>

        {/* Play button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-16 h-16 rounded-full bg-coral flex items-center justify-center hover:bg-coral-bright transition-colors"
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <p className="text-white/30 text-xs mt-4">Preview — Voice Interview</p>
      </div>
    </PhoneMockup>
  );
}

function VideoPreview() {
  const { activeStudy } = useStudy();
  const respondent = activeStudy?.respondents[0];

  return (
    <PhoneMockup>
      <div className="flex-1 flex flex-col bg-maze-black">
        {/* Video area */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* Respondent placeholder */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-coral/30 to-coral/10 flex items-center justify-center">
            <span className="text-4xl font-display font-bold text-white/60">
              {respondent?.name.charAt(0)}
            </span>
          </div>

          {/* Name tag */}
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <p className="text-white text-sm font-medium">{respondent?.name}</p>
            <p className="text-white/60 text-xs">{respondent?.age}, {respondent?.city}</p>
          </div>

          {/* Recording indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-mono">REC</span>
          </div>
        </div>

        {/* Transcript area */}
        <div className="bg-maze-black/90 border-t border-white/10 p-4">
          <p className="text-white/40 text-xs mb-2">Live Transcript</p>
          <p className="text-white/80 text-sm leading-relaxed">
            &ldquo;I usually spray some cologne after my shower every morning before work...&rdquo;
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 py-4 bg-maze-black">
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9h14M9 2v14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </svg>
          </button>
          <button className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <rect x="4" y="4" width="12" height="12" rx="2" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" opacity="0.5" />
            </svg>
          </button>
        </div>

        <p className="text-white/30 text-xs text-center pb-3">Preview — Video Interview</p>
      </div>
    </PhoneMockup>
  );
}

export default function InterviewPage() {
  const { activeStudy } = useStudy();
  const [channel, setChannel] = useState<Channel>("text");

  if (!activeStudy) return null;

  const { study, respondents } = activeStudy;

  const channels: { id: Channel; label: string; description: string; badge?: string }[] = [
    { id: "text", label: "Text Chat", description: "Interactive AI-moderated conversation", badge: "Strongest" },
    { id: "voice", label: "Voice", description: "Preview voice interview experience", badge: "Preview" },
    { id: "video", label: "Video", description: "Preview video interview experience", badge: "Preview" },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display font-bold text-2xl text-maze-black">Run Interviews</h1>
            <p className="text-sm text-maze-gray mt-1">
              {study.progress.completed}/{study.progress.total} interviews completed
            </p>
          </div>

          {/* Channel selector */}
          <div className="grid grid-cols-3 gap-4">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                  channel === ch.id
                    ? "border-coral bg-coral/5"
                    : "border-cream-dark bg-white hover:border-coral/30"
                }`}
              >
                {ch.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    ch.badge === "Strongest" ? "bg-coral/10 text-coral" : "bg-cream text-maze-gray"
                  }`}>
                    {ch.badge}
                  </span>
                )}
                <h3 className="font-display font-semibold text-sm text-maze-black">{ch.label}</h3>
                <p className="text-xs text-maze-gray mt-1">{ch.description}</p>
              </button>
            ))}
          </div>

          {/* Respondent bar */}
          <div className="bg-white rounded-2xl border border-cream-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-maze-black">Respondents</h3>
              <span className="text-xs text-maze-gray">{study.progress.completed} of {study.progress.total} complete</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {respondents.map((r, i) => {
                const isComplete = i < 6;
                const isActive = i === 6;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                      isActive
                        ? "bg-coral/10 text-coral border border-coral/30"
                        : isComplete
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-cream text-maze-gray"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-coral text-white" : isComplete ? "bg-green-500 text-white" : "bg-maze-gray/20 text-maze-gray"
                    }`}>
                      {isComplete ? "✓" : r.name.charAt(0)}
                    </div>
                    <span>{r.name}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interview area */}
          <div className="py-4">
            {channel === "text" && <TextChatInterview />}
            {channel === "voice" && <VoicePreview />}
            {channel === "video" && <VideoPreview />}
          </div>
        </div>
      </div>

      <StatsSidebar
        title="Real conversations at scale"
        description="AI-moderated interviews that feel human."
        stats={[
          { value: "70%", label: "Average completion rate" },
          { value: "93%", label: "Respondent satisfaction" },
          { value: "~12 min", label: "Average interview length" },
        ]}
      />
    </div>
  );
}
