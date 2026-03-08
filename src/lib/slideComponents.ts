import type React from "react";
import HeroSection from "@/components/pitch/sections/HeroSection";
import CostSection from "@/components/pitch/sections/CostSection";
import ProblemSection from "@/components/pitch/sections/ProblemSection";
import DecisionVolumeSection from "@/components/pitch/sections/DecisionVolumeSection";
import SolutionSection from "@/components/pitch/sections/SolutionSection";
import WhoIsItForSection from "@/components/pitch/sections/WhoIsItForSection";
import HowItWorksSection from "@/components/pitch/sections/HowItWorksSection";
import AIDemoSection from "@/components/pitch/sections/AIDemoSection";
import WhyNowSection from "@/components/pitch/sections/WhyNowSection";
import TractionSection from "@/components/pitch/sections/TractionSection";
import LandscapeSection from "@/components/pitch/sections/LandscapeSection";
import MarketSection from "@/components/pitch/sections/MarketSection";
import BusinessModelSection from "@/components/pitch/sections/BusinessModelSection";
import TeamSection from "@/components/pitch/sections/TeamSection";
import TheAskSection from "@/components/pitch/sections/TheAskSection";
import ToolsGapSection from "@/components/pitch/sections/ToolsGapSection";
import CTASection from "@/components/pitch/sections/CTASection";
import FAQSection from "@/components/pitch/sections/FAQSection";
import InsightBriefSection from "@/components/pitch/sections/InsightBriefSection";
import DecisionFlowSection from "@/components/pitch/sections/DecisionFlowSection";
import type { SlideMode } from "@/lib/slides";

export const SLIDE_COMPONENTS: Record<string, React.ComponentType<{ mode?: SlideMode }>> = {
  hero: HeroSection,
  cost: CostSection,
  problem: ProblemSection,
  decisionvolume: DecisionVolumeSection,
  landscape: LandscapeSection,
  solution: SolutionSection,
  whofor: WhoIsItForSection,
  howitworks: HowItWorksSection,
  aidemo: AIDemoSection,
  whynow: WhyNowSection,
  traction: TractionSection,
  market: MarketSection,
  businessmodel: BusinessModelSection,
  team: TeamSection,
  ask: TheAskSection,
  toolsgap: ToolsGapSection,
  cta: CTASection,
  faq: FAQSection,
  insightbrief: InsightBriefSection,
  decisionflow: DecisionFlowSection,
};
