import { useState } from "react";
import Nav from "@/components/pitch/Nav";
import HeroSection from "@/components/pitch/sections/HeroSection";
import CostSection from "@/components/pitch/sections/CostSection";
import ProblemSection from "@/components/pitch/sections/ProblemSection";
import DecisionVolumeSection from "@/components/pitch/sections/DecisionVolumeSection";
import LandscapeSection from "@/components/pitch/sections/LandscapeSection";
import SolutionSection from "@/components/pitch/sections/SolutionSection";
import WhoIsItForSection from "@/components/pitch/sections/WhoIsItForSection";
import HowItWorksSection from "@/components/pitch/sections/HowItWorksSection";
import AIDemoSection from "@/components/pitch/sections/AIDemoSection";
import WhyNowSection from "@/components/pitch/sections/WhyNowSection";
import TractionSection from "@/components/pitch/sections/TractionSection";
import MarketSection from "@/components/pitch/sections/MarketSection";
import BusinessModelSection from "@/components/pitch/sections/BusinessModelSection";
import TeamSection from "@/components/pitch/sections/TeamSection";
import TheAskSection from "@/components/pitch/sections/TheAskSection";
import FAQSection from "@/components/pitch/sections/FAQSection";
import CTASection from "@/components/pitch/sections/CTASection";
import InsightBriefSection from "@/components/pitch/sections/InsightBriefSection";
import DecisionFlowSection from "@/components/pitch/sections/DecisionFlowSection";

import PresenterMode from "@/components/pitch/presenter/PresenterMode";
import PresenterBuilder from "@/components/pitch/presenter/PresenterBuilder";
import type { SlideMode, DeckLength, SlideDefinition } from "@/lib/slides";

import DownloadMode from "@/components/pitch/download/DownloadMode";
import PrintTemplate from "@/components/pitch/download/PrintTemplate";

// 10-Slide Founder Pitch (Short Mode)
// Story: Hook → Pain → Solution → Product → Timing → Proof → Market → Team → Ask → Close
const FOUNDER_SECTIONS = [
  <HeroSection key="hero" mode="detailed" />,
  <CostSection key="cost" mode="detailed" />,
  <ProblemSection key="problem" mode="detailed" />,
  <SolutionSection key="solution" mode="detailed" />,
  <InsightBriefSection key="insightbrief" mode="detailed" />,
  <AIDemoSection key="aidemo" mode="detailed" />,
  <WhyNowSection key="whynow" mode="detailed" />,
  <TractionSection key="traction" mode="detailed" />,
  <MarketSection key="market" mode="detailed" />,
  <TeamSection key="team" mode="detailed" />,
  <TheAskSection key="ask" mode="detailed" />,
  <CTASection key="cta" mode="detailed" />,
];

// 12-Slide Master Pitch (Detailed Mode)
const MASTER_SECTIONS = [
  <HeroSection key="hero" mode="detailed" />,
  <CostSection key="cost" mode="detailed" />,
  <ProblemSection key="problem" mode="detailed" />,
  <DecisionVolumeSection key="decisionvolume" mode="detailed" />,
  <LandscapeSection key="landscape" mode="detailed" />,
  <SolutionSection key="solution" mode="detailed" />,
  <DecisionFlowSection key="decisionflow" mode="detailed" />,
  <WhoIsItForSection key="whofor" mode="detailed" />,
  <HowItWorksSection key="howitworks" mode="detailed" />,
  <AIDemoSection key="aidemo" mode="detailed" />,
  <InsightBriefSection key="insightbrief-master" mode="detailed" />,
  <WhyNowSection key="whynow" mode="detailed" />,
  <TractionSection key="traction" mode="detailed" />,
  <MarketSection key="market" mode="detailed" />,
  <BusinessModelSection key="businessmodel" mode="detailed" />,
  <TeamSection key="team" mode="detailed" />,
  <TheAskSection key="ask" mode="detailed" />,
  // Optional appendix/closers
  <FAQSection key="faq" mode="detailed" />,
  <CTASection key="cta" mode="detailed" />,
];

export default function Index() {
  const [mode, setMode] = useState<SlideMode>("short");
  const [deckLength, setDeckLength] = useState<DeckLength>(8); // Default to 8-slide
  const [sessionSlides, setSessionSlides] = useState<SlideDefinition[] | null>(null);
  const [printSlides, setPrintSlides] = useState<SlideDefinition[] | null>(null);

  if (printSlides) {
    return <PrintTemplate slides={printSlides} onFinish={() => setPrintSlides(null)} />;
  }

  if (mode === "presenter") {
    if (sessionSlides) {
      return (
        <PresenterMode
          onExit={() => setSessionSlides(null)}
          slides={sessionSlides}
        />
      );
    }
    return (
      <PresenterBuilder
        onExit={() => setMode("short")}
        onStartPresentation={setSessionSlides}
        onDownloadPDF={setPrintSlides}
      />
    );
  }

  return (
    <div className="font-sans" style={{ background: "hsl(var(--sq-off-white))" }}>
      <Nav
        mode={mode}
        onModeChange={setMode}
        deckLength={deckLength}
        onDeckLengthChange={setDeckLength}
      />

      {/* Info banner */}
      <div className="pt-[72px] pb-2 px-5 sm:px-8 max-w-6xl mx-auto">
        <div
          className="rounded-xl px-5 py-4 sm:px-6 sm:py-5 text-[13px] leading-relaxed"
          style={{
            background: "hsl(var(--sq-subtle))",
            color: "hsl(var(--sq-muted))",
          }}
        >
          <p className="font-semibold mb-2" style={{ color: "hsl(var(--sq-text))" }}>
            Investor pitch deck.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <p><span className="font-semibold" style={{ color: "hsl(var(--sq-text))" }}>Pitch</span> — crisp, YC-style sendable version</p>
            <p><span className="font-semibold" style={{ color: "hsl(var(--sq-text))" }}>Deep Dive</span> — full story with competitors, ICP & more</p>
            <p><span className="font-semibold" style={{ color: "hsl(var(--sq-text))" }}>Download</span> — export either version as PDF</p>
            <p><span className="font-semibold" style={{ color: "hsl(var(--sq-text))" }}>Present</span> — distilled, less-cluttered slideshow for live presenting</p>
          </div>
        </div>
      </div>

      <main>
        {mode === "download" ? (
          <DownloadMode onDownloadPDF={setPrintSlides} />
        ) : mode === "short" ? (
          FOUNDER_SECTIONS
        ) : (
          MASTER_SECTIONS
        )}
      </main>
    </div>
  );
}
