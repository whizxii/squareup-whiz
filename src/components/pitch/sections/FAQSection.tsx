import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How are you different from Qualtrics or Dovetail?",
    a: "They organize data you already have. SquareUp goes and gets it — AI runs the interviews and delivers a brief in 7 days.",
  },
  {
    q: "What does the $500K actually buy?",
    a: "50% deeper AI. 40% converting LOIs to paying customers. 10% ops. No team buildout until the motion is proven.",
  },
  {
    q: "What does first revenue look like?",
    a: "3 LOIs → paying customers in 90 days. First case studies with real brand names. Proof of willingness to pay, not just intent.",
  },
  {
    q: "What's the long-term moat?",
    a: "Data flywheel (every call trains our models) + workflow lock-in (switching cost compounds with every brief) + Mesa distribution.",
  },
  {
    q: "How do you go-to-market?",
    a: "Mesa network first. Design partner case studies → referral flywheel. Then direct to Growth and NPD leads at mid-market consumer brands.",
  },
  {
    q: "Can I see the product now?",
    a: "Yes — almost.joinsquareup.com. Or book 20 minutes and we'll walk through a live session with real data.",
  },
];

export default function FAQSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const { ref, revealed } = useScrollAnimation();

  return (
    <section id="faq" className="py-28 px-6" style={{ background: "hsl(var(--sq-card))" }}>
      <div className="max-w-3xl mx-auto" ref={ref}>
        <div className={`mb-12 text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            FAQ
          </p>
          <h2 className="font-black tracking-tight leading-tight text-3xl sm:text-4xl" style={{ color: "hsl(var(--sq-text))" }}>
            Six questions.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>Six answers.</span>
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
                transitionDelay: `${i * 60}ms`,
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))"
              }}
            >
              <Accordion.Trigger className="flex w-full items-center justify-between px-6 py-4 text-left group">
                <span className="font-bold text-sm sm:text-base" style={{ color: "hsl(var(--sq-text))" }}>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className="transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0 ml-4"
                  style={{ color: "hsl(var(--sq-orange))" }}
                />
              </Accordion.Trigger>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="px-6 pb-5 pt-1 border-t" style={{ borderColor: "hsl(var(--sq-subtle))" }}>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{faq.a}</p>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
