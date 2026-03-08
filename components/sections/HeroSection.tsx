"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "../ui/useIsMobile";

const ACCENT = "#FF5A36";


function seededRandom(seed: number) {
  let s = (seed * 9301 + 49297) | 0;
  s = ((s ^ (s << 13)) >>> 0);
  s = ((s ^ (s >> 17)) >>> 0);
  s = ((s ^ (s << 5)) >>> 0);
  return (s >>> 0) / 4294967296;
}


type HeroCard = { id: string; x: number; y: number; w: number };

const HERO_CARDS: HeroCard[] = [
  { id: "crowd", x: 56, y: 26, w: 16 },
  { id: "report", x: 64, y: 10, w: 22 },
  { id: "unmoderated", x: 56, y: 46, w: 20 },
  { id: "moderated", x: 72, y: 32, w: 18 },
];

const HERO_CARDS_MOBILE: HeroCard[] = [
  { id: "crowd", x: 2, y: 3, w: 18 },
  { id: "report", x: 58, y: 1, w: 22 },
  { id: "unmoderated", x: 2, y: 73, w: 20 },
  { id: "moderated", x: 60, y: 71, w: 18 },
];

const HERO_TEXT_LINES = ["KNOW", "YOUR", "CUSTOMERS"] as const;


function generateEdgePixels(count: number) {
  const pixels: { x: number; y: number; w: number; h: number; opacity: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle =
      (i / count) * Math.PI * 2 + (seededRandom(i) - 0.5) * 0.4;

    const r = 42 + seededRandom(i + 500) * 18;
    const sizeRand = seededRandom(i + 1000);
    let w: number, h: number;
    if (sizeRand < 0.4) {

      w = 1.5 + seededRandom(i + 1100) * 2;
      h = w;
    } else if (sizeRand < 0.7) {

      w = 3 + seededRandom(i + 1100) * 3;
      h = w;
    } else {

      w = 1.5 + seededRandom(i + 1100) * 2.5;
      h = 4 + seededRandom(i + 1200) * 8;
    }

    const opacity = r < 48 ? 0.8 : r < 52 ? 0.55 : r < 56 ? 0.3 : 0.15;
    pixels.push({
      x: 50 + r * Math.cos(angle),
      y: 50 + r * Math.sin(angle),
      w, h, opacity,
    });
  }
  return pixels;
}


