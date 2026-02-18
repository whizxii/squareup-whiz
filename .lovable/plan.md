
# Full Deck Redesign — Audit + UI Elevation Plan

## What the Product Screenshots Tell Us

The actual SquareUp product (almost.joinsquareup.com) uses:
- Clean white/off-white backgrounds with subtle borders
- 3D clay avatars with transparent backgrounds, softly placed (no harsh cutouts)
- Orange as the only accent — used sparingly on badges, CTAs, active states
- Tight card layouts with generous whitespace inside
- Uppercase tracking labels (e.g. "CAMPAIGN STRATEGY MAP", "REAL-TIME ENGAGEMENT MATRIX")
- Small, precise body text — never paragraphs
- The avatar style in the product is 3D illustrated figures on transparent/white backgrounds

The pitch deck must match this visual standard. Currently it reads like a document. The screenshots confirm the product is premium — the deck must match.

---

## Scope of Changes — 10 Files

Changes are grouped by priority and impact:

### CRITICAL (dark → light conversions)
1. `WhyNowSection.tsx` — dark bg → light, cut body copy, remove watermarks
2. `TheAskSection.tsx` — dark bg → light, update all text colors

### HIGH IMPACT (copy density + narrative fixes)
3. `SolutionSection.tsx` — cut from 6 rows to 4 best rows each
4. `ProblemSection.tsx` — cut root cause bodies to 1 sentence, fix attribution
5. `CostSection.tsx` — remove duplicate pull quote (identical to Problem blockquote)
6. `TractionSection.tsx` — simplify LOI banner, fix logo placement text
7. `FAQSection.tsx` — cut from 9 to 6 items, reframe 1 question

### MODERATE (polish + consistency)
8. `HeroSection.tsx` — shorten pill, upgrade social proof to stat chips
9. `TeamSection.tsx` — rewrite bios, cut "lean by design" line
10. `BusinessModelSection.tsx` — fix "hooked" word, cut subscription to 3 bullets

---

## File-by-File Changes

### 1. `WhyNowSection.tsx` — Dark → Light + Density Cut

**Background**: `hsl(var(--sq-dark))` → `hsl(var(--sq-off-white))`

**Text color updates**:
- `text-white` headline → `color: hsl(var(--sq-text))`
- `rgba(255,255,255,0.4)` sub → `color: hsl(var(--sq-muted))`
- Card backgrounds `rgba(255,255,255,0.04)` → `hsl(var(--sq-card))`
- Card borders `rgba(255,255,255,0.08)` → `hsl(var(--sq-subtle))`
- `text-white` pillar title → `hsl(var(--sq-text))`
- `rgba(255,255,255,0.5)` body → `hsl(var(--sq-muted))`
- `rgba(255,255,255,0.3)` stat label → `hsl(var(--sq-muted))`

**Remove**: The large watermark ghost numbers (`text-[7rem]`) — visual noise at this density

**Cut each pillar body to 1 sentence (max 15 words)**:
- Pillar 01 body: `"GPT-4-class models probe and synthesise at human depth. The technology arrived in 2024."`
- Pillar 02 body: `"CAC is rising. Teams at Zepto, Swiggy, Meesho launch on dashboards and gut feel."`
- Pillar 03 body: `"6–8 weeks. ₹30–50L. Findings arrive after the decision was already made."`

**Headline stays** — it's strong.

---

### 2. `TheAskSection.tsx` — Dark → Light

**Background**: `hsl(var(--sq-dark))` → `hsl(var(--sq-off-white))`

**Text color updates (systematic)**:
- `text-white` in `h2` → `color: hsl(var(--sq-text))`
- `rgba(255,255,255,0.4)` sub-copy → `hsl(var(--sq-muted))`
- `text-white` fund labels → `hsl(var(--sq-text))`
- `rgba(255,255,255,0.08)` fund bar backgrounds → `hsl(var(--sq-subtle))`
- `rgba(255,255,255,0.35)` fund detail text → `hsl(var(--sq-muted))`
- Card backgrounds `rgba(255,255,255,0.04)` → `hsl(var(--sq-card))`; borders → `hsl(var(--sq-subtle))`
- `text-white` milestone labels → `hsl(var(--sq-text))`
- `rgba(255,255,255,0.4)` milestone sub → `hsl(var(--sq-muted))`
- `text-white` moat titles → `hsl(var(--sq-text))`
- `rgba(255,255,255,0.35)` moat body → `hsl(var(--sq-muted))`

**Moat bullet fix**: Remove "Not replicable" from Mesa bullet → `"Warm access across Mesa's portfolio, cohort, and LP companies."`

