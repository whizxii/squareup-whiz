/**
 * Day/night overlay, weather effects, floating dust particles, and ambient life.
 * Renders on a dedicated canvas layer for performance.
 */

"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";
import { isoCanvasSize } from "@/lib/office/iso-coords";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
}

const DUST_COUNT = 7;
const SNOW_COUNT = 40;
const RAIN_COUNT = 80;
const STEAM_COUNT = 3;

function createDustParticles(w: number, h: number): Particle[] {
  return Array.from({ length: DUST_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.2,
    size: 1.5 + Math.random() * 2,
    opacity: 0.1 + Math.random() * 0.2,
    phase: Math.random() * Math.PI * 2,
  }));
}

function createSnowParticles(w: number, h: number): Particle[] {
  return Array.from({ length: SNOW_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.5 + Math.random() * 1.5,
    size: 1 + Math.random() * 3,
    opacity: 0.4 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }));
}

function createRainParticles(w: number, h: number): Particle[] {
  return Array.from({ length: RAIN_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: -0.5 + Math.random() * 0.3,       // slight leftward drift
    vy: 6 + Math.random() * 4,             // fast vertical fall
    size: 0.5 + Math.random() * 0.5,
    opacity: 0.08 + Math.random() * 0.1,
    phase: Math.random() * Math.PI * 2,
  }));
}

function createSteamParticles(): Particle[] {
  return Array.from({ length: STEAM_COUNT }, () => ({
    x: 0,
    y: 0,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.5 - Math.random() * 0.5,
    size: 2 + Math.random() * 2,
    opacity: 0.3,
    phase: Math.random() * Math.PI * 2,
  }));
}

export default function AmbientLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const snowRef = useRef<Particle[]>([]);
  const rainRef = useRef<Particle[]>([]);
  const steamRef = useRef<Particle[]>(createSteamParticles());

  const weather = useOfficeStore((s) => s.weather);
  const dayPhase = useOfficeStore((s) => s.dayPhase);
  const layout = useOfficeStore((s) => s.layout);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  const { width: canvasW, height: canvasH } = isoCanvasSize(layout.gridCols, layout.gridRows);

  const drawDust = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      for (const p of particlesRef.current) {
        p.x += p.vx + Math.sin(t * 0.001 + p.phase) * 0.15;
        p.y += p.vy + Math.cos(t * 0.0008 + p.phase) * 0.1;

        // Wrap around
        if (p.x < 0) p.x = canvasW;
        if (p.x > canvasW) p.x = 0;
        if (p.y < 0) p.y = canvasH;
        if (p.y > canvasH) p.y = 0;

        const flicker = 0.5 + 0.5 * Math.sin(t * 0.002 + p.phase);
        ctx.beginPath();
        ctx.arc(
          Math.floor(p.x),
          Math.floor(p.y),
          p.size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 240, 200, ${p.opacity * flicker})`;
        ctx.fill();
      }
    },
    [canvasW, canvasH]
  );

  const drawSnow = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      for (const p of snowRef.current) {
        p.x += p.vx + Math.sin(t * 0.001 + p.phase) * 0.3;
        p.y += p.vy;

        if (p.y > canvasH) {
          p.y = -5;
          p.x = Math.random() * canvasW;
        }
        if (p.x < 0) p.x = canvasW;
        if (p.x > canvasW) p.x = 0;

        ctx.beginPath();
        ctx.arc(
          Math.floor(p.x),
          Math.floor(p.y),
          p.size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      }
    },
    [canvasW, canvasH]
  );

  const drawRain = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = "rgba(180, 210, 240, 0.18)";
      ctx.lineWidth = 0.5;
      for (const p of rainRef.current) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around when exiting bottom or sides
        if (p.y > canvasH) {
          p.y = -8;
          p.x = Math.random() * canvasW;
        }
        if (p.x < 0) p.x = canvasW;
        if (p.x > canvasW) p.x = 0;

        const rx = Math.floor(p.x);
        const ry = Math.floor(p.y);
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + p.vx * 0.6, ry + p.vy * 1.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    [canvasW, canvasH]
  );

  const drawSteam = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      const hour = new Date().getHours();
      if (hour < 6 || hour > 11) return; // morning only

      // Steam from approximate coffee machine area (tile 7, 8)
      const baseX = 7 * TILE + TILE / 2;
      const baseY = 8 * TILE;

      for (const p of steamRef.current) {
        const age = (t * 0.003 + p.phase) % 3;
        const py = baseY + p.vy * age * 20;
        const px = baseX + Math.sin(age * 2 + p.phase) * 4;
        const opacity = Math.max(0, 0.3 - age * 0.12);
        const size = p.size + age * 1.5;

        ctx.beginPath();
        ctx.arc(Math.floor(px), Math.floor(py), size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReduced) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Initialize particles
    particlesRef.current = createDustParticles(canvasW, canvasH);
    snowRef.current = createSnowParticles(canvasW, canvasH);
    rainRef.current = createRainParticles(canvasW, canvasH);

    const animate = (t: number) => {
      ctx.clearRect(0, 0, canvasW, canvasH);

      // Dust particles (always)
      drawDust(ctx, t);

      // Weather effects
      if (weather === "snow") {
        drawSnow(ctx, t);
      } else if (weather === "rain" || weather === "storm") {
        drawRain(ctx);
      }

      // Coffee steam (morning only)
      drawSteam(ctx, t);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    canvasW,
    canvasH,
    weather,
    prefersReduced,
    drawDust,
    drawSnow,
    drawRain,
    drawSteam,
  ]);

  if (prefersReduced) return null;

  return (
    <>
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ zIndex: 6, pointerEvents: "none" }}
      />

      {/* Storm lightning flash overlay */}
      {weather === "storm" && (
        <LightningFlash canvasW={canvasW} canvasH={canvasH} />
      )}
    </>
  );
}

/** Random lightning flash every 3-8 seconds during storms */
function LightningFlash({
  canvasW,
  canvasH,
}: {
  readonly canvasW: number;
  readonly canvasH: number;
}) {
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const flash = () => {
      const el = flashRef.current;
      if (el) {
        el.style.opacity = "0.25";
        setTimeout(() => {
          if (el) el.style.opacity = "0";
        }, 80);
      }
      timeout = setTimeout(flash, 3000 + Math.random() * 5000);
    };

    timeout = setTimeout(flash, 3000 + Math.random() * 5000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      ref={flashRef}
      className="absolute inset-0 transition-opacity duration-75"
      style={{
        width: canvasW,
        height: canvasH,
        backgroundColor: "white",
        opacity: 0,
        zIndex: 7,
        pointerEvents: "none",
      }}
    />
  );
}
