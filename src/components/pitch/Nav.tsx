import { useReadingProgress } from "@/lib/useScrollAnimation";
import iconSvg from "@/assets/icon.svg";
import { DECK_LENGTHS, type DeckLength, type SlideMode } from "@/lib/slides";
import { Menu, X, Download } from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "How It Works", href: "#howitworks" },
  { label: "AI Demo", href: "#aidemo" },
  { label: "Traction", href: "#traction" },
  { label: "Team", href: "#team" },
  { label: "The Ask", href: "#ask" },
];

interface NavProps {
  mode: SlideMode;
  onModeChange: (m: SlideMode) => void;
  deckLength: DeckLength;
  onDeckLengthChange: (l: DeckLength) => void;
  onExportPDF?: () => void;
}

export default function Nav({ mode, onModeChange, deckLength, onDeckLengthChange, onExportPDF }: NavProps) {
  const progress = useReadingProgress();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent">
        <div
          className="h-full bg-sq-orange transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <nav
        className={`fixed top-[2px] left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-sq-dark/95 backdrop-blur-md border-b border-white/10 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo wordmark */}
            <a href="#hero" className="flex items-center gap-2 flex-shrink-0">
              <img src={iconSvg} alt="SquareUp" className="h-6 w-auto" />
              <span className="text-white font-black text-xl tracking-tight">
                Square<span className="text-sq-orange">Up</span>
              </span>
            </a>

            {/* Center: mode toggle */}
            <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-full p-1">
              {(["detailed", "presenter"] as SlideMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 capitalize ${
                    mode === m
                      ? "bg-sq-orange text-white shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="hidden md:flex items-center gap-3">
              {mode === "detailed" && (
                <button
                  onClick={onExportPDF}
                  className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  <Download size={14} /> PDF
                </button>
              )}
              <a
                href="mailto:hello@joinsquareup.com"
                className="bg-sq-orange hover:bg-sq-amber text-white font-bold text-sm px-4 py-2 rounded-full transition-colors"
              >
                Book a Meeting
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white p-1"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden bg-sq-dark/98 backdrop-blur-md border-t border-white/10 px-4 py-4 space-y-3">
            {/* Mode toggle mobile */}
            <div className="flex gap-2 mb-3">
              {(["detailed", "presenter"] as SlideMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { onModeChange(m); setOpen(false); }}
                  className={`flex-1 py-2 rounded-full text-sm font-bold capitalize transition-all ${
                    mode === m ? "bg-sq-orange text-white" : "bg-white/10 text-white/70"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block text-white/80 hover:text-white font-medium py-1"
              >
                {l.label}
              </a>
            ))}
            <a
              href="mailto:hello@joinsquareup.com"
              className="block bg-sq-orange text-white font-bold text-center py-2.5 rounded-full mt-3"
            >
              Book a Meeting
            </a>
          </div>
        )}
      </nav>
    </>
  );
}
