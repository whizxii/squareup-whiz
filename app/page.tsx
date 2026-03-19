"use client";

import { useEffect, useRef, useState } from "react";
import LogoNotch from "@/components/ui/LogoNotch";
import PilotFloatingCTA from "@/components/pilot/PilotFloatingCTA";

import PilotHero from "@/components/pilot/PilotHero";
import WhoThisIsFor from "@/components/pilot/WhoThisIsFor";
import HowItWorks from "@/components/pilot/HowItWorks";
import PilotTestimonials from "@/components/pilot/PilotTestimonials";
import PilotPricing from "@/components/pilot/PilotPricing";
import PilotSlots from "@/components/pilot/PilotSlots";
import PilotFAQ from "@/components/pilot/PilotFAQ";
import PilotFinalCTA from "@/components/pilot/PilotFinalCTA";
import PilotFooter from "@/components/pilot/PilotFooter";
import SampleBriefModal from "@/components/pilot/SampleBriefModal";

export default function PilotPage() {
  const [showBrief, setShowBrief] = useState(false);
  const lenisRef = useRef<InstanceType<
    typeof import("@studio-freight/lenis").default
  > | null>(null);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    (async () => {
      const Lenis = (await import("@studio-freight/lenis")).default;
      const instance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenisRef.current = instance;

      function raf(time: number) {
        instance.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);
    })();

    return () => {
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Stop Lenis when modal is open so scroll stays inside the modal
  useEffect(() => {
    if (showBrief) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [showBrief]);

  return (
    <main className="relative">
      <LogoNotch />
      <PilotFloatingCTA />
      <PilotHero />
      <div className="relative z-10 bg-cream">
        <WhoThisIsFor />
        <HowItWorks onShowBrief={() => setShowBrief(true)} />
        <PilotTestimonials />
        <PilotPricing />
        <PilotSlots />
        <PilotFAQ />
        <PilotFinalCTA onShowBrief={() => setShowBrief(true)} />
        <PilotFooter />
      </div>
      {showBrief && <SampleBriefModal onClose={() => setShowBrief(false)} />}
    </main>
  );
}
