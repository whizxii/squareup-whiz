import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How are you different from Qualtrics or Dovetail?",
    a: "Qualtrics and Dovetail help you tag and organize data you already have. SquareUp goes and gets it — AI runs the interviews, screens the respondents, synthesizes the findings, and delivers an Insight Brief in 7 days. You're not tagging recordings. You're getting a decision.",
  },
  {
    q: "What does the $500K actually buy?",
    a: "50% product: deeper AI, better voice agent, sharper insight briefs. 40% GTM: convert 3 LOIs to paying customers, build case studies, Mesa network activation. 10% ops — tools, infra, legal. No team buildout until the motion is proven.",
  },
  {
    q: "What does first revenue look like?",
    a: "3 LOIs converted to paying customers in 90 days. First case studies published with real brand names. That's the plan for this seed round — proof of willingness to pay, not just intent.",
  },
  {
    q: "What's the long-term moat?",
    a: "Three things stacking: (1) Data flywheel — every conversation trains our models, nobody can buy this dataset. (2) Workflow lock-in — switching cost compounds with every brief. (3) Mesa distribution — warm access across their portfolio and LP companies.",
  },
  {
    q: "How do you go-to-market?",
    a: "Warm outbound through Mesa's founder and VC network first. Design partner case studies → referral flywheel. Then direct to Growth, CX, and NPD leads at mid-market consumer brands across QSR, D2C, and platforms.",
  },
  {
    q: "Can I see the product now?",
    a: "Yes. almost.joinsquareup.com — or book 20 minutes and we'll walk you through a live session with real data from our design partner calls.",
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
