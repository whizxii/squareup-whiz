"use client";

import Reveal from "@/components/ui/Reveal";

const CALENDLY_URL = "https://cal.com/squareup-ai/discovery-setup-call";

export default function PilotFinalCTA({
  onShowBrief,
}: {
  onShowBrief: () => void;
}) {
  return (
    <section id="book-call" className="relative py-12 sm:py-16 lg:py-20">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute blob-drift-2"
          style={{
            width: "60vw",
            height: "50vh",
            top: "20%",
            left: "20%",
            background:
              "radial-gradient(ellipse, rgba(255,90,54,0.05) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[800px] mx-auto px-5 sm:px-6 lg:px-10 text-center">
        <Reveal width="100%" delay={0}>
          <h2 className="font-display text-[clamp(28px,7vw,56px)] tracking-[-0.04em] text-maze-black leading-[1.08]">
            Ready to make a decision
            <br className="hidden sm:block" /> in 48 hours?
          </h2>
        </Reveal>

        <Reveal width="100%" delay={0.08}>
          <p className="mt-4 text-base sm:text-lg text-maze-gray">
            Only 2 pilot slots left. Book a 15-min call.
          </p>
        </Reveal>

        <Reveal width="100%" delay={0.16}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href={CALENDLY_URL}
              className="w-full sm:w-auto sm:min-w-[280px] min-h-[56px] px-6 py-3 text-base font-display tracking-[-0.02em] text-white bg-maze-black rounded-xl hover:bg-black active:scale-[0.97] transition-all flex items-center justify-center"
            >
              Book a 15-min call
            </a>
            <button
              onClick={onShowBrief}
              className="w-full sm:w-auto sm:min-w-[240px] min-h-[56px] px-6 py-3 text-base font-display tracking-[-0.02em] text-maze-black border border-neutral-300 rounded-xl hover:border-maze-black hover:bg-white/80 backdrop-blur-sm active:scale-[0.97] transition-all flex items-center justify-center"
            >
              See a sample brief
            </button>
          </div>
        </Reveal>

        <Reveal width="100%" delay={0.2}>
          <div className="mt-8 max-w-[480px] mx-auto px-5 py-4 rounded-2xl bg-white/60 border border-neutral-200/50">
            <p className="text-[15px] text-maze-black leading-relaxed italic">
              &ldquo;I&rsquo;ve worked at Myntra and Titan. I know what research looks like. This was genuinely the first time I got a research output and immediately put it to use.&rdquo;
            </p>
            <p className="mt-2 text-[13px] text-maze-gray font-semibold">
              Saket, Brand Lead at Titan Skinn
            </p>
          </div>
        </Reveal>

        <Reveal width="100%" delay={0.28}>
          <p className="mt-6 text-sm text-maze-gray">
            Prefer email?{" "}
            <a
              href="mailto:hello@joinsquareup.com?subject=48-Hour%20Pilot"
              className="text-lime underline hover:text-lime-bright transition-colors"
            >
              hello@joinsquareup.com
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