**The `$500K` animated counter**: Orange stays — it's the anchor. Just ensure the surrounding text is dark, not white.

---

### 3. `SolutionSection.tsx` — Cut to 4 Rows + Fix Wedge

**Current**: 6 items per column (now 7 with the new accountability rows)

**Cut to 4 items per column** — keep the sharpest, lead with accountability:

WITHOUT column (keep these 4):
1. `No trail` — decisions made on calls, no record of why
2. `Gut feel` — drives go/no-go at most brands
3. `6–8 weeks` — to get research you can trust
4. `₹30–50L` — for a research agency, if you can afford one

WITH column (keep these 4):
1. `Full audit trail` — every decision tied to verbatim quotes and severity scores
2. `Real signal` — from AI-led conversations, not internal guesses
3. `7 days` — Insight Brief on your desk
4. `₹1–3L` — fraction of a traditional firm

**Wedge callout copy** (line 94):
Current: `"Every other tool organizes feedback you already have."`
New: `"Every decision, traceable. Every team gets their brief."`

Sub: `"Growth gets campaign pointers. Product gets launch risks. Founders get the full picture."`

---

### 4. `ProblemSection.tsx` — Cut Body Copy + Fix Attribution

**Root cause bodies** — cut each from 2 sentences to 1 (max 12 words):
- 01: `"Coordinating 10 calls takes a full week. Most teams stop before they start."`  
  → `"Coordinating 10 customer calls takes a week. Teams give up."`
- 02: `"Hours of audio sit unlistened. The insight is there — inaccessible."`
- 03: `"Calls, tickets, reviews, socials — all disconnected. Decisions happen in the dark."`

**Blockquote attribution** — remove founder self-reference:
Current: `"— Param & Kunj, SquareUp founders, after 90 days of discovery"`
New: `"— 50+ leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods"`

---

### 5. `CostSection.tsx` — Remove Duplicate Pull Quote

**Remove the entire `<blockquote>` + avatar block** (lines 91–104) — it's near-identical to the Problem section's blockquote. The same quote appearing twice in consecutive sections undermines credibility.

The before/after card layout is clean and the header is sharp — keep those. The section ends after the two cards.

---

### 6. `TractionSection.tsx` — LOI Banner + Logos Fix

**LOI banner**: Remove the defensive second line.
Current: `"Not 'interested.' Not 'piloting.' Committed."`  
Delete this line — the banner reads `"3 Letters of Intent. Signed."` alone. Silence is more confident.

**Logos label**: 
Current: `"Brands whose leaders shaped what we built"`  
New: `"Discovery conversations with leaders at"`

---

### 7. `FAQSection.tsx` — Cut from 9 to 6 Items

**Remove these 3 items**:
- `"Who writes the code?"` — not an investor-level question at seed
- `"What's your current traction?"` — fully covered in the Traction section
- `"No revenue yet — why should I invest?"` — reframe instead (see below)

**Keep these 6 in this order**:
1. How are you different from Qualtrics or Dovetail?
2. What does the $500K actually buy?
3. What does first revenue look like? *(reframed from "No revenue yet")*
4. What's the long-term moat?
5. How do you go-to-market?
6. Can I see the product now?

**Reframed Q3**:
- Q: `"What does first revenue look like?"`
- A: `"3 LOIs converted to paying customers in 90 days. First case studies published with real brand names. That's the plan for this seed round — proof of willingness to pay, not just intent."`

---

### 8. `HeroSection.tsx` — Status Pill + Social Proof

**Status pill**: 
Current: `"Built in India · Built for the World · Seed Round 2026"` (3 things)
New: `"India-first · Seed Round 2026"` (2 things, cleaner)

**Social proof** (line 91):
Current: `<p className="text-white/20 text-xs ...">`
Upgrade to 3 orange stat chips in a `flex` row above the CTAs:

```
[<90 days — Idea to LOI] [50+ Leaders Interviewed] [MVP Live]
```

Each chip: small rounded pill, `background: hsl(var(--sq-orange)/0.1)`, `border: 1px solid hsl(var(--sq-orange)/0.2)`, `color: hsl(var(--sq-orange))`, `font-bold text-xs`.

**Sub-copy**: Cut the parenthetical tangent on line 60:
Remove: `<span className="text-white/35 text-base"> Starting with India's most demanding consumer brands. Designed to scale globally.</span>`

---

### 9. `TeamSection.tsx` — Rewrite Bios + Cut Bottom Callout

