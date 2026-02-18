import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How long have you known each other?",
    a: "We met at Mesa School of Business, where we both enrolled to build a startup full-time. We've been working together for 7 months — and full-time on SquareUp since December 2025.",
  },
  {
    q: "Who writes the code?",
    a: "Param leads all product and engineering. He was a Tech Lead at EA Sports before Mesa. Kunj architects the GTM motion and the AI workflow layer — the system that actually conducts and processes interviews end-to-end.",
  },
  {
    q: "How is SquareUp different from Qualtrics or Dovetail?",
    a: "Those tools help you organize feedback you've already collected. SquareUp generates signal from scratch — it runs AI-led interviews, screens respondents, and synthesizes findings. You're not tagging recordings. You're getting an Insight Brief in 7 days.",
  },
  {
    q: "What does the $500K get you?",
    a: "50% product (AI infra depth), 40% GTM (converting design partners to paid case studies, Mesa network activation), 10% ops. This buys us revenue in 90 days and a repeatable sales motion.",
  },
  {
    q: "What's your long-term moat?",
    a: "Three things. Data flywheel: every conversation improves our models — no one can buy this dataset. Workflow lock-in: once a team runs their research process on SquareUp, switching cost compounds. Distribution: Mesa's network spans all stages, sectors, and their LPs' portfolio companies.",
  },
  {
    q: "When can I see the product?",
    a: "Now. Go to almost.joinsquareup.com or book a 20-minute call and we'll walk you through a live demo with real data.",
  },
  {
    q: "What's your current traction?",
    a: "3 Letters of Intent signed with design partners. 50+ customer discovery conversations with leaders at Zepto, Meesho, Swiggy, Titan Consumer, Rebel Foods, and Swish. MVP shipped in 15 days. No revenue yet — we're converting pilots to paid in this round.",
  },
  {
    q: "What's your go-to-market motion?",
    a: "Warm outbound through Mesa's founder and VC network first. Case study → referral flywheel from design partners. Then direct to CX, Growth, and NPD teams at mid-market consumer brands.",
  },
  {
    q: "Why Bengaluru?",
    a: "Because the density of consumer brands, QSR chains, and consumer platforms here is unmatched. Zepto, Swiggy, Rebel Foods, Meesho — our first 50 conversations were all within reach. It's the best market to build and prove this in before going global.",
  },
];

export default function FAQSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const { ref, revealed } = useScrollAnimation();

  return (
    <section id="faq" className="bg-sq-off-white py-24 px-6">
      <div className="max-w-3xl mx-auto" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-12 text-3xl sm:text-4xl transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}
        >
          Everything you need to know.
        </h2>

        <Accordion.Root type="single" collapsible className="space-y-3">
          {FAQS.map((faq, i) => (
            <Accordion.Item
              key={faq.q}
              value={`faq-${i}`}
              className={`bg-sq-card rounded-2xl border border-sq-subtle overflow-hidden transition-all duration-500 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Accordion.Trigger className="flex w-full items-center justify-between px-6 py-4 text-left group">
                <span className="font-bold text-sq-text text-sm sm:text-base">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className="text-sq-muted transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0 ml-3"
                />
              </Accordion.Trigger>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <p className="px-6 pb-5 text-sq-muted text-sm leading-relaxed">{faq.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
