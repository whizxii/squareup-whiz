import { useEffect, useRef, useState } from "react";

export function useScrollAnimation(threshold = 0.15, forceReveal = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(forceReveal);

  useEffect(() => {
    if (forceReveal) { setRevealed(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, forceReveal]);

  return { ref, revealed };
}

export function useCountUp(target: number, duration = 1800, prefix = "", suffix = "", forceStart = false) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(forceStart);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceStart) { setStarted(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [forceStart]);

  useEffect(() => {
    if (!started) return;
    if (forceStart) { setCount(target); return; }
    let startTime: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration, forceStart]);

  return { ref, display: `${prefix}${count}${suffix}` };
}

export function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return progress;
}
