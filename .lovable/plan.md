
## SquareUp Investor Pitch Website — Full Implementation Plan

This is the complete build from scratch. Blank slate → world-class seed pitch. Everything below is decided, specific, and ready to implement.

---

### What's Being Built

A scroll-driven investor pitch website with:
- **Detailed Mode** — Full narrative scroll experience (default)
- **Presenter Mode** — Full-screen 1920×1080 scaled slideshow (keyboard nav, animations, PDF export)
- **5 slide length configs** — 5, 8, 10, 12, 15 slides
- **PDF export** — per length, per mode
- **Premium clay-style avatar illustrations** — SVG, brand-consistent, placed strategically (not decoratively)

---

### Design System (added to `index.css`)

```css
:root {
  --sq-dark: #0D0D0D;
  --sq-off-white: #F7F6F2;
  --sq-orange: #FF6B35;
  --sq-amber: #FFAA4D;
  --sq-text: #1A1A1A;
  --sq-muted: #4A4A4A;
  --sq-card: #FFFFFF;
  --sq-subtle: #F0EFE9;
}
```

Fonts: `font-black` (900) for headlines, `font-bold` (700) for subheads, `font-normal` for body. Tight tracking on all headlines.

---

### File Structure

```
src/
  assets/
    Param.png
    Kunj.png
    su_wordmark.png
    su_logo.png
    su_logo.gif
    su_wordmark.gif
  components/
    pitch/
      Nav.tsx
      sections/
        01_HeroSection.tsx
        02_ProblemSection.tsx
        03_CostSection.tsx
        04_ToolsGapSection.tsx
        05_SolutionSection.tsx
        06_HowItWorksSection.tsx
        07_AIDemoSection.tsx
        08_WhoIsItForSection.tsx
        09_WhyNowSection.tsx
        10_TractionSection.tsx
        11_LandscapeSection.tsx
        12_MarketSection.tsx
        13_BusinessModelSection.tsx
        14_TeamSection.tsx
        15_TheAskSection.tsx
        16_FAQSection.tsx
        17_CTASection.tsx
      avatars/
        AvatarOverwhelmed.tsx
        AvatarNPDManager.tsx
        AvatarGrowthLead.tsx
        AvatarCXLead.tsx
        AvatarAIAgent.tsx
        AvatarFounders.tsx
      presenter/
        PresenterMode.tsx
        SlideControls.tsx
        ScaledSlide.tsx
    ui/ (existing)
  lib/
    slides.ts
    pdfExport.ts
    useScrollAnimation.ts
  pages/
    Index.tsx
  App.tsx
```

---

### Avatar Design Specifications

All avatars: 3D clay-style SVG. Rounded forms, warm skin tone (#E8C4A0 base), orange-dominant clothing (#FF6B35), white accents, subtle drop shadow for 3D depth. Expressive but not gimmicky. Each communicates role and pain instantly.

#### 1. `AvatarGrowthLead.tsx` — "Growth / Marketing Lead"
**Description:** Woman in an orange blazer, confident posture, leaning slightly forward toward a floating bar chart. The chart has an arrow going up but then flatlining — signaling uncertainty about which lever drove growth. She has a thoughtful, analytical expression — not stressed, but clearly evaluating. Hair pulled back, professional. Floating elements: a small bar chart (bars in gray/orange), a tiny magnifying glass icon hovering near the chart. Background shadow circle (clay-style ground shadow).

**Pain statement on card:** *"Running campaigns blind. Which segment actually drove that lift?"*

**Placement:** Who It's For section, first card (desktop: left).

---

#### 2. `AvatarNPDManager.tsx` — "NPD / Product Manager"
**Description:** Man in an orange shirt, standing with arms slightly open as if weighing options. Behind him: a large closed vault door (dark gray, round handle). In his hands: a product box (simple rectangular box, orange with a question mark on it). Expression: cautious, considering — the "should I commit?" face. Suggests the weight of a go/no-go call on a new product. Slight 3D shadow beneath him.

**Pain statement on card:** *"6 months of dev on the line. Real signal or intuition?"*

**Placement:** Who It's For section, second card (desktop: center).

---

#### 3. `AvatarCXLead.tsx` — "CX / Customer Experience Lead"
**Description:** Woman in an orange top, seated at a desk with a calm but focused expression — not overwhelmed, not serene — she's *ready to act* but lacks the clarity to do so. Around her: floating speech bubbles in varying sizes (representing tickets/reviews/calls) — some faded gray (noise), one highlighted in orange (the signal she's hunting for). She's holding a small funnel icon, filtering through the bubbles. This conveys: the signal exists, but extracting it is the problem.

