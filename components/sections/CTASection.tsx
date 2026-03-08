"use client";

import { useRef, useEffect } from "react";


interface CatalogItem {
  type: "shape" | "image" | "glass" | "dot";
  w: number;
  h: number;
  r: number;
  bg?: string;
  src?: string;
  shadow: boolean;
}

const CATALOG: CatalogItem[] = [

  { type: "shape", w: 240, h: 156, r: 18,  bg: "#FF5A36",  shadow: true  },
  { type: "shape", w: 54,  h: 54,  r: 10,  bg: "#E8450E",  shadow: true  },
  { type: "shape", w: 264, h: 168, r: 16,  bg: "#FF5A36",  shadow: true  },
  { type: "shape", w: 46,  h: 120, r: 8,   bg: "#1a1a1a",  shadow: true  },
  { type: "shape", w: 144, h: 144, r: 16,  bg: "#FF5A36",  shadow: true  },
  { type: "shape", w: 204, h: 72,  r: 12,  bg: "#FFB74D",  shadow: true  },
  { type: "shape", w: 72,  h: 72,  r: 12,  bg: "#E8450E",  shadow: true  },
  { type: "shape", w: 36,  h: 132, r: 6,   bg: "#FF5A36",  shadow: true  },
  { type: "shape", w: 216, h: 120, r: 14,  bg: "#1a1a1a",  shadow: true  },
  { type: "shape", w: 102, h: 228, r: 14,  bg: "#FF5A36",  shadow: true  },


  { type: "image", w: 216, h: 216, r: 18,  src: "/trail-images/img-01.jpg", shadow: true  },
  { type: "image", w: 102, h: 156, r: 12,  src: "/trail-images/img-03.jpg", shadow: true  },
  { type: "image", w: 96,  h: 96,  r: 14,  src: "/trail-images/img-06.jpg", shadow: true  },
  { type: "image", w: 156, h: 240, r: 14,  src: "/trail-images/img-08.jpg", shadow: true  },
  { type: "image", w: 252, h: 144, r: 16,  src: "/trail-images/img-10.jpg", shadow: true  },


  { type: "glass", w: 132, h: 132, r: 18,  shadow: false },
  { type: "glass", w: 180, h: 78,  r: 20,  shadow: false },


  { type: "dot", w: 26, h: 26, r: 999, bg: "#FF5A36", shadow: false },
  { type: "dot", w: 22, h: 22, r: 999, bg: "#E8450E", shadow: false },


  { type: "dot", w: 14, h: 14, r: 999, bg: "#FFB74D", shadow: false },
  { type: "dot", w: 17, h: 17, r: 999, bg: "#FF5A36", shadow: false },
  { type: "dot", w: 10, h: 10, r: 999, bg: "#1a1a1a", shadow: false },
];

const POOL_SIZE = 48;
const ZONE_W_HALF = 192;
const ZONE_H_HALF = 144;
const SPAWN_INTERVAL = 100;
const ENTRY_SCALE = 0.05;


function getDuration(item: CatalogItem): number {
  const area = item.w * item.h;
  if (area > 30000) return 7200;
  if (area > 15000) return 6200;
  if (area > 5000)  return 5200;
  if (area > 1000)  return 4200;
  return 3600;
}


