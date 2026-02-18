import { useState } from "react";
import Nav from "@/components/pitch/Nav";
import HeroSection from "@/components/pitch/sections/HeroSection";
import ProblemSection from "@/components/pitch/sections/ProblemSection";
import CostSection from "@/components/pitch/sections/CostSection";
import ToolsGapSection from "@/components/pitch/sections/ToolsGapSection";
import SolutionSection from "@/components/pitch/sections/SolutionSection";
import HowItWorksSection from "@/components/pitch/sections/HowItWorksSection";
import AIDemoSection from "@/components/pitch/sections/AIDemoSection";
import WhoIsItForSection from "@/components/pitch/sections/WhoIsItForSection";
import WhyNowSection from "@/components/pitch/sections/WhyNowSection";
import TractionSection from "@/components/pitch/sections/TractionSection";
import LandscapeSection from "@/components/pitch/sections/LandscapeSection";
import MarketSection from "@/components/pitch/sections/MarketSection";
import BusinessModelSection from "@/components/pitch/sections/BusinessModelSection";
import TeamSection from "@/components/pitch/sections/TeamSection";
import TheAskSection from "@/components/pitch/sections/TheAskSection";
import FAQSection from "@/components/pitch/sections/FAQSection";
import CTASection from "@/components/pitch/sections/CTASection";
import PresenterMode from "@/components/pitch/presenter/PresenterMode";
import type { SlideMode, DeckLength } from "@/lib/slides";

export default function Index() {
  const [mode, setMode] = useState<SlideMode>("detailed");
  const [deckLength, setDeckLength] = useState<DeckLength>(10);

  if (mode === "presenter") {
    return (
      <PresenterMode
        onExit={() => setMode("detailed")}
        deckLength={deckLength}
        onDeckLengthChange={setDeckLength}
      />
    );
  }

  return (
    <div className="font-sans">
      <Nav
        mode={mode}
        onModeChange={setMode}
        deckLength={deckLength}
        onDeckLengthChange={setDeckLength}
      />

      <main>
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
      </main>
    </div>
  );
}
