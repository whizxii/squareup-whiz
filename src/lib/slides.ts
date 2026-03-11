import type { ComponentType } from "react";

export type SlideMode = "short" | "detailed" | "presenter" | "download";
export type DeckLength = 8 | 12;

export interface SlideDefinition {
  id: string;
  title: string;
  lengths: DeckLength[];
  inShort: boolean;
  speakerNotes?: string;
}

export const ALL_SLIDES: SlideDefinition[] = [
  { id: "hero", title: "The Hook", lengths: [8, 12], inShort: true,
    speakerNotes: "Open strong. 'Everyone knows they should talk to customers — almost nobody does it well.' Pause. Let it land. Mention: 3 LOIs, MVP live, first paid pilot running." },
  { id: "cost", title: "The Bleed", lengths: [8, 12], inShort: true,
    speakerNotes: "Make it visceral. ₹2-3Cr inventory committed on instinct. 80% product failures. This is the status quo — and brands KNOW it but can't fix it." },
  { id: "problem", title: "The Structural Flaw", lengths: [8, 12], inShort: true,
    speakerNotes: "Click through 4 buckets one by one. Transparency → Hallucination → Lost Context → Siloed Intelligence. Key stat: >80% FMCG launches fail (NielsenIQ). This isn't a people problem — it's a structural one." },
  { id: "landscape", title: "The False Idols", lengths: [12], inShort: false,
    speakerNotes: "Click through battle cards. Kantar: 10x cheaper, 10x faster. Typeform: 70% of insights come from follow-ups. Qualtrics: built for enterprise, not mid-market. Dovetail: organizes past, we generate future. Mention Conveo (YC S24, $5.3M) as category validation." },
  { id: "solution", title: "The Category Definition", lengths: [8, 12], inShort: true,
    speakerNotes: "Click through 4 pillars. 'The customer understanding department most brands never build.' Interview → Synthesis → Repository → Routing. End-to-end — no one else does all four." },
  { id: "whofor", title: "Who It's For", lengths: [12], inShort: false,
    speakerNotes: "3 personas: Growth Lead, NPD Manager, CX Lead. For each: what they decide, what happens without us, what happens with SquareUp. Use the NPD example — ₹399 trial SKU story." },
  { id: "howitworks", title: "The Workflow", lengths: [12], inShort: false,
    speakerNotes: "Click through 6 steps: Define → Reach → Interview → Extract → Route → Store. Key message: 2 days, not 8 weeks. 50+ simultaneous interviews." },
  { id: "insightbrief", title: "The Decision Brief", lengths: [8, 12], inShort: true,
    speakerNotes: "Show the output — this is what the customer gets. Every recommendation traceable to real evidence. Not a report — a decision brief." },
  { id: "aidemo", title: "The Magic Demo", lengths: [8, 12], inShort: true,
    speakerNotes: "Let the animation play. Point out: real-time theme extraction, severity scoring, action routing. Key moment: '₹399 for a mini would fly' → instant price-pack mismatch detection." },
  { id: "whynow", title: "The Catalyst", lengths: [8, 12], inShort: true,
    speakerNotes: "4 tailwinds: Voice AI costs dropped 90% in 18 months. 57% researchers report growing demand for qual. Conveo raised $5.3M. 125M new online shoppers in India in 3 years." },
  { id: "traction", title: "The Velocity", lengths: [8, 12], inShort: true,
    speakerNotes: "Founded 3 months ago. 6 brands engaged. MVP in 15 days. 2 pilots running (Skinn by Titan, Big Basket). 50+ leaders interviewed. This team ships." },
  { id: "market", title: "The Market", lengths: [8, 12], inShort: true,
    speakerNotes: "Click through funnel. India TAM: ~$700M. SAM: ~$200M. SOM: ~$50M. Yr 3 target: $1-2M ARR. India is proving ground — $140B global market is the prize. Like Canva for design, SquareUp for customer intelligence." },
  { id: "businessmodel", title: "The Expansion", lengths: [12], inShort: false,
    speakerNotes: "₹1-3L per study, 3-4 studies/brand/quarter. Land with one team, expand across Growth/Product/CX. Phase 1: founder-led sales. Phase 2: case study flywheel. Phase 3: channel + content." },
  { id: "team", title: "The Destiny", lengths: [8, 12], inShort: true,
    speakerNotes: "Param: ex-EA Sports, built entire AI stack solo, MVP in 15 days. Kunj: D2C founder, validated with 50+ leaders, signed 6 pilots. Zero overlap — one builds, one sells. Mesa School backing." },
  { id: "ask", title: "The Ask", lengths: [8, 12], inShort: true,
    speakerNotes: "$500K seed. 50% product, 40% GTM, 10% ops. Milestones: Month 3 — first revenue. Month 9 — 5+ paying brands. Month 18 — Series A ready. Window is narrow — Conveo just raised, India is uncontested but not for long." },
  { id: "faq", title: "FAQ", lengths: [12], inShort: false,
    speakerNotes: "Anticipate questions. How different from Qualtrics? We GO and GET data — they organize what you have. What does $500K buy? Revenue in 90 days. Long-term moat? Data flywheel + system-of-record lock-in." },
  { id: "cta", title: "Let's Talk", lengths: [8, 12], inShort: true,
    speakerNotes: "Close strong. 'We're not asking you to believe in AI research. We're asking you to back the team that's already proving it.' Leave contact info visible." },
];

export function getSlidesForLength(length: DeckLength): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.lengths.includes(length));
}

export function getShortSlides(): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.inShort);
}

export const DECK_LENGTHS: DeckLength[] = [8, 12];