function pointInPolygon(px: number, py: number, poly: number[][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}


function generateSurfaceCutouts(_count: number) {
  const cutouts: { x: number; y: number; w: number; h: number; opacity: number }[] = [];


  const polygons: number[][][] = [

    [[5, 16], [8, 12], [12, 10], [16, 9], [20, 10], [24, 10], [27, 12], [30, 14],
    [33, 17], [34, 20], [33, 23], [31, 25], [30, 28], [28, 31], [26, 33], [24, 35],
    [22, 37], [20, 38], [18, 36], [16, 34], [14, 32], [13, 29], [12, 26], [10, 23],
    [8, 20], [6, 18]],

    [[20, 38], [22, 39], [23, 41], [22, 43], [20, 44], [19, 42], [19, 40]],

    [[25, 45], [28, 44], [31, 44], [34, 46], [37, 49], [39, 52], [40, 56], [39, 60],
    [38, 64], [36, 68], [34, 72], [32, 76], [30, 79], [29, 76], [28, 72], [27, 68],
    [26, 63], [25, 58], [25, 53], [25, 49]],

    [[48, 28], [49, 25], [50, 22], [50, 18], [51, 16], [53, 14], [55, 13], [57, 14],
    [59, 15], [61, 17], [61, 20], [60, 23], [59, 25], [57, 27], [55, 28], [53, 28],
    [51, 28]],

    [[46, 17], [47, 15], [48, 16], [48, 19], [47, 20], [46, 19]],

    [[53, 10], [55, 8], [57, 9], [58, 11], [57, 13], [55, 13], [54, 12]],

    [[47, 34], [49, 31], [51, 30], [53, 29], [56, 30], [58, 31], [60, 34], [61, 38],
    [61, 42], [61, 46], [60, 50], [59, 54], [58, 58], [57, 62], [55, 66], [53, 68],
    [51, 67], [49, 64], [48, 60], [47, 55], [46, 50], [46, 45], [46, 40], [47, 37]],

    [[62, 28], [64, 25], [66, 22], [68, 19], [70, 16], [73, 13], [76, 11], [79, 10],
    [82, 11], [85, 12], [88, 14], [90, 16], [92, 18], [92, 22], [91, 26], [90, 30],
    [88, 33], [86, 35], [84, 37], [82, 38], [80, 40], [78, 42], [76, 44], [74, 46],
    [72, 44], [70, 40], [68, 36], [66, 32], [64, 30]],

    [[72, 44], [74, 46], [76, 48], [77, 52], [76, 55], [74, 54], [72, 51], [71, 48]],

    [[60, 28], [62, 26], [64, 28], [66, 32], [64, 34], [62, 34], [60, 32]],

    [[82, 58], [85, 56], [88, 56], [91, 57], [93, 58], [94, 61], [94, 65],
    [93, 68], [92, 71], [90, 73], [88, 74], [85, 73], [83, 71], [82, 68],
    [81, 64], [81, 61]],

    [[35, 18], [37, 15], [39, 12], [41, 8], [43, 5], [45, 4], [46, 6], [46, 10],
    [45, 14], [43, 17], [41, 19], [39, 20], [37, 20]],

    [[10, 91], [20, 89], [35, 88], [50, 87], [65, 88], [80, 89], [90, 91],
    [85, 95], [70, 97], [50, 98], [30, 97], [15, 95]],

    [[80, 46], [83, 45], [86, 44], [88, 46], [90, 48], [88, 50], [85, 51],
    [82, 50], [80, 48]],

    [[89, 22], [90, 20], [91, 22], [92, 26], [91, 30], [90, 31], [89, 28], [89, 25]],

    [[86, 40], [87, 38], [88, 40], [88, 43], [87, 44], [86, 42]],

    [[94, 64], [95, 62], [96, 65], [96, 69], [95, 72], [94, 70], [94, 67]],

    [[62, 58], [63, 56], [64, 59], [64, 63], [63, 66], [62, 64], [62, 61]],

    [[74, 48], [75, 47], [76, 49], [75, 51], [74, 50]],
  ];


  const step = 1.35;
  let seed = 2000;

  for (let row = 0; row * step < 100; row++) {
    const gy = row * step;
    const xOff = (row % 2) * (step * 0.5);
    for (let gx = xOff; gx < 100; gx += step) {
      const jx = gx + (seededRandom(seed) - 0.5) * 0.25;
      const jy = gy + (seededRandom(seed + 1) - 0.5) * 0.25;
      seed += 2;

      let hit = false;
      for (let p = 0; p < polygons.length; p++) {
        if (pointInPolygon(jx, jy, polygons[p])) { hit = true; break; }
      }
      if (!hit) continue;


      const sizeRand = seededRandom(seed);
      let w: number, h: number;
      if (sizeRand < 0.5) {

        w = 0.6 + seededRandom(seed + 1) * 0.35;
        h = w;
      } else if (sizeRand < 0.8) {

        w = 0.95 + seededRandom(seed + 1) * 0.45;
        h = w;
      } else {

        w = 0.5 + seededRandom(seed + 1) * 0.4;
        h = 1.6 + seededRandom(seed + 2) * 2.2;
      }
      seed += 3;

      const opacity = 0.75 + seededRandom(seed) * 0.25;
      seed++;
      cutouts.push({ x: jx, y: jy, w, h, opacity });
      cutouts.push({ x: jx + 100, y: jy, w, h, opacity });
    }
  }

  return cutouts;
}


function generateWhitePixels(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle =
      (i / count) * Math.PI * 2 + (seededRandom(i + 7000) - 0.5) * 0.6;
    const r = 36 + seededRandom(i + 7500) * 26;
    const sizeRand = seededRandom(i + 8000);
    let w: number, h: number;
    if (sizeRand < 0.6) {
      w = 2 + seededRandom(i + 8100) * 4;
      h = w;
    } else {
      w = 1.5 + seededRandom(i + 8100) * 2;
      h = 3 + seededRandom(i + 8200) * 6;
    }
    return {
      x: 50 + r * Math.cos(angle),
      y: 50 + r * Math.sin(angle),
      w, h,
      opacity: r < 44 ? 0.3 : r < 50 ? 0.55 : r < 54 ? 0.45 : 0.2,
    };
  });
}


