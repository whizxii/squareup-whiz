import type { ComponentType } from "react";

export type SlideMode = "short" | "detailed" | "presenter" | "download";
export type DeckLength = 8 | 12;

export interface SlideDefinition {
  id: string;
  title: string;
  lengths: DeckLength[];
  inShort: boolean; // shown in default 10-slide short view
}

export const ALL_SLIDES: SlideDefinition[] = [
  { id: "hero", title: "The Hook", lengths: [8, 12], inShort: true },
  { id: "cost", title: "The Bleed", lengths: [8, 12], inShort: true },
  { id: "problem", title: "The Structural Flaw", lengths: [8, 12], inShort: true },
  { id: "decisionvolume", title: "The Frequency", lengths: [12], inShort: false },
  { id: "landscape", title: "The False Idols", lengths: [12], inShort: false },
  { id: "solution", title: "The Category Definition", lengths: [8, 12], inShort: true },
  { id: "decisionflow", title: "How Customer Truth Becomes Action", lengths: [12], inShort: false },
  { id: "whofor", title: "Who It's For", lengths: [12], inShort: false },
  { id: "howitworks", title: "The Workflow", lengths: [12], inShort: false },
  { id: "insightbrief", title: "The Decision Brief", lengths: [8, 12], inShort: true },
  { id: "aidemo", title: "The Magic Demo", lengths: [8, 12], inShort: true },
  { id: "whynow", title: "The Catalyst", lengths: [8, 12], inShort: true },
  { id: "traction", title: "The Velocity", lengths: [8, 12], inShort: true },
  { id: "market", title: "The Market", lengths: [8, 12], inShort: true },
  { id: "businessmodel", title: "The Expansion", lengths: [12], inShort: false },
  { id: "team", title: "The Destiny", lengths: [8, 12], inShort: true },
  { id: "ask", title: "The Ask", lengths: [8, 12], inShort: true },
  { id: "faq", title: "FAQ", lengths: [12], inShort: false },
  { id: "cta", title: "Let's Talk", lengths: [8, 12], inShort: true },
];

export function getSlidesForLength(length: DeckLength): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.lengths.includes(length));
}

export function getShortSlides(): SlideDefinition[] {
  return ALL_SLIDES.filter((s) => s.inShort);
}

export const DECK_LENGTHS: DeckLength[] = [8, 12];
