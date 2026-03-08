"use client";

import { useEffect } from "react";
import LoadingScreen from "@/components/ui/LoadingScreen";
import FloatingNav from "@/components/sections/FloatingNav";
import LogoNotch from "@/components/ui/LogoNotch";
import HeroSection from "@/components/sections/HeroSection";
import CoreFeatures from "@/components/sections/CoreFeatures";
import FeaturesMarquee from "@/components/sections/FeaturesMarquee";
import AgentsSection from "@/components/sections/AgentsSection";
import ResearchNeeds from "@/components/sections/ResearchNeeds";
import SocialProof from "@/components/sections/SocialProof";
import TrustSecurity from "@/components/sections/TrustSecurity";
import BookingSection from "@/components/sections/BookingSection";
import CTASection from "@/components/sections/CTASection";
import Footer from "@/components/sections/Footer";
import ProblemSection from "@/components/sections/ProblemSection";
export default function Home() {

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    let lenis: InstanceType<typeof import("@studio-freight/lenis").default> | null = null;

    (async () => {
      const Lenis = (await import("@studio-freight/lenis")).default;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      function raf(time: number) {
        lenis?.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);
    })();

    return () => {
      lenis?.destroy();
    };
  }, []);

  return (
    <main className="relative">
      <LoadingScreen />
      <LogoNotch />
      <FloatingNav />
      <HeroSection />
      <div className="relative z-10 bg-cream">
        <ProblemSection />
        <CoreFeatures />
        <FeaturesMarquee />
        <AgentsSection />
        <ResearchNeeds />
        <SocialProof />
        <TrustSecurity />
        <BookingSection />
        <CTASection />
        <Footer />
      </div>
    </main>
  );
}
