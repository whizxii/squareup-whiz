"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";

const TESTIMONIALS = [
  {
    quote:
      "Our last agency gave us a 60 page deck after 5 weeks. Half of it was methodology slides. SquareUp gave us 8 pages. Every single page had something we could act on. My manager literally forwarded it to the CEO — that's never happened before.",
    name: "Ashish",
    role: "Category",
    company: "Man Matters",
    featured: true,
  },
  {
    quote:
      "We had three people in leadership with three different opinions on the relaunch. Everyone had an 'insight.' SquareUp came back with evidence on those insights and suddenly there was nothing to argue about.",
    name: "Siddharth",
    role: "Growth",
    company: "OYO",
  },
  {
    quote:
      "Honestly I thought consumer research was something HUL and P&G do. Not us. We're a 20-person team. But we were about to spend 80 lakhs on a campaign for a new programme and had zero clue if the messaging would land. The pilot cost a fraction of that and told us to change the whole angle. It worked.",
    name: "Ankit",
    role: "Founder",
    company: "Mesa School of Business",
  },
  {
    quote:
      "I had to sign a PO for a new product. While my team was arguing 'but will people actually buy this.' SquareUp gave me the consumer data I needed. Three slides from their report went straight into my board deck. Got approved the same week.",
    name: "Darshana",
    role: "Growth",
    company: "CRED",
  },
  {
    quote:
      "We were about to finalize an SKU that the whole team loved. Ran it through SquareUp studies just because these guys pushed so much. Turns out customers found the name confusing and the price felt wrong for the size. We would've found out after printing 10,000 units.",
    name: "Shrey",
    role: "Founder",
    company: "FYN",
  },
  {
    quote:
      "I've worked at Myntra and Titan. I know what research looks like. It usually takes forever and half of it sits in a drive nobody opens. This was genuinely the first time I got a research output and immediately put it to use in the next quarter.",
    name: "Saket",
    role: "Brand Lead",
    company: "Titan Skinn",
    featured: true,
  },
  {
    quote:
      "Every month I'd sit with hundreds of NPS responses trying to figure out what's actually going wrong. Two weekends gone, every month. These guys talked to 30 people and found the one pattern I'd been staring at and couldn't see.",
    name: "Naveen",
    role: "Product",
    company: "EA Games",
  },
];

const GLASS_CARD = {
  background:
    "linear-gradient(160deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.28) 40%, rgba(255,255,255,0.22) 60%, rgba(255,255,255,0.40) 100%)",
  backdropFilter: "blur(48px) saturate(2.0)",
  WebkitBackdropFilter: "blur(48px) saturate(2.0)",
  border: "1px solid rgba(255,255,255,0.6)",
  boxShadow:
    "0 16px 48px -8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.95)",
};

/* Grid class per card index for the bento layout (desktop only):
   0 = tall left (spans 2 rows on lg)
   5 = wide bottom (spans 2 cols on lg)
   rest = normal 1x1 */
const GRID_CLASS: Record<number, string> = {
  0: "lg:row-span-2",
  5: "lg:col-span-2",
};

/* ─── Testimonial Card ─── */
function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6 flex flex-col h-full transition-shadow duration-300 hover:shadow-xl"
      style={GLASS_CARD}
    >
      {t.featured && (
        <span className="text-[56px] leading-none font-display text-lime/10 select-none -mb-6 -mt-1">
          &ldquo;
        </span>
      )}

      <p
        className={`leading-[1.65] flex-1 ${
          t.featured
            ? "text-base sm:text-lg text-maze-black"
            : "text-[15px] sm:text-base text-maze-black"
        }`}
      >
        &ldquo;{t.quote}&rdquo;
      </p>

      <div className="mt-5 pt-4 border-t border-neutral-200/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime/15 to-lime/5 flex items-center justify-center ring-1 ring-lime/10 flex-shrink-0">
            <span className="text-sm font-bold text-lime">{t.name[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-maze-black truncate">
              {t.name}
            </p>
            <p className="text-[12px] text-maze-gray truncate">
              {t.role} <span className="text-lime/50">at</span> {t.company}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PilotTestimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const scrollLeft = el.scrollLeft;
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth
        : 1;
      setActiveDot(Math.round(scrollLeft / cardWidth));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,90,54,0.03), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <Reveal width="100%" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/[0.08] border border-lime/15 mb-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
                Tested with industry leaders
              </span>
            </div>
          </Reveal>
          <Reveal width="100%" delay={0.06}>
            <h2 className="font-display text-[clamp(24px,5vw,44px)] tracking-[-0.03em] text-maze-black leading-[1.1]">
              We have tested with
              <br className="hidden sm:block" /> some of the sharpest teams in
              India.
            </h2>
          </Reveal>
          <Reveal width="100%" delay={0.1}>
            <p className="mt-3 text-sm sm:text-base text-maze-gray max-w-[540px] mx-auto">
              Now we are onboarding{" "}
              <span className="font-bold text-maze-black">4 pilot teams</span>.
              Here is what leaders who have seen SquareUp in action have to say.
            </p>
          </Reveal>
        </div>

        {/* ── Mobile: horizontal snap-scroll carousel ── */}
        <div className="sm:hidden -mx-5">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-5 pb-4 scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="w-[85vw] max-w-[340px] flex-shrink-0 snap-center"
              >
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeDot
                    ? "w-5 bg-lime"
                    : "w-1.5 bg-maze-black/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Desktop: bento grid ── */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {TESTIMONIALS.map((t, index) => (
            <motion.div
              key={t.name}
              className={GRID_CLASS[index] || ""}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.52,
                delay: 0.1 + index * 0.06,
                ease: [0.22, 1, 0.36, 1] as const,
              }}
            >
              <TestimonialCard t={t} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