**Param bio**:
Current: `"Former Tech Lead at EA Sports. Shipped products at scale. Most painful failure: 6 months of build, no customer truth. That's why SquareUp exists."`
New: `"Former Tech Lead at EA Sports. Shipped products at scale. Built SquareUp's AI interview engine — voice to synthesis to Insight Brief."`

**Kunj bio**:
Current: `"Builds in consumer and ops-heavy environments. Architects the automation layer that takes SquareUp from voice agent to Insight Brief — end-to-end."`
New: `"Consumer and ops environment builder. Owns end-to-end workflow: screening, calling, synthesising, routing briefs to the right teams."`

**Bottom callout**: Remove the last sentence of the `<p>` tag:
Remove: `"Lean by design, not by default."`
Keep: `"Two founders. No team. No overhead. Build and sell — that's the entire playbook until we have proof. We met at Mesa, took a year off to build full-time, and shipped an MVP in 15 days."`

---

### 10. `BusinessModelSection.tsx` — Fix "Hooked" + Cut Bullets

**Headline** (line 24-25):
Current: `"Entry at ₹1–3L per study. Subscription once they're hooked."`
New: `"Entry at ₹1–3L per study. ₹75K–1.5L/month once they're in."`

**Subscription bullets** — cut from 5 to 3 (keep highest signal):
1. `"Ongoing signal across campaigns, launches, and CX"`
2. `"Monthly executive debrief — routed to each team"`
3. `"Data flywheel: every conversation trains our models"`

Remove these 2:
- `"Calls, tickets, reviews, socials — unified"` (too much detail for a pitch)
- `"Full team access + workflow integration"` (implied by subscription)

---

## Design System — Unified Rules (to apply across all edits)

**Backgrounds (interior slides only)**:
- Alternating `hsl(var(--sq-off-white))` and `hsl(var(--sq-card))` (pure white)
- Hero: stays `sq-dark` — intentional bookend
- CTA: stays `sq-dark` — intentional bookend
- WhyNow + TheAsk: **must become light** (this plan's primary fix)

**Typography**:
- Section labels: `font-bold text-xs uppercase tracking-[0.2em]` in `sq-orange` ✓
- H2s: `font-black` with `tracking-tight` ✓
- Body: 1 sentence max per point, `text-sm`, `sq-muted`
- Stats: `font-black`, `sq-orange` or `sq-amber`

**Cards**:
- `rounded-2xl` or `rounded-3xl`
- `background: hsl(var(--sq-card))` or `hsl(var(--sq-off-white))`
- `border: 1px solid hsl(var(--sq-subtle))`
- `p-6` or `p-7` internal padding

**Avatars** (already correct in avatars/*.tsx):
- PNG with transparent background — treated as softly placed illustrations
- No harsh drop shadows — use only subtle scale/opacity for hover
- Sizes: 140–220px for supporting roles, 280–320px for hero/anchor positions

**Stat chips for Hero social proof**:
```
background: hsl(var(--sq-orange) / 0.08)
border: 1px solid hsl(var(--sq-orange) / 0.2)  
color: hsl(var(--sq-orange))
border-radius: 9999px
padding: 4px 12px
font-bold text-xs
```

---

## What Does NOT Change

- `HowItWorksSection.tsx` — already updated, content is correct
- `MarketSection.tsx` — already updated with two-layer model
- `AIDemoSection.tsx` — best section, leave entirely
- `LandscapeSection.tsx` — matrix is correct, competitive table is good
- `WhoIsItForSection.tsx` — persona cards are clean
- `CTASection.tsx` — dark bg intentional as closer, copy is sharp
- `Nav.tsx` — no changes
- `PresenterMode` — no changes
- All avatar components — already correct

---

## Summary Table

| File | Change | Impact |
|---|---|---|
| `WhyNowSection.tsx` | Dark → light bg, cut body copy, remove watermarks | Critical |
| `TheAskSection.tsx` | Dark → light bg, update all text colors, fix Mesa moat copy | Critical |
| `SolutionSection.tsx` | Cut to 4 rows each, new wedge callout copy | High |
| `ProblemSection.tsx` | 1-sentence bodies, fix attribution | High |
| `CostSection.tsx` | Remove duplicate pull quote | High |
| `TractionSection.tsx` | Remove defensive LOI line, fix logo label | Moderate |
| `FAQSection.tsx` | Cut to 6 items, reframe 1 question | Moderate |
| `HeroSection.tsx` | Shorter pill, stat chips | Moderate |
| `TeamSection.tsx` | Rewrite bios, cut cliché line | Moderate |
| `BusinessModelSection.tsx` | Fix "hooked", cut 2 subscription bullets | Low |
