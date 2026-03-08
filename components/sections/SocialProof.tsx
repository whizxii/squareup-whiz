"use client";

const logos = [
  { name: "Mesa School of Business", style: "font-bold text-xl tracking-wider" },
  { name: "Zepto", style: "font-bold text-xl" },
  { name: "WILDSTONE", style: "font-bold text-xl tracking-wider" },
  { name: "Titan Skinn", style: "font-semibold text-lg tracking-[0.15em]" },
  { name: "Fasttrack", style: "font-bold text-xl italic" },
  { name: "Andamen", style: "font-semibold text-lg" },
  { name: "V-BOG", style: "font-bold text-xl tracking-wider" },
  { name: "14U Capital", style: "font-semibold text-lg tracking-[0.15em]" },
  { name: "Mumbai Pav Company", style: "font-bold text-lg" },
  { name: "Everaw", style: "font-bold text-xl italic" },
  { name: "Cozy Bear", style: "font-semibold text-lg" },
];

export default function SocialProof() {
  const doubled = [...logos, ...logos];

  return (
    <section data-section-name="social-proof" className="relative z-10 py-12 sm:py-20 lg:py-28 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 mb-12">
        <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.04em] text-maze-black leading-[1.15] text-center max-w-[700px] mx-auto">
          From startups to enterprises,<br /> all studies run on Square Up
        </h2>
        <p className="text-base sm:text-lg text-maze-black tracking-wide text-center mt-4">
          Trusted by the leaders from world&apos;s most customer-obsessed teams
        </p>
      </div>

      {}
      <div className="relative">
        <div className="flex overflow-hidden">
          <div className="flex items-center gap-6 sm:gap-12 lg:gap-16 animate-scroll-left-slow shrink-0">
            {doubled.map((logo, i) => (
              <span
                key={`${logo.name}-${i}`}
                className="font-bold text-sm sm:text-base md:text-lg text-maze-black whitespace-nowrap select-none shrink-0"
              >
                {logo.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-6 sm:gap-12 lg:gap-16 animate-scroll-left-slow shrink-0 ml-6 sm:ml-12 lg:ml-16">
            {doubled.map((logo, i) => (
              <span
                key={`${logo.name}-dup-${i}`}
                className="font-bold text-sm sm:text-base md:text-lg text-maze-black whitespace-nowrap select-none shrink-0"
              >
                {logo.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="flex justify-center mt-12 sm:mt-16 lg:mt-[96px]">
        <div className="h-px w-[33%] bg-neutral-300/30" />
      </div>
    </section>
  );
}