function generateSpherePixels(count: number) {
  return Array.from({ length: count }, (_, i) => {


    const theta = Math.acos(2 * seededRandom(i + 4000) - 1);
    const phi = seededRandom(i + 4100) * Math.PI * 2;


    const expandedR = 60 + seededRandom(i + 4200) * 80;

    const scatteredX = 50 + expandedR * Math.sin(theta) * Math.cos(phi);
    const scatteredY = 50 + expandedR * Math.sin(theta) * Math.sin(phi);


    const finalR = seededRandom(i + 4300) * 40;
    const finalAngle = seededRandom(i + 4400) * Math.PI * 2;
    const finalX = 50 + finalR * Math.cos(finalAngle);
    const finalY = 50 + finalR * Math.sin(finalAngle);


    const startSize = 30 + seededRandom(i + 4500) * 70;
    const endSize = 2 + seededRandom(i + 4600) * 6;


    const blurDelay = seededRandom(i + 4700) * 0.4;

    return {
      scatteredX,
      scatteredY,
      finalX,
      finalY,
      startSize,
      endSize,
      blurDelay,
    };
  });
}


function AnimatedCard({
  card,
  converge,
  cardScale,
  overlayOpacity,
  cardOpacity,
  floatClass,
  children,
}: {
  card: HeroCard;
  converge: MotionValue<number>;
  cardScale: MotionValue<number>;
  overlayOpacity: MotionValue<number>;
  cardOpacity: MotionValue<number>;
  floatClass: string;
  children: React.ReactNode;
}) {
  const left = useTransform(
    converge,
    (v: number) => `${card.x + (50 - card.x) * v}%`
  );
  const top = useTransform(
    converge,
    (v: number) => `${card.y + (50 - card.y) * v}%`
  );

  return (
    <motion.div
      style={{
        left,
        top,
        scale: cardScale,
        opacity: cardOpacity,
      }}
      className="absolute z-[5] origin-center will-change-transform"
      suppressHydrationWarning
    >
      <div className={floatClass}>
        <div className="relative" style={{ width: `${card.w}vw` }}>
          {children}
          <motion.div
            style={{ opacity: overlayOpacity }}
            className="absolute inset-0 rounded-lg"
            aria-hidden
          >
            <div
              className="w-full h-full rounded-lg"
              style={{ background: ACCENT }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}


function SpherePixel({
  pixel,
  progress,
  isMobile,
}: {
  pixel: ReturnType<typeof generateSpherePixels>[number];
  progress: MotionValue<number>;
  isMobile: boolean;
}) {

  const left = useTransform(
    progress,
    (v: number) => `${pixel.scatteredX + (pixel.finalX - pixel.scatteredX) * v}%`
  );
  const top = useTransform(
    progress,
    (v: number) => `${pixel.scatteredY + (pixel.finalY - pixel.scatteredY) * v}%`
  );


  const size = useTransform(
    progress,
    (v: number) => pixel.startSize + (pixel.endSize - pixel.startSize) * v
  );


  const opacity = useTransform(
    progress,
    [0, 0.05, 0.15, 0.85, 1],
    [0, 0.7, 1, 1, 0]
  );


  const blur = useTransform(progress, (v: number) => {
    const sharpStart = 0.3 + pixel.blurDelay;
    if (isMobile) {
      if (v < sharpStart) return 4;
      if (v < sharpStart + 0.15) return 2;
      return 0;
    }
    const sharpEnd = Math.min(sharpStart + 0.3, 1.0);
    if (v < sharpStart) return 6;
    if (v > sharpEnd) return 0;
    return 6 * (1 - (v - sharpStart) / (sharpEnd - sharpStart));
  });

  const filterStyle = useTransform(blur, (b: number) =>
    b > 0.1 ? `blur(${b}px)` : "none"
  );

  return (
    <motion.div
      style={{
        left,
        top,
        width: size,
        height: size,
        opacity,
        filter: filterStyle,
      }}
      className="absolute z-[4] will-change-transform"
      aria-hidden
      suppressHydrationWarning
    >
      <div className="w-full h-full" style={{ background: ACCENT }} />
    </motion.div>
  );
}


function AnimatedLetter({
  char,
  index,
  total,
  scrollYProgress,
  isMobile,
}: {
  char: string;
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
  isMobile: boolean;
}) {

  const stagger = (index / total) * 0.06;
  const convergeStart = 0.08 + stagger;
  const convergeEnd = convergeStart + 0.16;


  const morphStart = convergeStart + 0.06;
  const morphEnd = morphStart + 0.05;


  const bgColor = useTransform(
    scrollYProgress,
    [morphStart, morphEnd],
    ["rgba(255,90,54,0)", "rgba(255,90,54,1)"]
  );

  const textColor = useTransform(
    scrollYProgress,
    [morphStart, morphEnd],
    [ACCENT, "rgba(255,90,54,0)"]
  );


  const shadow = useTransform(
    scrollYProgress,
    [morphStart, morphEnd],
    isMobile
      ? [
        "1px 2px 4px rgba(180,50,20,0.2)",
        "0px 0px 0px rgba(0,0,0,0)",
      ]
      : [
        "1px 2px 0px rgba(180,50,20,0.15), 3px 5px 0px rgba(180,50,20,0.08), 6px 10px 20px rgba(0,0,0,0.06)",
        "0px 0px 0px rgba(0,0,0,0), 0px 0px 0px rgba(0,0,0,0), 0px 0px 0px rgba(0,0,0,0)",
      ]
  );


  const tx = isMobile
    ? 6 + seededRandom(index * 7 + 50) * 4
    : 12 + seededRandom(index * 7 + 50) * 10;
  const ty = -5 + seededRandom(index * 7 + 150) * 10;


  const scale = useTransform(scrollYProgress, [convergeStart, convergeEnd], [1, isMobile ? 0.06 : 0.02]);
  const x = useTransform(scrollYProgress, [convergeStart, convergeEnd], ["0vw", `${tx}vw`]);
  const y = useTransform(scrollYProgress, [convergeStart, convergeEnd], ["0vh", `${ty}vh`]);
  const opacity = useTransform(
    scrollYProgress,
    [convergeEnd - 0.02, convergeEnd + 0.04],
    [1, 0]
  );

  return (
    <motion.span
      style={{
        scale,
        x,
        y,
        opacity,
        display: "inline-block",
        backgroundColor: bgColor,
        color: textColor,
        textShadow: shadow,
      }}
      className="origin-center will-change-transform"
    >
      {char}
    </motion.span>
  );
}


function CrowdCard() {
  return (
    <div className="rounded-lg overflow-hidden bg-blue-100 aspect-square shadow-lg">
      <div className="w-full h-full bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center p-4">
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-40">
          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={i}
              cx={15 + (i % 8) * 10}
              cy={20 + Math.floor(i / 8) * 15}
              r={2 + seededRandom(i + 100) * 2}
              fill="#4a6fa5"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function ReportCard() {
  return (
    <div className="rounded-lg bg-white shadow-xl p-4 border border-neutral-100">
      <p className="text-[10px] text-neutral-400 mb-1">Report Preview</p>
      <p className="text-[9px] text-neutral-400 font-medium tracking-wide uppercase mb-0.5">
        Banking App Redesign
      </p>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-maze-black leading-tight">
            Discovery
          </p>
          <p className="text-sm font-semibold text-maze-black leading-tight">
            interviews
          </p>
        </div>
        <div className="text-right text-[10px]">
          <p className="text-neutral-400">Responses</p>
          <p className="text-xl font-bold text-maze-black">25</p>
          <p className="text-neutral-400 mt-1">No. of themes</p>
          <p className="text-xl font-bold text-maze-black">8</p>
        </div>
      </div>
      <div
        className="mt-2 h-16 rounded flex items-center justify-center overflow-hidden"
        style={{ background: `${ACCENT}60` }}
      >
        <svg viewBox="0 0 200 60" className="w-full opacity-30">
          {Array.from({ length: 25 }).map((_, i) => (
            <circle
              key={i}
              cx={10 + (i % 10) * 20}
              cy={15 + Math.floor(i / 10) * 20}
              r={3}
              fill={ACCENT}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function UnmoderatedCard() {
  return (
    <div className="rounded-lg bg-white shadow-xl p-4 border border-neutral-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-orange-400 flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">U</span>
        </div>
        <span className="text-xs font-medium">Unmoderated study</span>
      </div>
      <div className="h-1 bg-neutral-200 rounded mb-1">
        <div className="h-1 bg-maze-black rounded w-1/3" />
      </div>
      <div className="h-1 bg-neutral-100 rounded mb-4 w-2/3" />
      <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">
        Question
      </p>
      <p className="text-xs font-semibold mb-2">
        How easy did you find the payments feature?
      </p>
      <div className="flex gap-0.5 mb-1">
        {[1, 2, 3, 4, 5, 6, 7].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= 3 ? "text-lime" : "text-neutral-200"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-neutral-400">
        <span>Not at all satisfied</span>
        <span>Extremely satisfied</span>
      </div>
    </div>
  );
}

function PersonCard() {
  return (
    <div className="rounded-lg overflow-hidden aspect-[4/5] bg-gradient-to-br from-amber-100 to-amber-200 shadow-lg">
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-amber-300/50" />
      </div>
    </div>
  );
}

function ModeratedCard() {
  return (
    <div className="rounded-lg bg-white shadow-xl overflow-hidden border border-neutral-100">
      <div className="flex items-center gap-2 p-3 pb-0">
        <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">M</span>
        </div>
        <span className="text-xs font-medium">Moderated interview</span>
      </div>
      <div className="p-3 pt-2">
        <div className="rounded-lg overflow-hidden bg-teal-100 aspect-video flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-teal-200" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <p className="text-[10px] text-neutral-500">
            Feedback on direct deposit feature
          </p>
        </div>
      </div>
    </div>
  );
}

const CARD_CONTENT: Record<string, React.FC> = {
  crowd: CrowdCard,
  report: ReportCard,
  unmoderated: UnmoderatedCard,
  person: PersonCard,
  moderated: ModeratedCard,
};

const FLOAT_CLASSES = [
  "animate-float-1",
  "animate-float-2",
  "animate-float-3",
  "animate-float-1",
  "animate-float-2",
];


export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const edgePixels = useMemo(() => generateEdgePixels(isMobile ? 80 : 200), [isMobile]);
  const surfaceCutouts = useMemo(() => generateSurfaceCutouts(240), []);
  const spherePixels = useMemo(() => generateSpherePixels(isMobile ? 120 : 300), [isMobile]);
  const whitePixels = useMemo(() => generateWhitePixels(isMobile ? 40 : 105), [isMobile]);
  const cards = isMobile ? HERO_CARDS_MOBILE : HERO_CARDS;


  const heroTextOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.36, 0.42],
    [1, 1, 1, 0]
  );


  const letterData = useMemo(() => {
    const total = HERO_TEXT_LINES.reduce((sum, l) => sum + l.length, 0);
    let idx = 0;
    return HERO_TEXT_LINES.map((line) => ({
      line,
      chars: line.split("").map((char) => ({
        char,
        index: idx++,
        total,
      })),
    }));
  }, []);


  const cardOverlay = useTransform(
    scrollYProgress,
    [0.08, 0.18],
    [0, 1]
  );
  const cardScale = useTransform(
    scrollYProgress,
    [0.10, 0.32],
    [1, 0.015]
  );
  const cardConverge = useTransform(
    scrollYProgress,
    [0.10, 0.32],
    [0, 1]
  );
  const cardOpacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.38],
    [1, 1, 0]
  );


  const sphereProgress = useTransform(
    scrollYProgress,
    [0.10, 0.42],
    [0, 1]
  );


  const globeOpacity = useTransform(
    scrollYProgress,
    [0.24, 0.36],
    [0, 1]
  );

  const globeScale = useTransform(
    scrollYProgress,
    [0.24, 0.35, 0.46],
    [0.15, 0.55, 1.0]
  );


  const globeTextOpacity = useTransform(
    scrollYProgress,
    [0.46, 0.56],
    [0, 1]
  );
  const globeTextScale = useTransform(
    scrollYProgress,
    [0.46, 0.58],
    [1.3, 1.0]
  );
  const globeTextY = useTransform(
    scrollYProgress,
    [0.46, 0.56],
    ["20px", "0px"]
  );


  const fixedOpacity = useTransform(
    scrollYProgress,
    [0.82, 0.94],
    [1, 0]
  );
  const fixedPointerEvents = useTransform(scrollYProgress, (v) =>
    v >= 0.92 ? ("none" as const) : ("auto" as const)
  );


  const indicatorOpacity = useTransform(
    scrollYProgress,
    [0, 0.05, 0.52, 0.58],
    [1, 1, 1, 0]
  );

  return (
    <section ref={sectionRef} className="relative z-0 h-[200vh] sm:h-[353vh]">
      <motion.div
        style={{ opacity: fixedOpacity, pointerEvents: fixedPointerEvents }}
        className="fixed inset-0 z-[1] overflow-hidden"
      >
        {}
        <motion.div
          style={{ opacity: heroTextOpacity }}
          className="absolute inset-0 flex items-center justify-center sm:justify-start z-10 pointer-events-none"
        >
          <div
            className="px-4 text-center sm:text-left sm:pl-[5vw] sm:pr-0 w-full leading-[1.05] tracking-[-0.03em]"
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: "clamp(44px, 12vw, 180px)",
              fontWeight: 900,
            }}
            aria-label="KNOW YOUR CUSTOMERS"
          >
            {letterData.map((lineData, lineIdx) => (
              <span key={lineIdx}>
                {lineData.chars.map(({ char, index, total }) => (
                  <AnimatedLetter
                    key={index}
                    char={char}
                    index={index}
                    total={total}
                    scrollYProgress={scrollYProgress}
                    isMobile={isMobile}
                  />
                ))}
                {lineIdx < letterData.length - 1 && <br />}
              </span>
            ))}
          </div>
        </motion.div>

        {}
        {mounted && cards.map((card, idx) => {
          const Content = CARD_CONTENT[card.id];
          return (
            <AnimatedCard
              key={card.id}
              card={card}
              converge={cardConverge}
              cardScale={cardScale}
              overlayOpacity={cardOverlay}
              cardOpacity={cardOpacity}
              floatClass={FLOAT_CLASSES[idx]}
            >
              <Content />
            </AnimatedCard>
          );
        })}

        {}
        {mounted && spherePixels.map((pixel, idx) => (
          <SpherePixel
            key={`sp-${idx}`}
            pixel={pixel}
            progress={sphereProgress}
            isMobile={isMobile}
          />
        ))}

        {}
        {mounted && (
          <motion.div
            style={{ opacity: globeOpacity }}
            className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none"
          >
            <motion.div
              style={{ scale: globeScale }}
              className="w-[min(85vw,76vh)] sm:w-[min(76vw,76vh)] aspect-square relative will-change-transform"
            >
              {}
              <div
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{ background: ACCENT }}
              >
                {}
                {}
                <div
                  className="absolute inset-0 animate-globe-drift"
                  style={{ width: "200%" }}
                >
                  {surfaceCutouts.map((p, i) => (
                    <div
                      key={`sc-${i}`}
                      className="absolute"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.w}%`,
                        height: `${p.h}%`,
                        background: "#FFB89E",
                        opacity: p.opacity,
                      }}
                    />
                  ))}
                </div>
              </div>
              {}
              <div className="absolute inset-0 overflow-visible animate-globe-orbit">
                {edgePixels.map((p, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.w}px`,
                      height: `${p.h}px`,
                      background: ACCENT,
                      opacity: p.opacity,
                    }}
                  />
                ))}
              </div>
              {}
              <div
                className="absolute inset-0 overflow-visible animate-globe-orbit"
                style={{ animationDirection: "reverse", animationDuration: "55s" }}
              >
                {whitePixels.map((p, i) => (
                  <div
                    key={`wp-${i}`}
                    className="absolute"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.w}px`,
                      height: `${p.h}px`,
                      background: "#FFC4AD",
                      opacity: p.opacity,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {}
        {mounted && (
          <motion.div
            style={{ opacity: globeTextOpacity }}
            className="absolute inset-0 flex items-center justify-center z-[4] pointer-events-none"
          >
            <motion.h2
              className="leading-[1.05] tracking-[-0.03em] text-center origin-center will-change-transform"
              style={{
                scale: globeTextScale,
                y: globeTextY,
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: "clamp(28px, 8vw, 140px)",
                fontWeight: 900,
                color: "#FFFFFF",
                textShadow: isMobile
                  ? "0 2px 8px rgba(0,0,0,0.3)"
                  : "0 2px 0 rgba(180,40,10,0.5), 0 4px 8px rgba(120,20,0,0.35), 0 0 30px rgba(255,255,255,0.15), 0 0 60px rgba(255,90,54,0.4)",
              }}
            >
              LIKE<br />NEVER<br />BEFORE
            </motion.h2>
          </motion.div>
        )}

        {}
        <motion.div
          style={{ opacity: indicatorOpacity, bottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}
          className="absolute left-1/2 -translate-x-1/2 z-[6]"
        >
          <button className="scroll-indicator flex items-center gap-2 px-4 py-2 text-sm font-medium text-maze-black border border-neutral-300 rounded-full bg-white/70 backdrop-blur-sm">
            Scroll to continue
            <ChevronDown className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
