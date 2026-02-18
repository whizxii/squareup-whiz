import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How long have you known each other?",
    a: "We met at Mesa School of Business, where we both took a year off to build full-time. 7 months of working together. Full-time on SquareUp since December 2025.",
  },
  {
    q: "Who writes the code?",
    a: "Param leads all product and engineering. Former Tech Lead at EA Sports. Kunj architects the GTM motion and the AI workflow layer — the system that conducts, processes, and synthesizes interviews end-to-end.",
  },
  {
    q: "How are you different from Qualtrics or Dovetail?",
    a: "Those tools help you organize feedback you already have. SquareUp generates signal from scratch — AI-led interviews, screened respondents, synthesized findings. You're not tagging recordings. You're getting an Insight Brief in 7 days.",
  },
  {
    q: "What does the $500K get you?",
    a: "50% product (AI infra, voice agent reliability, insight brief quality), 40% GTM (converting design partners to paying case studies, Mesa network activation), 10% ops. Revenue in 90 days. Repeatable sales motion built.",
  },
  {
    q: "What's your long-term moat?",
    a: "Data flywheel: every conversation improves our models — no one can buy this dataset. Workflow lock-in: once a team runs their research process on SquareUp, switching cost compounds. Distribution: Mesa's network spans all stages, sectors, and their LPs' portfolio companies. That's an unfair advantage nobody can replicate.",
  },
  {
    q: "When can I see the product?",
    a: "Now. almost.joinsquareup.com — or book 20 minutes and we'll walk you through a live demo with real data from our design partner sessions.",
  },
  {
    q: "What's your current traction?",
    a: "3 Letters of Intent signed with design partners. 50+ discovery conversations with leaders at Zepto, Meesho, Swiggy, Titan Consumer, Rebel Foods, Swish. MVP shipped in 15 days. No revenue yet — that's what this round is for.",
  },
  {
    q: "What's your go-to-market motion?",
    a: "Warm outbound through Mesa's founder and VC network first. Case study → referral flywheel from design partners. Then direct to CX, Growth, and NPD teams at mid-market consumer brands across QSR, platforms, and D2C.",
  },
  {
    q: "Why Bengaluru?",
    a: "The density of consumer brands, QSR chains, and consumer platforms here is unmatched. Zepto, Swiggy, Rebel Foods, Meesho — our first 50 conversations were all within reach. Best market to prove this before going global.",
  },
];

export default function FAQSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const { ref, revealed } = useScrollAnimation();

  return (
    <section id="faq" className="py-28 px-6" style={{ background: "hsl(var(--sq-off-white))" }}>
      <div className="max-w-3xl mx-auto" ref={ref}>
        <div className={`mb-12 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4 text-center" style={{ color: "hsl(var(--sq-orange))" }}>
            FAQ
          </p>
          <h2 className="font-black tracking-tight leading-tight text-center text-3xl sm:text-4xl" style={{ color: "hsl(var(--sq-text))" }}>
            Questions we know you have.
          </h2>
        </div>

        <Accordion.Root type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <Accordion.Item
              key={faq.q}
              value={`faq-${i}`}
              className={`rounded-2xl overflow-hidden transition-all duration-500 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDelay: `${i * 50}ms`,
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))"
              }}
            >
              <Accordion.Trigger className="flex w-full items-center justify-between px-6 py-4 text-left group">
                <span className="font-bold text-sm sm:text-base" style={{ color: "hsl(var(--sq-text))" }}>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className="transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0 ml-4"
                  style={{ color: "hsl(var(--sq-muted))" }}
                />
              </Accordion.Trigger>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{faq.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
