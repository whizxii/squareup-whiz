
## What Needs to Change — and Why

There are two distinct problems to fix:

**Problem 1: HowItWorksSection — wrong narrative**
The current flow `Brief → AI interviews → Insight Brief` describes the MVP only. It misses the core product truth: insights are **routed to the right team automatically** (Growth gets their brief, Product gets their brief, Founders get their brief). It also misses the "Lego blocks" product vision — each release adds a new block that makes customer intelligence stronger and easier to consume.

**Problem 2: MarketSection — inconsistent with global vision**
The market section still shows only India numbers. The bar chart tooltip says `₹${v}Cr ARR` and the chart label says "India SOM capture (₹Cr)". This contradicts the India-first, built-for-world narrative. The section needs the two-layer model: India beachhead (credible bottoms-up) + global expansion (the real prize).

---

## Changes

### 1. HowItWorksSection.tsx — Full rewrite

**New headline:**
```
Brief → AI Interviews → Routed Insights.
Each team gets their brief. No coordination. No noise.
```

**New 4-step flow** (expand from 3 to 4 steps to show the routing layer):

| Step | Title | Sub | Body |
|---|---|---|---|
| 01 | Brief | You define the decision | Tell us what you're trying to decide. Segment to target, product to launch, CX gap to fix. We screen and recruit the right respondents. Zero coordination on your end. |
| 02 | Interview | AI runs every conversation | Our AI interviews respondents — probing naturally, following threads, adapting in real time. No moderator. No scheduling. Depth that surveys never reach, at cents per interview. |
| 03 | Synthesise | Signal, not transcripts | Every conversation is processed automatically. Severity scores, risk flags, verbatim quotes, validated patterns. No manual analysis. No research homework for your team. |
| 04 | Route | Right brief, right team | Growth gets their campaign pointers. Product gets their launch risks. Founders get the full picture. Each team gets what's relevant — nothing more, nothing less. |

**Below the steps — add a "Platform Vision" callout strip:**
This is where the Lego blocks concept lives. A single highlighted banner that says:

> **Built to grow with you.** Each new block makes your customer intelligence stronger — AI Copilot for your own interviews, automatic call processing, always-on synthesis. One platform. Every signal. Routed to whoever needs to act.

The strip should use the orange accent border and sit visually below the 4 cards.

**Technical note:** 
- Grid changes from `grid-cols-3` to `grid-cols-2 lg:grid-cols-4` for the 4 steps
- Connector lines update: `i < 3` instead of `i < 2`
- STEPS array expands to 4 entries
- Add a "Synthesise" step with icon `⚡` (no avatar)
- Keep existing card design, just update content + count

---

### 2. MarketSection.tsx — Two-layer model

**New headline:**
```
India is the beachhead. The problem is everywhere.
```

**New sub-copy:**
> We sized India bottoms-up — not from an analyst report. ~4,000 mid-market consumer brands, ₹40L/yr average research spend. That's ₹16,000Cr in India alone. The same ICP exists in SEA, MENA, and every market where consumer brands outgrow gut feel.

**Left column — India beachhead (keep existing design, update copy):**

| Label | Value | Sub |
|---|---|---|
| ~4,000 mid-market Indian consumer brands | ~₹16,000Cr | TAM — avg ₹40L/yr research spend each (bottoms-up) |
| Brands actively buying qual research today | ~₹4,000Cr | SAM — ~25% currently outsource to agencies |
| Metro brands, ₹100–500Cr revenue, agency-ready | ~₹800Cr | SOM — initial ICP: high urgency, fast to close |
| **5% SOM capture by Yr 3** | **~₹40Cr ARR** | ~$5M — India proof, seed-fundable |

**Right column — replace bar chart with Global Expansion table:**
A styled 4-row table showing geographic rollout. Much more compelling for a global product than an India-only ARR bar:

| Market | Mid-market brands | Est. research spend | Status |
|---|---|---|---|
| 🇮🇳 India (beachhead) | ~4,000 | ~₹16,000Cr | Proving now |
| 🌏 SEA (Indonesia, Vietnam, Thailand) | ~6,000 | ~$1.2B | Yr 2–3 |
| 🌍 MENA (UAE, Saudi, Egypt) | ~3,500 | ~$800M | Yr 3–4 |
| 🌐 Global mid-market (ex-China) | ~50,000+ | ~$18B+ | Series B |

Each row has a status badge (orange pill for "Proving now", subtle for others).

**Below the two columns — keep the ARR bar chart**, but update it to show the India → Global arc:

```
BAR_DATA updated to $M values:
Yr 1: $0.5M  (India only — first 5 paying brands)
Yr 2: $1.5M  (India traction + SEA pilot)
Yr 3: $4M    (India + SEA)
Yr 4: $10M   (India + SEA + MENA)
Yr 5: $25M   (Multi-market, Series B territory)
```

Chart label: `SquareUp ARR trajectory — India → Global ($M)`
Tooltip: `$${v}M ARR`

**Footer callout (update):**
> $20B+ global market. We're starting with the hardest 10%.
> India is the proving ground. SEA and MENA are the prize. Global mid-market is the endgame.

---

## Files to Edit

1. `src/components/pitch/sections/HowItWorksSection.tsx` — New 4-step flow, routing narrative, Lego blocks callout
2. `src/components/pitch/sections/MarketSection.tsx` — Two-layer market model, global expansion table, updated ARR chart

No other files need to change. The WhoIsItForSection, SolutionSection, and AIDemoSection are unaffected.
