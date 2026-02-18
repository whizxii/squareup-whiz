import type { ComponentType } from "react";

export type SlideMode = "short" | "detailed" | "presenter";
export type DeckLength = 5 | 8 | 10 | 12 | 15;

export interface SlideDefinition {
  id: string;
  title: string;
  lengths: DeckLength[];
  inShort: boolean; // shown in default 10-slide short view
}

export const ALL_SLIDES: SlideDefinition[] = [
  { id: "hero",          title: "SquareUp",              lengths: [5, 8, 10, 12, 15], inShort: true  },
  { id: "problem",       title: "The Problem",           lengths: [5, 8, 10, 12, 15], inShort: true  },
  { id: "solution",      title: "The Solution",          lengths: [5, 8, 10, 12, 15], inShort: true  },
  { id: "howitworks",   title: "How It Works",           lengths: [10, 12, 15],        inShort: true  },
  { id: "aidemo",        title: "AI in Action",          lengths: [12, 15],            inShort: true  },
  { id: "whofor",        title: "Who It's For",          lengths: [12, 15],            inShort: false },
  { id: "traction",      title: "Traction",              lengths: [5, 8, 10, 12, 15], inShort: true  },
  { id: "whynow",        title: "Why Now",               lengths: [8, 10, 12, 15],    inShort: false },
  { id: "landscape",     title: "Competitive Landscape", lengths: [10, 12, 15],        inShort: true  },
  { id: "market",        title: "Market Opportunity",    lengths: [8, 10, 12, 15],    inShort: false },
  { id: "businessmodel", title: "Business Model",        lengths: [15],               inShort: true  },
  { id: "team",          title: "Team",                  lengths: [8, 10, 12, 15],    inShort: true  },
  { id: "ask",           title: "The Ask",               lengths: [5, 8, 10, 12, 15], inShort: true  },
  { id: "cost",          title: "Cost of Blindness",     lengths: [15],               inShort: false },
  { id: "toolsgap",      title: "Tools Gap",             lengths: [15],               inShort: false },
];

export function getSlidesForLength(length: DeckLength): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.lengths.includes(length));
}

export function getShortSlides(): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.inShort);
}

export const DECK_LENGTHS: DeckLength[] = [5, 8, 10, 12, 15];
