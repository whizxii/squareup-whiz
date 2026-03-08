import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import { Mic2, BrainCircuit, Database, Layers } from "lucide-react";
import avatarHeroMain from "@/assets/avatar-hero-main.png";

const PILLARS = [
  { icon: Mic2, title: "1. Interview Layer", desc: "AI-led customer conversations at scale. Natural language, multilingual, consistent." },
  { icon: BrainCircuit, title: "2. Synthesis Layer", desc: "Extracts themes, severity scores, quotes, contradictions, and risk flags instantly." },
  { icon: Database, title: "3. Repository Layer", desc: "A searchable memory of customer truth, tied back natively to past launch decisions." },
  { icon: Layers, title: "4. Routing Layer", desc: "Growth gets campaign inputs. Product gets launch risks. CX gets priority fixes." },
];

export default function SolutionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="solution"
      className={`relative overflow-hidden ${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      {/* Character — hero-quality, at section level so it's behind content */}
      <div className="absolute right-8 bottom-0 hidden lg:block pointer-events-none animate-avatar-float z-[1]" style={{ animationDelay: "1.5s" }}>
        <img
          src={avatarHeroMain}
          alt=""
          loading="lazy"
          style={{
            width: 220,
            height: "auto",
            objectFit: "contain",
            maskImage: "linear-gradient(to top, transparent 0%, white 12%)",
            WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 12%)",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 w-full" ref={ref}>

        <div className={`${isPresenter ? "mb-8" : "mb-16"} text-center transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(var(--sq-orange))" }}>
            The Category
          </p>
          <p className={`font-semibold ${isPresenter ? "text-sm" : "text-base"} mb-4`} style={{ color: "hsl(var(--sq-muted))" }}>
            Customer understanding should not be an occasional project. It should be a compounding system.
          </p>
          <h2
            className={`font-black tracking-tight leading-[1.05] mx-auto ${isPresenter ? "text-5xl max-w-4xl" : "sq-headline max-w-5xl"
              }`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            The <span style={{ color: "hsl(var(--sq-orange))" }}>customer understanding department</span> most brands never build.
          </h2>
          {!isPresenter && (
            <p className="mt-6 text-lg font-medium max-w-3xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
              The gap is not lack of conversations — it's the lack of a customer intelligence system.
              SquareUp generates fresh signal on demand, synthesizes it into decision-ready briefs, and routes truth to the right team — with a full audit trail.
            </p>
          )}
        </div>

        <div className={`grid ${isPresenter ? "grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"} gap-6 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {PILLARS.map((p, i) => (
            <div key={i} className={`rounded-2xl ${isPresenter ? "p-4" : "p-6"} border flex flex-col items-start hover:-translate-y-1 transition-transform duration-300`}
              style={{
                background: "hsl(var(--sq-off-white))",
                borderColor: "hsl(var(--sq-subtle))",
                boxShadow: "0 8px 30px rgba(0,0,0,0.03)"
              }}
            >
              <div className={`${isPresenter ? "w-10 h-10 mb-3" : "w-14 h-14 mb-6"} rounded-xl flex items-center justify-center`} style={{ background: "linear-gradient(135deg, hsl(var(--sq-orange)), hsl(var(--sq-text)))" }}>
                <p.icon className="text-white" size={isPresenter ? 18 : 24} />
              </div>
              <h3 className={`font-black ${isPresenter ? "text-base mb-2" : "text-xl mb-3"}`} style={{ color: "hsl(var(--sq-text))" }}>{p.title}</h3>
              <p className={`${isPresenter ? "text-xs" : "text-sm"} font-medium leading-relaxed`} style={{ color: "hsl(var(--sq-muted))" }}>{p.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
