import { useState } from "react";
import Nav from "@/components/pitch/Nav";
import HeroSection from "@/components/pitch/sections/HeroSection";
import ProblemSection from "@/components/pitch/sections/ProblemSection";
import SolutionSection from "@/components/pitch/sections/SolutionSection";
import HowItWorksSection from "@/components/pitch/sections/HowItWorksSection";
import AIDemoSection from "@/components/pitch/sections/AIDemoSection";
import WhoIsItForSection from "@/components/pitch/sections/WhoIsItForSection";
import TractionSection from "@/components/pitch/sections/TractionSection";
import WhyNowSection from "@/components/pitch/sections/WhyNowSection";
import LandscapeSection from "@/components/pitch/sections/LandscapeSection";
import MarketSection from "@/components/pitch/sections/MarketSection";
import BusinessModelSection from "@/components/pitch/sections/BusinessModelSection";
import TeamSection from "@/components/pitch/sections/TeamSection";
import TheAskSection from "@/components/pitch/sections/TheAskSection";
import CostSection from "@/components/pitch/sections/CostSection";
import ToolsGapSection from "@/components/pitch/sections/ToolsGapSection";
import FAQSection from "@/components/pitch/sections/FAQSection";
import CTASection from "@/components/pitch/sections/CTASection";
import PresenterMode from "@/components/pitch/presenter/PresenterMode";
import type { SlideMode, DeckLength } from "@/lib/slides";

// Short deck: 10 essential slides, no fluff
const SHORT_SECTIONS = [
  <HeroSection key="hero" mode="detailed" />,
  <ProblemSection key="problem" mode="detailed" />,
  <SolutionSection key="solution" mode="detailed" />,
  <HowItWorksSection key="howitworks" mode="detailed" />,
  <AIDemoSection key="aidemo" mode="detailed" />,
  <TractionSection key="traction" mode="detailed" />,
  <LandscapeSection key="landscape" mode="detailed" />,
  <BusinessModelSection key="businessmodel" mode="detailed" />,
  <TeamSection key="team" mode="detailed" />,
  <TheAskSection key="ask" mode="detailed" />,
  <CTASection key="cta" mode="detailed" />,
];

export default function Index() {
  const [mode, setMode] = useState<SlideMode>("short");
  const [deckLength, setDeckLength] = useState<DeckLength>(10);

  if (mode === "presenter") {
    return (
      <PresenterMode
        onExit={() => setMode("short")}
        deckLength={deckLength}
        onDeckLengthChange={setDeckLength}
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

      <main>
        {mode === "short" ? (
          SHORT_SECTIONS
        ) : (
          <>
            <HeroSection mode="detailed" />
            <ProblemSection mode="detailed" />
            <CostSection mode="detailed" />
            <ToolsGapSection mode="detailed" />
            <SolutionSection mode="detailed" />
            <HowItWorksSection mode="detailed" />
            <AIDemoSection mode="detailed" />
            <WhoIsItForSection mode="detailed" />
            <WhyNowSection mode="detailed" />
            <TractionSection mode="detailed" />
            <LandscapeSection mode="detailed" />
            <MarketSection mode="detailed" />
            <BusinessModelSection mode="detailed" />
            <TeamSection mode="detailed" />
            <TheAskSection mode="detailed" />
            <FAQSection mode="detailed" />
            <CTASection mode="detailed" />
          </>
        )}
      </main>
    </div>
  );
}