**Pain statement on card:** *"100 tickets. One real problem. Can't find it fast enough."*

**Placement:** Who It's For section, third card (desktop: right).

---

### ICP Personas — Revised Framing

The section headline and all body copy avoids D2C specificity. Consumer brand language only.

**Section headline:** *"Built for the teams where being wrong costs the most."*

**Sub-line:** *"Whether you're a QSR chain, a D2C brand, or a consumer platform — the problem is the same."*

Three cards — each with avatar + role title + pain statement + what SquareUp gives them:

| Card | Role Title | Pain Statement | SquareUp Outcome |
|---|---|---|---|
| 1 | Growth / Marketing Lead | "Running campaigns blind. Which segment actually drove that lift?" | "Know your highest-value cohort before the next campaign drops." |
| 2 | NPD / Product Manager | "6 months of dev on the line. Real signal or intuition?" | "Validate before you commit. Catch wrong assumptions in week 1, not month 6." |
| 3 | CX / Experience Lead | "100 tickets. One real problem. Can't find it fast enough." | "Surface the #1 fix your leadership needs to hear — backed by real customer voice." |

---

### Why Now — Revised Copy (Broad, Consumer Brand)

**Section headline:** *"Three forces converging. Right now."*

Three pillars (staggered scroll reveal):

**Pillar 1 — 🤖 AI crossed the threshold**
LLMs can now conduct human-quality interviews at scale, at cents per conversation. The technology to make this possible didn't exist 2 years ago. The window just opened.

**Pillar 2 — 💸 Teams are making ₹10Cr decisions with ₹0 of real customer signal**
CAC is rising. Budgets are tighter. Consumer brands across QSR, platforms, and direct channels are scaling faster than their customer understanding can keep pace. One wrong launch doesn't just fail — it burns runway and credibility.

**Pillar 3 — 🐢 Research firms are being disrupted**
6–8 week timelines. $50K+ price tags. Findings that arrive after the decision was already made. The old model of outsourcing customer understanding is incompatible with how fast consumer brands need to move.

*(No "D2C" mentioned anywhere in this section. "Consumer brands" is the universal framing.)*

---

### Traction Timeline — "Pace of an AI-Native Company"

Based on confirmed data: **Dec start → Jan discovery → Jan MVP → Feb LOIs**

The timeline renders as a horizontal animated progress bar (orange fill, animates on scroll entry). Each milestone appears as a labeled dot that pops in sequentially.

```
Dec 2025          Jan 2026           Jan 2026          Feb 2026
    ●─────────────────●─────────────────●────────────────●
  Started           50+ Customer      MVP v1           3 LOIs
  SquareUp          Conversations     Shipped          Signed
                    (Leaders at       in 15 Days
                    Zepto, Swiggy,
                    Meesho, Titan...)
```

**Section framing above the timeline:**
*"From idea to paying design partners — in under 90 days."*

**Below the timeline — four animated counters:**
- `<90` days — idea to LOI
- `50+` leaders interviewed
- `15` days to ship MVP v1
- `3` LOIs signed

**Why this works for investors:** Pace is the #1 signal at seed for an AI-native company. Four data points (discovery speed, build speed, LOI speed, interview volume) all in one section tell the story of velocity without needing revenue. The 15-day MVP is a standout credibility moment.

**Mesa + Elevation Capital trust badge** below the counters.

**Company logo strip** (grayscale): Zepto, Meesho, Swiggy, Titan Consumer, Rebel Foods, Swish — with label: *"Brands whose leaders helped shape SquareUp."*

---

### Slide Registry (slides.ts)

Master list of 15 slides with their section components and which length configs include them:

| # | Section | 5 | 8 | 10 | 12 | 15 |
|---|---|---|---|---|---|---|
| 1 | Hero | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | Problem | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | Solution | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | Traction | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | Ask + CTA | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | Why Now | | ✓ | ✓ | ✓ | ✓ |
| 7 | Market | | ✓ | ✓ | ✓ | ✓ |
| 8 | Team | | ✓ | ✓ | ✓ | ✓ |
| 9 | How It Works | | | ✓ | ✓ | ✓ |
| 10 | Landscape | | | ✓ | ✓ | ✓ |
| 11 | AI Demo | | | | ✓ | ✓ |
| 12 | Who It's For | | | | ✓ | ✓ |
| 13 | Cost of Blindness | | | | | ✓ |
| 14 | Tools Gap | | | | | ✓ |
| 15 | Business Model | | | | | ✓ |

FAQ section appears only in Detailed scroll mode (not in Presenter slides).

