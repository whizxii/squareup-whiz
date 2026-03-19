import { StudyFixture } from "./types";

export const goldenDemo: StudyFixture = {
  study: {
    id: "titan-skinn-001",
    title: "Titan Skinn — New Fragrance Concept Research",
    brandName: "Titan Skinn",
    category: "fragrances",
    industry: "Personal Care",
    targetAudience: "Men 21-35, metro India, mid-to-premium fragrance buyers",
    decisionObjective:
      "Decide whether to position the new fragrance as 'everyday confidence' or 'occasion wear'",
    stakeholder: "Brand Manager",
    whatChanges: "Positioning strategy, pricing tier, and launch messaging",
    objectives: [
      {
        id: "obj-1",
        title: "Understand current fragrance habits and brand associations",
        description:
          "Explore how the target audience currently uses fragrances, their daily routines, and which brands they associate with quality and identity.",
        questions: [
          {
            id: "q-1",
            text: "Walk me through your typical fragrance routine — when and how do you wear fragrance day to day?",
            followUps: [
              "Do you switch between fragrances?",
              "What triggers you to reapply?",
            ],
          },
          {
            id: "q-2",
            text: "Which fragrance brands come to mind first when you think about men's fragrances in India?",
            followUps: [
              "What makes those brands stand out?",
              "Have you tried any Indian brands?",
            ],
          },
          {
            id: "q-3",
            text: "How would you describe what Titan Skinn means to you compared to other brands you know?",
            followUps: [
              "Where did you first encounter the brand?",
              "Would you gift it or buy for yourself?",
            ],
          },
          {
            id: "q-4",
            text: "What role does fragrance play in how you feel about yourself throughout the day?",
            followUps: [
              "Does it affect your confidence?",
              "Do people around you notice?",
            ],
          },
        ],
      },
      {
        id: "obj-2",
        title: "Explore reactions to new fragrance concept and positioning",
        description:
          "Test the 'everyday confidence' vs 'occasion wear' positioning concepts and understand which resonates more with the target audience.",
        questions: [
          {
            id: "q-5",
            text: "If I told you Titan Skinn is launching a fragrance for 'everyday confidence' — what comes to mind?",
            followUps: [
              "Does that feel different from occasion wear?",
              "Would you reach for it daily?",
            ],
          },
          {
            id: "q-6",
            text: "How would you react if the same fragrance was positioned as 'for special moments' instead?",
            followUps: [
              "Which framing feels more premium?",
              "Which would you pay more for?",
            ],
          },
          {
            id: "q-7",
            text: "What would make you choose this fragrance over your current daily scent?",
            followUps: [
              "Is longevity important?",
              "What about the bottle/packaging?",
            ],
          },
          {
            id: "q-8",
            text: "Show me how you'd describe this fragrance concept to a friend who asks about it.",
            followUps: [
              "Would you recommend it?",
              "What's the one thing you'd highlight?",
            ],
          },
        ],
      },
      {
        id: "obj-3",
        title: "Identify purchase drivers and barriers in the category",
        description:
          "Understand what drives fragrance purchases, where discovery happens, price sensitivity, and what barriers prevent trial of new brands.",
        questions: [
          {
            id: "q-9",
            text: "Take me through the last time you bought a fragrance — what happened from start to finish?",
            followUps: [
              "Did you research online first?",
              "What made you pull the trigger?",
            ],
          },
          {
            id: "q-10",
            text: "What would stop you from trying a new fragrance brand, even if you were curious?",
            followUps: [
              "Is price the main barrier?",
              "Do you need to smell it first?",
            ],
          },
          {
            id: "q-11",
            text: "Where do you discover new fragrances — online, in stores, from friends, social media?",
            followUps: [
              "Do you trust influencer recommendations?",
              "Which platforms?",
            ],
          },
          {
            id: "q-12",
            text: "If this fragrance was priced at ₹799, how would that feel? What about ₹1,299?",
            followUps: [
              "What's your sweet spot?",
              "Would you buy it as a gift at that price?",
            ],
          },
        ],
      },
    ],
    interviewGuide: [], // flattened from objectives above during init
    keyDimensions: [
      { id: "dim-scent", label: "Scent preference" },
      { id: "dim-triggers", label: "Purchase triggers" },
      { id: "dim-brand", label: "Brand perception" },
      { id: "dim-price", label: "Price sensitivity" },
      { id: "dim-occasions", label: "Usage occasions" },
    ],
    decisionAreas: ["positioning", "pricing", "launch channels"],
    status: "analyzing",
    progress: { completed: 18, total: 30 },
    updatedAt: "2h ago",
  },

  respondents: [
    { id: "resp-arjun", name: "Arjun K.", age: 28, city: "Mumbai", persona: "Daily fragrance user, brand-conscious", avatarUrl: "/avatars/arjun.svg" },
    { id: "resp-rahul", name: "Rahul M.", age: 24, city: "Bangalore", persona: "Casual user, price-sensitive", avatarUrl: "/avatars/rahul.svg" },
    { id: "resp-priya", name: "Priya S.", age: 31, city: "Delhi", persona: "Buys for partner, gift-oriented", avatarUrl: "/avatars/priya.svg" },
    { id: "resp-vikram", name: "Vikram T.", age: 26, city: "Hyderabad", persona: "Fragrance enthusiast, collects", avatarUrl: "/avatars/vikram.svg" },
    { id: "resp-neha", name: "Neha D.", age: 29, city: "Pune", persona: "Marketing professional, brand-aware", avatarUrl: "/avatars/neha.svg" },
    { id: "resp-karthik", name: "Karthik R.", age: 33, city: "Chennai", persona: "Occasional user, practical", avatarUrl: "/avatars/karthik.svg" },
    { id: "resp-ananya", name: "Ananya P.", age: 25, city: "Mumbai", persona: "Social media influenced", avatarUrl: "/avatars/ananya.svg" },
    { id: "resp-rohan", name: "Rohan G.", age: 27, city: "Delhi", persona: "First-time premium buyer", avatarUrl: "/avatars/rohan.svg" },
  ],

  themes: [
    // Objective 1 themes
    {
      id: "theme-daily-routine",
      objectiveId: "obj-1",
      dimensionIds: ["dim-occasions", "dim-scent"],
      title: "Daily wear is the norm — fragrance is part of the morning routine, not saved for events",
      summary: "Most respondents apply fragrance daily as part of getting ready, not reserved for occasions. It's closer to deodorant than cologne in their minds. This is habitual behavior, not aspirational.",
      sentiment: { positive: 78, neutral: 12, negative: 10 },
      quotes: [
        { id: "quote-arjun-1", themeId: "theme-daily-routine", respondentId: "resp-arjun", text: "I put it on every morning like brushing my teeth — it's just part of getting ready for work.", dimensionId: "dim-occasions" },
        { id: "quote-vikram-1", themeId: "theme-daily-routine", respondentId: "resp-vikram", text: "I have a rotation of 3-4 but I always wear something. Going out without fragrance feels like going out without a watch.", dimensionId: "dim-occasions" },
        { id: "quote-neha-1", themeId: "theme-daily-routine", respondentId: "resp-neha", text: "My partner puts cologne on before his morning chai — it's completely automatic for him.", dimensionId: "dim-occasions" },
      ],
    },
    {
      id: "theme-dads-brand",
      objectiveId: "obj-1",
      dimensionIds: ["dim-brand"],
      title: "Titan Skinn is seen as reliable but not exciting — 'my dad's brand' perception lingers",
      summary: "Strong awareness but mixed associations. Younger respondents respect the quality but associate it with an older generation. The brand needs to feel current without losing its reliability reputation.",
      sentiment: { positive: 45, neutral: 30, negative: 25 },
      quotes: [
        { id: "quote-rahul-1", themeId: "theme-dads-brand", respondentId: "resp-rahul", text: "It's a solid brand but honestly feels like something my uncle would wear. Nothing wrong with it, just not... me.", dimensionId: "dim-brand" },
        { id: "quote-ananya-1", themeId: "theme-dads-brand", respondentId: "resp-ananya", text: "I know it's good quality but I'd want something that feels more me — more current, more Instagram-worthy.", dimensionId: "dim-brand" },
        { id: "quote-rohan-1", themeId: "theme-dads-brand", respondentId: "resp-rohan", text: "My dad uses Titan Skinn. That's exactly the problem — I respect it but I don't want to smell like my father.", dimensionId: "dim-brand" },
      ],
    },
    // Objective 2 themes
    {
      id: "theme-everyday-confidence",
      objectiveId: "obj-2",
      dimensionIds: ["dim-brand", "dim-occasions"],
      title: "'Everyday confidence' resonates strongly — it matches how they already use fragrance",
      summary: "The everyday positioning aligns with actual behavior. Respondents feel it gives permission to use premium fragrance daily instead of rationing it. This framing feels modern, personal, and empowering.",
      sentiment: { positive: 82, neutral: 12, negative: 6 },
      quotes: [
        { id: "quote-neha-2", themeId: "theme-everyday-confidence", respondentId: "resp-neha", text: "That's exactly what I want — something I don't have to save for a party. Everyday confidence feels like it's made for the real me, not the dressed-up me.", dimensionId: "dim-occasions" },
        { id: "quote-rohan-2", themeId: "theme-everyday-confidence", respondentId: "resp-rohan", text: "Everyday confidence hits different. It's saying this fragrance is for YOUR routine, not for impressing someone at a wedding.", dimensionId: "dim-brand" },
        { id: "quote-arjun-2", themeId: "theme-everyday-confidence", respondentId: "resp-arjun", text: "I'd actually pay more for something positioned as everyday premium. It means I'll use the whole bottle, not let it sit.", dimensionId: "dim-price" },
      ],
    },
    {
      id: "theme-occasion-limiting",
      objectiveId: "obj-2",
      dimensionIds: ["dim-brand", "dim-occasions"],
      title: "'Occasion wear' feels limiting and old-school — triggers the 'special bottle gathering dust' image",
      summary: "Occasion framing makes respondents think of gifted fragrances that sit unused. It contradicts their actual daily usage pattern and feels restrictive rather than aspirational.",
      sentiment: { positive: 20, neutral: 25, negative: 55 },
      quotes: [
        { id: "quote-arjun-3", themeId: "theme-occasion-limiting", respondentId: "resp-arjun", text: "I have two bottles from weddings that I've barely touched. 'Occasion wear' just means it'll collect dust on my shelf.", dimensionId: "dim-occasions" },
        { id: "quote-karthik-1", themeId: "theme-occasion-limiting", respondentId: "resp-karthik", text: "If it's only for occasions I'd never remember to use it. I go to maybe 3-4 events a year — that's not a fragrance, that's a souvenir.", dimensionId: "dim-occasions" },
      ],
    },
    // Objective 3 themes
    {
      id: "theme-longevity-driver",
      objectiveId: "obj-3",
      dimensionIds: ["dim-scent", "dim-triggers"],
      title: "Scent longevity is the #1 purchase driver — 'will it last past lunch?' is the real question",
      summary: "Across all respondents, lasting power is the single most mentioned criterion. Price and brand come second. A fragrance that fades by noon is a dealbreaker regardless of how good it smells initially.",
      sentiment: { positive: 90, neutral: 0, negative: 10 },
      quotes: [
        { id: "quote-vikram-2", themeId: "theme-longevity-driver", respondentId: "resp-vikram", text: "I don't care about the brand name if it disappears by noon. Longevity is everything — I need it to last through a full workday.", dimensionId: "dim-scent" },
        { id: "quote-rahul-2", themeId: "theme-longevity-driver", respondentId: "resp-rahul", text: "₹800 for 4 hours of scent? Not worth it. I'd rather spend ₹1,200 on something that lasts 8-10 hours.", dimensionId: "dim-price" },
      ],
    },
    {
      id: "theme-discovery-channels",
      objectiveId: "obj-3",
      dimensionIds: ["dim-triggers"],
      title: "Instagram and YouTube drive discovery, but final purchase happens offline",
      summary: "Social media creates awareness and interest, but most respondents want to smell it in person before buying. The purchase journey is digital-to-physical, not fully online.",
      sentiment: { positive: 70, neutral: 20, negative: 10 },
      quotes: [
        { id: "quote-ananya-2", themeId: "theme-discovery-channels", respondentId: "resp-ananya", text: "I see it on Instagram, get curious, then go try it at the Nykaa store or Shoppers Stop. I'd never buy fragrance without smelling it.", dimensionId: "dim-triggers" },
        { id: "quote-priya-1", themeId: "theme-discovery-channels", respondentId: "resp-priya", text: "YouTube reviews help me shortlist, but I need to smell it on skin. What works on one person smells totally different on another.", dimensionId: "dim-triggers" },
      ],
    },
  ],

  recommendations: [
    {
      id: "rec-1",
      themeIds: ["theme-everyday-confidence", "theme-daily-routine"],
      text: "Lead with 'everyday confidence' positioning in all launch creative — avoid occasion/event framing entirely",
      evidenceCount: 22,
    },
    {
      id: "rec-2",
      themeIds: ["theme-longevity-driver"],
      text: "Price the hero SKU at ₹799-899 to hit the sweet spot for daily-use willingness",
      evidenceCount: 15,
    },
    {
      id: "rec-3",
      themeIds: ["theme-discovery-channels"],
      text: "Prioritize Instagram and YouTube for awareness, but ensure strong in-store presence at Nykaa, Shoppers Stop, and metro retail",
      evidenceCount: 18,
    },
    {
      id: "rec-4",
      themeIds: ["theme-discovery-channels", "theme-longevity-driver"],
      text: "Consider a 'try before you buy' sample program to overcome the smell-first barrier",
      evidenceCount: 12,
    },
  ],

  charts: [
    {
      id: "chart-discovery",
      title: "Discovery Channels",
      type: "bar",
      items: [
        { label: "Instagram", value: 72, color: "#FF5A36" },
        { label: "YouTube", value: 65, color: "#FF5A36" },
        { label: "Friend/Family", value: 58, color: "#FF5A36" },
        { label: "In-store browsing", value: 52, color: "#FF5A36" },
        { label: "Google search", value: 38, color: "#FF5A36" },
        { label: "Nykaa/Amazon", value: 35, color: "#FF5A36" },
      ],
    },
    {
      id: "chart-positioning",
      title: "Positioning Preference",
      type: "donut",
      items: [
        { label: "Everyday confidence", value: 73, color: "#FF5A36" },
        { label: "Occasion wear", value: 15, color: "#757575" },
        { label: "Both/depends", value: 12, color: "#eae5dd" },
      ],
    },
    {
      id: "chart-price",
      title: "Price Sensitivity",
      type: "bar",
      items: [
        { label: "₹499-699", value: 18, color: "#eae5dd" },
        { label: "₹699-899", value: 42, color: "#FF5A36" },
        { label: "₹899-1099", value: 28, color: "#FF5A36" },
        { label: "₹1099+", value: 12, color: "#eae5dd" },
      ],
    },
    {
      id: "chart-drivers",
      title: "Purchase Driver Ranking",
      type: "bar",
      items: [
        { label: "Scent longevity", value: 85, color: "#FF5A36" },
        { label: "Scent profile", value: 72, color: "#FF5A36" },
        { label: "Price-value", value: 68, color: "#FF5A36" },
        { label: "Brand reputation", value: 55, color: "#FF5A36" },
        { label: "Recommendations", value: 45, color: "#FF5A36" },
        { label: "Packaging", value: 38, color: "#FF5A36" },
      ],
    },
  ],

  askYourDataResponses: [
    {
      id: "ayd-barriers",
      prompt: "What are the top barriers to trial?",
      response: "The two biggest barriers are: (1) inability to smell the product before purchase — 78% of respondents insist on trying in-store, and (2) the 'dad's brand' perception of Titan Skinn among 21-25 year olds, which makes them hesitant to be seen using it. Price is a secondary barrier, mainly among the 21-24 segment.",
      evidenceTag: "14 quotes · Obj 1, Obj 3 · age 21–25",
    },
    {
      id: "ayd-daily",
      prompt: "Show me quotes about daily usage",
      response: "Daily fragrance use is nearly universal among respondents. Arjun K. (28, Mumbai): 'I put it on every morning like brushing my teeth.' Vikram T. (26, Hyderabad): 'I have a rotation of 3-4 but always wear something.' Neha D. (29, Pune): 'My partner puts cologne on before his morning chai — it's completely automatic.'",
      evidenceTag: "8 quotes · Obj 1 · Theme: Daily routine",
    },
    {
      id: "ayd-age",
      prompt: "Which themes differ most by age?",
      response: "The biggest age-based split is on brand perception: 21-25 year olds are significantly more likely to see Titan Skinn as 'old school' (62% vs 28% of 26-35), while the older segment values reliability and is more price-sensitive. Positioning reactions are consistent across ages — everyday confidence wins in both groups.",
      evidenceTag: "11 quotes · Obj 1, Obj 2 · age split",
    },
    {
      id: "ayd-pricing",
      prompt: "Summarize reactions to pricing",
      response: "The sweet spot is ₹699-899. 42% of respondents found this range acceptable for a daily-use fragrance. Above ₹1,099, sharp drop-off — respondents expected luxury/niche brand quality at that price. Below ₹499, concerns about quality and longevity. Gift buyers (like Priya S.) were willing to go 20-30% higher.",
      evidenceTag: "9 quotes · Obj 3 · dim: Price sensitivity",
    },
  ],

  interviewTranscript: [
    { role: "ai", text: "Hi Arjun! Thanks for taking the time. I'd love to hear about your fragrance habits. Walk me through your typical routine — when and how do you wear fragrance day to day?" },
    { role: "user", text: "I usually spray some cologne after my shower every morning before work" },
    { role: "ai", text: "Got it — so it's part of your morning routine. Do you tend to stick with one fragrance or do you switch between a few?" },
    { role: "user", text: "I have maybe 2-3 bottles but I mostly reach for the same one" },
    { role: "ai", text: "That makes sense — having a go-to. What is it about that particular one that keeps you reaching for it?" },
    { role: "user", text: "Honestly it just lasts long, I don't have to reapply" },
    { role: "ai", text: "Longevity is huge — nobody wants to fade out by lunchtime. Let me ask you about brands now. Which fragrance brands come to mind first when you think about men's fragrances available in India?" },
    { role: "user", text: "Park Avenue, Titan Skinn, Wild Stone... and then imported ones like Davidoff" },
    { role: "ai", text: "Interesting mix of Indian and imported. How would you describe what Titan Skinn means to you compared to those other brands?" },
    { role: "user", text: "Titan Skinn is reliable, decent quality. But it doesn't have the same excitement as a Davidoff or even a Fogg" },
    { role: "ai", text: "That's a really useful distinction — reliable but not exciting. Now let me share a concept with you. Titan Skinn is considering launching a new fragrance positioned around 'everyday confidence'. What comes to mind when you hear that?" },
    { role: "user", text: "Actually that sounds good, like it's meant for my daily life not just special occasions" },
    { role: "ai", text: "That's a great reaction. How is that different from if they positioned it as 'for special moments'?" },
    { role: "user", text: "Special moments is like... I have two bottles from weddings that I've barely touched. Everyday confidence means I'd actually use it" },
    { role: "ai", text: "Really interesting — so the daily framing actually drives more usage. One last area: where do you typically discover new fragrances?" },
    { role: "user", text: "Instagram mostly, then I'll check YouTube reviews, and then go smell it at Shoppers Stop" },
    { role: "ai", text: "Digital discovery, physical purchase — that's a pattern I'm hearing a lot. Thank you so much for sharing all of this, Arjun. Your insights are incredibly valuable. We're done!" },
  ],

  executiveSummary: {
    keyTakeaway: "Position as 'everyday confidence' — it matches how your target actually uses fragrance and breaks the 'special occasion' trap that limits usage frequency.",
    whyItMatters: "73% of respondents preferred the everyday framing. The occasion positioning triggered negative associations with unused gifted bottles. Daily positioning also justifies repeat purchase, which directly impacts lifetime value.",
    confidence: "High — based on 30 interviews with target buyers",
    whyWeBelieveThis: [
      "30 interviews with target buyers (men 21-35, metro India)",
      "Strongest signal: daily-use behavior — fragrance is routine, not ritual",
      "Biggest contradiction: premium aspiration vs occasion framing — respondents want premium daily wear, not special-event bottles",
    ],
  },

  whatWeLearned: [
    { objectiveId: "obj-1", summary: "Fragrance is daily routine, not luxury ritual. Your audience already wears scent daily — they need a brand that acknowledges this, not one that makes them feel like they're saving it for later." },
    { objectiveId: "obj-2", summary: "'Everyday confidence' wins decisively over 'occasion wear'. It feels modern, personal, and permission-giving. The occasion framing actively turns respondents off." },
    { objectiveId: "obj-3", summary: "Scent longevity is the #1 purchase driver. Price sweet spot is ₹699-899. Discovery happens on Instagram/YouTube, but purchase happens in-store — smell-first is non-negotiable." },
  ],

  whatItMeans: [
    "The market is ready for a brand that says 'this is your daily signature' not 'save this for Saturday night'",
    "Titan Skinn's reliability reputation is an asset IF repositioned away from the 'father's brand' perception",
    "In-store trial is non-negotiable for first purchase — digital-only launch would underperform",
  ],

  screenerQuestions: [
    { question: "Do you currently purchase men's fragrances?", options: ["Yes, regularly", "Yes, occasionally", "No"] },
    { question: "How often do you buy fragrances?", options: ["Monthly", "Every 2-3 months", "Every 6 months", "Yearly or less"] },
    { question: "What is your typical budget for a fragrance?", options: ["Under ₹500", "₹500-1000", "₹1000-2000", "Above ₹2000"] },
  ],
};
