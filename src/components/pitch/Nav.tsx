import { useReadingProgress } from "@/lib/useScrollAnimation";
import iconSvg from "@/assets/icon.svg";
import { type DeckLength, type SlideMode } from "@/lib/slides";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface NavProps {
  mode: SlideMode;
  onModeChange: (m: SlideMode) => void;
  deckLength: DeckLength;
  onDeckLengthChange: (l: DeckLength) => void;
}

export default function Nav({ mode, onModeChange, deckLength, onDeckLengthChange }: NavProps) {
  const progress = useReadingProgress();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const modes: { id: SlideMode; label: string; sub: string }[] = [
    { id: "short", label: "Pitch", sub: "YC style" },
    { id: "detailed", label: "Deep Dive", sub: "Full deck" },
    { id: "download", label: "Download", sub: "PDF export" },
    { id: "presenter", label: "Present", sub: "Slideshow" },
  ];

  return (
    <>
      {/* Reading progress bar */}
      {mode !== "presenter" && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-[2px]">
          <div
            className="h-full transition-all duration-150 ease-linear"
            style={{ width: `${progress}%`, background: "hsl(var(--sq-orange))" }}
          />
        </div>
      )}

      <nav
        className={`fixed top-[2px] left-0 right-0 z-50 transition-all duration-300`}
        style={{
          background: scrolled ? "rgba(var(--sq-card-rgb, 255,255,255), 0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px) saturate(1.5)" : "none",
          borderBottom: scrolled ? "1px solid hsl(var(--sq-subtle))" : "1px solid transparent",
          boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.04)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[60px]">

            {/* Logo */}
            <a href="#hero" className="flex items-center gap-2 flex-shrink-0 group">
              <img src={iconSvg} alt="SquareUp" className="h-5 w-auto transition-transform duration-200 group-hover:scale-105" />
              <span className="font-black text-[17px] tracking-[-0.02em]" style={{ color: "hsl(var(--sq-text))" }}>
                Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
              </span>
            </a>

            {/* Center: segmented mode pill */}
            <div className="hidden md:flex items-center rounded-full p-[3px] gap-0"
              style={{
                background: "hsl(var(--sq-subtle))",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)"
              }}>
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onModeChange(m.id)}
                  className="relative px-4 py-[5px] rounded-full text-center transition-all duration-200"
                  style={{
                    background: mode === m.id ? "hsl(var(--sq-card))" : "transparent",
                    color: mode === m.id ? "hsl(var(--sq-text))" : "hsl(var(--sq-muted))",
                    boxShadow: mode === m.id ? "0 1px 4px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)" : "none",
                  }}
                >
                  <span className="block text-[13px] font-semibold leading-tight">{m.label}</span>
                  <span className="block text-[9px] font-medium leading-tight mt-[1px]"
                    style={{ opacity: mode === m.id ? 0.5 : 0.4 }}>
                    {m.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Right CTA */}
            <div className="hidden md:flex items-center gap-4">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-[hsl(var(--sq-subtle))] transition-colors"
                  aria-label="Toggle theme"
                  style={{ color: "hsl(var(--sq-text))" }}
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}
              <a
                href="https://almost.joinsquareup.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold transition-opacity hover:opacity-60"
                style={{ color: "hsl(var(--sq-muted))" }}
              >
                See demo →
              </a>
              <a
                href="mailto:hello@joinsquareup.com"
                className="text-[13px] font-bold px-4 py-2 rounded-full transition-all hover:opacity-90"
                style={{
                  background: "hsl(var(--sq-orange))",
                  color: "white",
                  boxShadow: "0 2px 12px hsl(var(--sq-orange) / 0.28)"
                }}
              >
                Get in touch
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 rounded-lg transition-colors"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              style={{ color: "hsl(var(--sq-text))" }}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden border-t px-5 py-5 space-y-3"
            style={{
              background: "hsl(var(--sq-card) / 0.97)",
              backdropFilter: "blur(16px)",
              borderColor: "hsl(var(--sq-subtle))"
            }}>
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-full p-1"
              style={{ background: "hsl(var(--sq-subtle))" }}>
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onModeChange(m.id); setOpen(false); }}
                  className="flex-1 py-2 rounded-full text-center transition-all"
                  style={{
                    background: mode === m.id ? "hsl(var(--sq-card))" : "transparent",
                    color: mode === m.id ? "hsl(var(--sq-text))" : "hsl(var(--sq-muted))",
                    boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <span className="block text-xs font-semibold leading-tight">{m.label}</span>
                  <span className="block text-[8px] font-medium leading-tight mt-[1px]" style={{ opacity: 0.5 }}>{m.sub}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <a href="https://almost.joinsquareup.com" target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center font-semibold text-sm py-2.5 rounded-full"
                style={{ border: "1.5px solid hsl(var(--sq-subtle))", color: "hsl(var(--sq-muted))" }}
                onClick={() => setOpen(false)}>
                See demo
              </a>
              <a href="mailto:hello@joinsquareup.com"
                className="flex-1 text-center font-bold text-sm py-2.5 rounded-full text-white"
                style={{ background: "hsl(var(--sq-orange))" }}
                onClick={() => setOpen(false)}>
                Get in touch
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