---

### Presenter Mode Architecture (1920×1080 Scaled)

Built exactly per the slides-app architecture spec:

**`ScaledSlide.tsx`** — renders any slide at 1920×1080, scales via `Math.min(scaleX, scaleY)` transform to fit viewport. Absolutely positioned, centered. Used in both editor thumbnails and full presenter view.

**`PresenterMode.tsx`** — fullscreen shell, black background, keyboard nav (← →, Space, Escape to exit), hides cursor after 3s inactivity, slide counter, progress dots.

**Slide transitions in Presenter mode:**
- `scale(0.96) + opacity: 0` → `scale(1.0) + opacity: 1`
- 350ms ease-out
- Number counters and charts re-animate on each slide entry (Recharts `key` prop reset trick)
- AI Demo typewriter restarts on slide entry

**Toolbar (bottom of presenter):**
- ← → nav buttons + keyboard
- `3 / 10` counter + slide title
- Length pills: `5 · 8 · 10 · 12 · 15`
- `⬇ PDF` button
- `✕ Exit`

**Each section component** accepts `mode: 'detailed' | 'presenter'` prop — in presenter mode: larger font scale (1.4×), centered layout, removed decorative margin elements, avatar scales up to fill vertical space.

---

### PDF Export (pdfExport.ts)

Using `html2canvas` + `jsPDF`:

- **Detailed mode:** `⬇ Export PDF` in nav → captures all visible scroll sections → multi-page PDF
- **Presenter mode:** `⬇ Export Slides` → captures each slide at 1920×1080 (one slide per PDF page, landscape)
- Filename: `SquareUp_Pitch_[N]_Slides_2026.pdf`
- Loading state: spinner overlay + `"Preparing your deck..."` toast
- Only slides in the currently selected length are exported

Packages to install: `html2canvas`, `jspdf`

---

### AI Demo Section — Typewriter Mock

Split dark panel:

**LEFT — Chat interface** (messages appear sequentially, 800ms between, 40ms/char typewriter):
```
🤖 SquareUp AI:
"Walk me through the last time your team launched something new."

👤 Customer:
"We did a big push in Q3. Took 4 months to build."

🤖 SquareUp AI:
"What did you wish you'd known before you committed to it?"

👤 Customer:
"Honestly? That our target group doesn't shop the way we assumed."

🤖 SquareUp AI:
"When you made that call — what data did you actually have?"

👤 Customer:
"Internal metrics. Some gut feel. That's about it."

🤖 SquareUp AI:
"What would different data have changed for you?"
```

**RIGHT — Live Insight Extraction** (synced to conversation progress):
- After msg 2: Sentiment → `Cautious 71%`
- After msg 4: Key quote card → *"Target group doesn't shop the way we assumed"* — Severity: `High 8.3/10`
- After msg 6: Risk flag → `Assumption: Purchase Behaviour. Status: Unvalidated ⚠`
- Final: *"3 critical risks identified. Insight Brief ready."* → orange CTA

CTA below: `"See the Full Demo →"` → `almost.joinsquareup.com`

---

### Section-by-Section Full Build List

**01 Hero (Dark `#0D0D0D`)**
- `su_logo.gif` centered, 100px
- Orange pill: `"AI Customer Intelligence · Seed Round 2026"`
- H1 font-black white 72px: `"Stop Building on Intuition."`
- Sub 24px gray: `"SquareUp turns customer conversations into decision-grade intelligence — in 7 days, not 7 weeks."`
- CTA pair: `Watch Demo →` (ghost) + `Book a Meeting` (orange fill → `mailto:hello@joinsquareup.com`)
- Background: two animated CSS radial orange blobs, 8% opacity, 12s + 17s drift keyframes
- Bouncing chevron scroll indicator

**02 Problem (Light `#F7F6F2`)**
- H2: `"Every brand says they talk to customers. Almost none do it enough to matter."`
- 3 pain cards (staggered 150ms): Scheduling, Insights rot, Data silos
- Consequence orange bold: `"So decisions default to intuition. And intuition scales poorly."`
- Right: `AvatarOverwhelmed` — woman, orange outfit, floating Slack/Sheets/Notion icons

**03 Cost of Building Blindly (Light)**
- H2: `"One wrong launch. Months of runway gone."`
- Pull quote (left orange border): *"50+ leaders. Zepto, Meesho, Swiggy, Titan Consumer, Rebel Foods. Same story, every time."*
- Before/After split: red-tinted LEFT (intuition → failed), orange-tinted RIGHT (SquareUp → protected)
- `AvatarNPDManager` small bottom-right