function getGlowColor(item: CatalogItem): string {
  if (item.type === "image") return "rgba(255,90,54,0.35)";
  if (item.type === "glass") return "rgba(255,255,255,0.15)";
  if (item.bg === "#FF5A36") return "rgba(255,90,54,0.4)";
  if (item.bg === "#E8450E") return "rgba(232,69,14,0.35)";
  if (item.bg === "#FFB74D") return "rgba(255,183,77,0.4)";
  if (item.bg === "#1a1a1a") return "rgba(26,26,26,0.25)";
  return "rgba(255,90,54,0.3)";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CursorTheatre({
  sectionRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const section = sectionRef.current;
    if (!wrap || !section) return;

    const pool: HTMLDivElement[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;left:0;top:0;opacity:0;pointer-events:none;" +
        "will-change:transform,opacity,filter;" +
        "background-size:cover;background-position:center;";
      wrap.appendChild(el);
      pool.push(el);
    }

    let poolIdx = 0;
    let zCounter = 1;
    let catalogOrder = shuffle(CATALOG);
    let catalogIdx = 0;
    let mouseInside = false;
    let cursorX = 0;
    let cursorY = 0;
    let spawnTimer: number | null = null;

    CATALOG.forEach((it) => {
      if (it.src) new Image().src = it.src;
    });

    function nextItem(): CatalogItem {
      if (catalogIdx >= catalogOrder.length) {
        catalogOrder = shuffle(CATALOG);
        catalogIdx = 0;
      }
      return catalogOrder[catalogIdx++];
    }

    function spawnItem() {
      if (!mouseInside) return;

      const item = nextItem();
      const el = pool[poolIdx % POOL_SIZE];
      poolIdx++;

      const br = item.r >= 999 ? Math.max(item.w, item.h) / 2 : item.r;
      const hw = item.w / 2;
      const hh = item.h / 2;


      const scatter = (Math.random() - 0.5) * Math.min(ZONE_W_HALF, ZONE_H_HALF) * 1.2;

      const perpX = scatter * 0.707;
      const perpY = scatter * 0.707;


      const rot0 = (Math.random() - 0.5) * 24;
      const rot1 = rot0 + (Math.random() - 0.5) * 8;


      const entryX = cursorX - ZONE_W_HALF + perpX;
      const entryY = cursorY + ZONE_H_HALF + perpY;

      const centerX = cursorX + (Math.random() - 0.5) * 40 + perpX * 0.3;
      const centerY = cursorY + (Math.random() - 0.5) * 40 + perpY * 0.3;

      const exitX = cursorX + ZONE_W_HALF + perpX;
      const exitY = cursorY - ZONE_H_HALF + perpY;


      const q1X = entryX + (centerX - entryX) * 0.55;
      const q1Y = entryY + (centerY - entryY) * 0.55;
      const q3X = centerX + (exitX - centerX) * 0.45;
      const q3Y = centerY + (exitY - centerY) * 0.45;


      el.style.width = item.w + "px";
      el.style.height = item.h + "px";
      el.style.borderRadius = br + "px";
      el.style.zIndex = String(zCounter++);
      el.style.backgroundImage = "";
      el.style.backgroundColor = "";
      el.style.border = "";
      el.style.backdropFilter = "";
      el.style.setProperty("-webkit-backdrop-filter", "");
      el.style.boxShadow = "none";
      el.style.transition = "none";
      el.style.filter = "";

      while (el.firstChild) el.removeChild(el.firstChild);

      if (item.type === "image" && item.src) {
        el.style.backgroundImage = `url(${item.src})`;
        const ov = document.createElement("div");
        ov.style.cssText =
          "position:absolute;inset:0;border-radius:inherit;" +
          "background:rgba(255,90,54,0.18);pointer-events:none;";
        el.appendChild(ov);
      } else if (item.type === "glass") {
        el.style.backgroundColor = "rgba(255,90,54,0.04)";
        el.style.backdropFilter = "blur(18px)";
        el.style.setProperty("-webkit-backdrop-filter", "blur(18px)");
        el.style.border = "1px solid rgba(255,255,255,0.08)";
      } else {
        el.style.backgroundColor = item.bg || "#FF5A36";
      }


      el.getAnimations().forEach(a => a.cancel());


      const glow = getGlowColor(item);
      const noGlow = glow.replace(/[\d.]+\)$/, "0)");
      const dur = getDuration(item);


      el.animate(
        [
          {

            transform: `translate3d(${entryX - hw}px,${entryY - hh}px,0) scale(${ENTRY_SCALE}) rotate(${rot0}deg)`,
            opacity: 0,
            filter: "blur(12px)",
            boxShadow: `0 0 0px ${noGlow}`,
            offset: 0,
          },
          {

            transform: `translate3d(${q1X - hw * 0.7}px,${q1Y - hh * 0.7}px,0) scale(0.35) rotate(${rot0 * 0.8}deg)`,
            opacity: 0.5,
            filter: "blur(8px)",
            boxShadow: `0 0 8px ${glow}`,
            offset: 0.12,
          },
          {

            transform: `translate3d(${(q1X + centerX) / 2 - hw * 0.5}px,${(q1Y + centerY) / 2 - hh * 0.5}px,0) scale(0.7) rotate(${rot0 * 0.5}deg)`,
            opacity: 0.9,
            filter: "blur(3px)",
            boxShadow: `0 0 20px ${glow}`,
            offset: 0.26,
          },
          {

            transform: `translate3d(${centerX - hw}px,${centerY - hh}px,0) scale(1) rotate(${rot1 * 0.2}deg)`,
            opacity: 1,
            filter: "blur(0px)",
            boxShadow: `0 0 35px ${glow}, 0 8px 32px rgba(0,0,0,0.15)`,
            offset: 0.38,
          },
          {

            transform: `translate3d(${(centerX + q3X) / 2 - hw * 0.5}px,${(centerY + q3Y) / 2 - hh * 0.5}px,0) scale(0.7) rotate(${rot1 * 0.5}deg)`,
            opacity: 0.85,
            filter: "blur(2px)",
            boxShadow: `0 0 25px ${glow}`,
            offset: 0.55,
          },
          {

            transform: `translate3d(${q3X - hw * 0.3}px,${q3Y - hh * 0.3}px,0) scale(0.35) rotate(${rot1 * 0.8}deg)`,
            opacity: 0.4,
            filter: "blur(7px)",
            boxShadow: `0 0 10px ${glow}`,
            offset: 0.78,
          },
          {

            transform: `translate3d(${exitX - hw}px,${exitY - hh}px,0) scale(${ENTRY_SCALE}) rotate(${rot1}deg)`,
            opacity: 0,
            filter: "blur(14px)",
            boxShadow: `0 0 0px ${noGlow}`,
            offset: 1.0,
          },
        ],
        {
          duration: dur,
          easing: "cubic-bezier(0.22, 0.68, 0.35, 1.0)",
          fill: "forwards",
        }
      );
    }

    function startSpawning() {
      if (spawnTimer !== null) return;
      spawnItem();
      spawnTimer = window.setInterval(spawnItem, SPAWN_INTERVAL);
    }

    function stopSpawning() {
      if (spawnTimer !== null) {
        clearInterval(spawnTimer);
        spawnTimer = null;
      }
    }

    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;

      cursorX = e.clientX - r.left;
      cursorY = e.clientY - r.top;

      if (inside && !mouseInside) {
        mouseInside = true;
        startSpawning();
      } else if (!inside && mouseInside) {
        mouseInside = false;
        stopSpawning();
      }
    };


    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const r = section.getBoundingClientRect();
      cursorX = touch.clientX - r.left;
      cursorY = touch.clientY - r.top;
      if (!mouseInside) {
        mouseInside = true;
        startSpawning();
      }
    };

    const onTouchEnd = () => {
      mouseInside = false;
      stopSpawning();
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          mouseInside = false;
          stopSpawning();
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(section);

    window.addEventListener("mousemove", onMove, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: true });
    section.addEventListener("touchend", onTouchEnd);
    section.addEventListener("touchcancel", onTouchEnd);

    return () => {
      obs.disconnect();
      window.removeEventListener("mousemove", onMove);
      section.removeEventListener("touchmove", onTouchMove);
      section.removeEventListener("touchend", onTouchEnd);
      section.removeEventListener("touchcancel", onTouchEnd);
      stopSpawning();
      pool.forEach((el) => {
        el.getAnimations().forEach(a => a.cancel());
        el.remove();
      });
    };
  }, [sectionRef]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  return (
    <section
      ref={sectionRef}
      data-section-name="cta-cursor-gallery"
      className="relative overflow-hidden"
    >
      {}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute blob-drift-1"
          style={{
            width: "60vw",
            height: "60vh",
            top: "10%",
            left: "20%",
            background: "radial-gradient(ellipse, rgba(255,90,54,0.06) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute blob-drift-2"
          style={{
            width: "50vw",
            height: "50vh",
            bottom: "10%",
            right: "15%",
            background: "radial-gradient(ellipse, rgba(255,183,77,0.05) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>
      <CursorTheatre sectionRef={sectionRef} />
      <div className="relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 sm:py-28 lg:py-52 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-[clamp(32px,7vw,96px)] leading-[1.05] tracking-[-0.05em] text-maze-black whitespace-pre-line">
              {"Shape the\nfuture with us"}
            </h1>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-6">
              <a
                href="#book-call"
                data-cursor-safe-zone="true"
                className="relative z-20 min-h-14 min-w-[140px] w-full sm:w-auto sm:min-h-[80px] sm:min-w-[240px] px-6 py-3 text-lg lg:text-xl font-display tracking-[-0.02em] text-white bg-maze-black rounded-xl hover:bg-black transition-colors flex items-center justify-center"
              >
                Talk to us
              </a>
              <a
                href="#book-call"
                data-cursor-safe-zone="true"
                className="relative z-20 min-h-14 min-w-[140px] w-full sm:w-auto sm:min-h-[80px] sm:min-w-[240px] px-6 py-3 text-lg lg:text-xl font-display tracking-[-0.02em] text-maze-black border border-neutral-400 rounded-full hover:border-maze-black hover:bg-white/80 backdrop-blur-sm transition-all flex items-center justify-center"
              >
                Request a demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
