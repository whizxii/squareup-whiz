"use client";

import { useEffect, useRef, useCallback } from "react";

export type EffectType = "confetti" | "balloons" | "fireworks" | "sparkles";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle" | "star";
}

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F1948A", "#82E0AA",
];

const BALLOON_COLORS = [
  "#FF4757", "#2ED573", "#1E90FF", "#FFA502",
  "#A55EEA", "#FF6B81", "#2BCBBA", "#F9CA24",
];

function createConfettiParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: -10 - Math.random() * 50,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 3 + 2,
    life: 0,
    maxLife: 180 + Math.random() * 60,
    size: 4 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity: 1,
    shape: (["rect", "circle"] as const)[Math.floor(Math.random() * 2)],
  };
}

function createBalloonParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: height + 20 + Math.random() * 40,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -(Math.random() * 2 + 1.5),
    life: 0,
    maxLife: 240 + Math.random() * 60,
    size: 18 + Math.random() * 14,
    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    rotation: (Math.random() - 0.5) * 20,
    rotationSpeed: (Math.random() - 0.5) * 2,
    opacity: 0.85,
    shape: "circle",
  };
}

function createFireworkParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 4 + 2;
  return {
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0,
    maxLife: 60 + Math.random() * 40,
    size: 2 + Math.random() * 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: 0,
    rotationSpeed: 0,
    opacity: 1,
    shape: "circle",
  };
}

function createSparkleParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: -Math.random() * 0.8,
    life: 0,
    maxLife: 60 + Math.random() * 40,
    size: 2 + Math.random() * 4,
    color: ["#FFD700", "#FFF8DC", "#FFFACD", "#F0E68C", "#FFE4B5"][
      Math.floor(Math.random() * 5)
    ],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    opacity: 0,
    shape: "star",
  };
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const spikes = 4;
  const outerRadius = size;
  const innerRadius = size * 0.4;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

interface MessageEffectsProps {
  effect: EffectType | null;
  onComplete: () => void;
}

export function MessageEffects({ effect, onComplete }: MessageEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef(0);
  const effectRef = useRef(effect);

  effectRef.current = effect;

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    frameCountRef.current += 1;
    const frame = frameCountRef.current;
    const currentEffect = effectRef.current;

    // Spawn particles during the first ~60 frames
    if (frame < 60 && currentEffect) {
      const spawnCount = currentEffect === "fireworks" ? 0 : currentEffect === "sparkles" ? 3 : 4;
      for (let i = 0; i < spawnCount; i++) {
        switch (currentEffect) {
          case "confetti":
            particlesRef.current = [...particlesRef.current, createConfettiParticle(width, height)];
            break;
          case "balloons":
            if (frame % 3 === 0) {
              particlesRef.current = [...particlesRef.current, createBalloonParticle(width, height)];
            }
            break;
          case "sparkles":
            particlesRef.current = [...particlesRef.current, createSparkleParticle(width, height)];
            break;
        }
      }

      // Fireworks: burst at random locations
      if (currentEffect === "fireworks" && frame % 20 === 0) {
        const cx = width * 0.2 + Math.random() * width * 0.6;
        const cy = height * 0.15 + Math.random() * height * 0.4;
        const burstParticles = Array.from({ length: 30 }, () =>
          createFireworkParticle(cx, cy)
        );
        particlesRef.current = [...particlesRef.current, ...burstParticles];
      }
    }

    // Update and draw
    const alive: Particle[] = [];

    for (const p of particlesRef.current) {
      const updated = { ...p, life: p.life + 1 };

      if (updated.life >= updated.maxLife) continue;

      // Physics
      updated.x += updated.vx;
      updated.y += updated.vy;
      updated.rotation += updated.rotationSpeed;

      if (currentEffect === "confetti") {
        updated.vy += 0.05; // gravity
        updated.vx *= 0.99; // air resistance
      } else if (currentEffect === "fireworks") {
        updated.vy += 0.06;
        updated.vx *= 0.97;
      }

      // Fade out in last 30% of life
      const lifeRatio = updated.life / updated.maxLife;
      if (currentEffect === "sparkles") {
        // Sparkles: fade in then out
        updated.opacity = lifeRatio < 0.3
          ? lifeRatio / 0.3
          : lifeRatio > 0.7
            ? (1 - lifeRatio) / 0.3
            : 1;
      } else {
        updated.opacity = lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : p.opacity;
      }

      // Draw
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, updated.opacity));
      ctx.translate(updated.x, updated.y);
      ctx.rotate((updated.rotation * Math.PI) / 180);

      if (currentEffect === "balloons") {
        // Draw balloon shape
        ctx.fillStyle = updated.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, updated.size * 0.6, updated.size * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        // Balloon knot
        ctx.beginPath();
        ctx.moveTo(0, updated.size * 0.75);
        ctx.lineTo(-2, updated.size * 0.75 + 4);
        ctx.lineTo(2, updated.size * 0.75 + 4);
        ctx.closePath();
        ctx.fill();
        // String
        ctx.strokeStyle = updated.color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, updated.size * 0.75 + 4);
        const stringLen = 20;
        ctx.bezierCurveTo(
          -3, updated.size * 0.75 + stringLen * 0.3,
          3, updated.size * 0.75 + stringLen * 0.6,
          0, updated.size * 0.75 + stringLen
        );
        ctx.stroke();
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.ellipse(
          -updated.size * 0.15, -updated.size * 0.2,
          updated.size * 0.12, updated.size * 0.2,
          -0.3, 0, Math.PI * 2
        );
        ctx.fill();
      } else if (updated.shape === "star") {
        ctx.fillStyle = updated.color;
        drawStar(ctx, 0, 0, updated.size);
      } else if (updated.shape === "rect") {
        ctx.fillStyle = updated.color;
        ctx.fillRect(-updated.size / 2, -updated.size / 4, updated.size, updated.size / 2);
      } else {
        ctx.fillStyle = updated.color;
        ctx.beginPath();
        ctx.arc(0, 0, updated.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      alive.push(updated);
    }

    particlesRef.current = alive;

    // Continue animation or end
    if (alive.length > 0 || frame < 60) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (!effect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = [];
    frameCountRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [effect, animate]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!effect) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-hidden="true"
    />
  );
}

/** Detect message effect from content using magic words */
export function detectEffect(text: string): EffectType | null {
  const lower = text.toLowerCase();

  if (/\b(congratulations|congrats|congratz)\b/.test(lower)) return "confetti";
  if (/\b(happy birthday|bday|hbd)\b/.test(lower)) return "balloons";
  if (/\b(shipped|launched|let'?s go|lets go|deploy|release)\b/.test(lower)) return "fireworks";
  if (/\b(amazing|incredible|awesome|brilliant|wonderful|fantastic)\b/.test(lower)) return "sparkles";

  return null;
}