**04 Tools Gap (Light)**
- H2: `"There is no system to turn conversations into decision-grade data at scale."`
- 4 cards → Decision Void center → SquareUp card slides in with orange glow

**05 Solution (Light)**
- H2: `"A decision-risk reduction layer for consumer brands."`
- Without/With animated card pair + orange arrow
- Precise paragraph
- Pulsing `su_logo.png` watermark

**06 How It Works (Light)**
- H2: `"From raw conversation to boardroom-ready insight — in 7 days."`
- 3 steps, sequential reveal, orange number pills
- Step 1 Map, Step 2 Conversate (`AvatarAIAgent`), Step 3 Decide (`AvatarGrowthLead` at report)

**07 AI Demo (Dark card panel)**
- Interactive typewriter split panel
- `"See the Full Demo →"` → `almost.joinsquareup.com`

**08 Who It's For (Light)**
- H2: `"Built for the teams where being wrong costs the most."`
- Sub: `"Whether you're a QSR chain, a D2C brand, or a consumer platform — the problem is the same."`
- 3 persona cards with `AvatarGrowthLead`, `AvatarNPDManager`, `AvatarCXLead`
- Hover: +4px lift + deeper shadow
- Orange gradient header strip per card

**09 Why Now (Light)**
- H2: `"Three forces converging. Right now."`
- 3 pillars with faded orange background numbers (01, 02, 03)
- Broad consumer brand framing — no D2C mention

**10 Traction (Light)**
- H2: `"From idea to LOI — in under 90 days."`
- 4 animated counters: `<90` days, `50+` interviews, `15` day MVP, `3` LOIs
- Animated orange milestone timeline: Dec → Jan (50+ convos) → Jan (MVP) → Feb (3 LOIs)
- Orange LOI callout badge: `"3 Design Partners. Letters of Intent Signed."`
- Grayscale logo strip
- Mesa + Elevation Capital trust badge

**11 Landscape (Light)**
- H2: `"Everyone organizes feedback. Nobody generates it."`
- SVG 2×2 matrix: competitors cluster bottom-left, SquareUp glowing top-right with ping animation

**12 Market (Light)**
- H2: `"A $142B industry ready for disruption."`
- Recharts animated pie + bar side by side
- Bold callout: `"0.5% = $710M."`

**13 Business Model (Light)**
- 2 pricing cards: Deep Dive + Subscription (recommended, orange border)

**14 Team (Light)**
- H2: `"Built by people who've been burned by this problem."`
- Param.png + Kunj.png circular crops, orange ring borders
- LinkedIn links, Mesa badge
- Origin story: Mesa School, 7 months

**15 Ask (Light → Dark)**
- H2: `"Raising $500K to turn pilots into a repeatable engine."`
- Animated count-up `$500K` orange
- 50/40/10 use of funds
- Moat callout box (orange border): data flywheel + workflow lock-in + Mesa VC network distribution

**16 FAQ (Light)**
- 9-question Radix Accordion, verbatim YC answers

**17 CTA (Dark `#0D0D0D`)**
- `su_logo.gif`
- H2: `"Curious? Let's talk."`
- `Book a Meeting` (orange, Calendly placeholder) + `Email Us` (`mailto:hello@joinsquareup.com`)
- Footer: joinsquareup.com · © 2026 SquareUp

---

### Navigation

Fixed sticky, always visible:
- `su_wordmark.png` left — white version on dark, dark version on light sections (using `mix-blend-mode` or separate assets)
- Center: `Detailed | Presenter` mode pill toggle
- Right: `Book a Meeting` orange pill
- Top of viewport: 2px orange reading progress bar (scroll %)
- Mobile: hamburger → slide-in drawer, all section anchors + mode toggle

---

### Packages to Install

- `html2canvas` — screenshot sections for PDF
- `jspdf` — generate PDF from screenshots

Everything else uses already-installed packages: Recharts, Radix UI (Accordion), Lucide React (icons), React Router.

---

### Implementation Order

1. `index.css` — design system tokens
2. Install `html2canvas` + `jspdf`
3. Copy all 6 uploaded assets to `src/assets/`
4. Build all 6 avatar SVG components
5. Build all 17 section components (Detailed mode)
6. `Nav.tsx` with progress bar + mode toggle
7. `Index.tsx` composing full scroll page
8. `slides.ts` — slide registry + 5 length configs
9. `ScaledSlide.tsx` + `PresenterMode.tsx` + `SlideControls.tsx`
10. `pdfExport.ts` + export buttons wired up
11. Mobile responsive pass across all sections
12. Final animation polish + Presenter mode transition tuning
