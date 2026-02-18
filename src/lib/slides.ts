import type { ComponentType } from "react";

export type SlideMode = "detailed" | "presenter";
export type DeckLength = 5 | 8 | 10 | 12 | 15;

export interface SlideDefinition {
  id: string;
  title: string;
  lengths: DeckLength[];
}

export const ALL_SLIDES: SlideDefinition[] = [
  { id: "hero",           title: "SquareUp",                    lengths: [5, 8, 10, 12, 15] },
  { id: "problem",        title: "The Problem",                 lengths: [5, 8, 10, 12, 15] },
  { id: "solution",       title: "The Solution",                lengths: [5, 8, 10, 12, 15] },
  { id: "traction",       title: "Traction",                    lengths: [5, 8, 10, 12, 15] },
  { id: "ask",            title: "The Ask",                     lengths: [5, 8, 10, 12, 15] },
  { id: "whynow",         title: "Why Now",                     lengths: [8, 10, 12, 15] },
  { id: "market",         title: "Market Opportunity",          lengths: [8, 10, 12, 15] },
  { id: "team",           title: "Team",                        lengths: [8, 10, 12, 15] },
  { id: "howitworks",     title: "How It Works",                lengths: [10, 12, 15] },
  { id: "landscape",      title: "Competitive Landscape",       lengths: [10, 12, 15] },
  { id: "aidemo",         title: "AI in Action",                lengths: [12, 15] },
  { id: "whofor",         title: "Who It's For",                lengths: [12, 15] },
  { id: "cost",           title: "Cost of Blindness",           lengths: [15] },
  { id: "toolsgap",       title: "Tools Gap",                   lengths: [15] },
  { id: "businessmodel",  title: "Business Model",              lengths: [15] },
];

export function getSlidesForLength(length: DeckLength): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.lengths.includes(length));
}

export const DECK_LENGTHS: DeckLength[] = [5, 8, 10, 12, 15];
