"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";

const TESTIMONIALS = [
  {
    quote:
      "At Titan and Myntra I've been through enough research reports to know what a 60-page deck full of methodology slides looks like. I gave SquareUp the same brief. They came back with 8 pages. Every single page had something I could act on. I literally forwarded it to a few colleagues — that never happens with research decks.",
    name: "Saket",
    role: "Ecommerce Head",
    company: "Titan Company",
    linkedin: "https://www.linkedin.com/in/saket-singh-chauhan-a3003956/",
    featured: true,
  },
  {
    quote:
      "I had three different opinions on a relaunch direction and no way to settle it. Everyone had an 'insight.' I ran it through SquareUp — they came back with evidence on each one. Suddenly there was nothing to argue about.",
    name: "Krishnavi",
    role: "Founder",
    company: "Sakhi",
    linkedin: "https://www.linkedin.com/in/krishnavi-parekh-82b9231b2/",
  },
  {
    quote:
      "Honestly I thought consumer research was something Zomato and Meesho do. Not someone running a 120-person team. But I was about to spend 80 lakhs on a campaign and had zero evidence if the messaging would land. The pilot cost a fraction of that and told me to change the whole angle. It worked.",
    name: "Ankit",
    role: "Founder",
    company: "Mesa School of Business",
    linkedin: "https://www.linkedin.com/in/ankitagar/",
  },
  {
    quote:
      "Every month I sit with hundreds of NPS responses trying to figure out what's actually going wrong. Two weekends gone, every month. I gave SquareUp the same problem — they talked to 30 people and found the one pattern I'd been staring at and couldn't see.",
    name: "Arpan",
    role: "Lead Product Growth",
    company: "FInbox",
    linkedin: "https://www.linkedin.com/in/arpan-adarsh-30/",
  },
  {
    quote:
      "I was about to finalize an SKU that everyone around me loved. Ran it through SquareUp just because these guys pushed so much. Turns out customers found the name confusing and the price felt wrong for the size. I would've found out after printing 10,000 units.",
    name: "Shrey",
    role: "Founder",
    company: "FYN",
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
            {t.linkedin ? (
              <a href={t.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-maze-black truncate hover:text-lime transition-colors">
                {t.name}
              </a>
            ) : (
              <p className="text-sm font-bold text-maze-black truncate">
                {t.name}
              </p>
            )}
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
