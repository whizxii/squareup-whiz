import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarOverwhelmed from "../avatars/AvatarOverwhelmed";
import type { SlideMode } from "@/lib/slides";

const PAIN_CARDS = [
  {
    icon: "📅",
    title: "Scheduling is a nightmare",
    body: "Coordinating 10 customer calls takes a week. Teams give up before they start.",
  },
  {
    icon: "🎙️",
    title: "Insights rot in recordings",
    body: "Hours of audio, never properly transcribed, never acted on. Knowledge dies in folders.",
  },
  {
    icon: "🔀",
    title: "Data lives in 5 silos",
    body: "Calls, tickets, reviews, socials, internal reports — all disconnected. No single source of truth.",
  },
];

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="problem"
      className={`bg-sq-off-white ${isPresenter ? "h-full flex items-center px-20" : "py-24 px-6"}`}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>
        <div className={`${isPresenter ? "grid grid-cols-2 gap-16 items-center" : "space-y-14"}`}>
          {/* Left: copy */}
          <div>
            <h2
              className={`font-black text-sq-text tracking-tight leading-tight ${
                isPresenter ? "text-5xl mb-10" : "text-3xl sm:text-4xl lg:text-5xl mb-10"
              } ${revealed ? "animate-fade-up" : "opacity-0"}`}
            >
              Every brand says they talk to customers.{" "}
              <span className="text-sq-orange">Almost none do it enough to matter.</span>
            </h2>

            <div className={`${isPresenter ? "space-y-4" : "grid sm:grid-cols-3 gap-5"}`}>
              {PAIN_CARDS.map((c, i) => (
                <div
                  key={c.title}
                  className={`bg-sq-card rounded-2xl p-5 shadow-sm border border-sq-subtle transition-all duration-500 ${
                    revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: `${150 + i * 120}ms` }}
                >
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <h3 className="font-bold text-sq-text text-sm mb-1">{c.title}</h3>
                  <p className="text-sq-muted text-sm leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>

            <p
              className={`mt-8 font-bold text-sq-orange text-lg leading-snug transition-all duration-500 delay-500 ${
                revealed ? "opacity-100" : "opacity-0"
              }`}
            >
              So decisions default to intuition. And intuition scales poorly.
            </p>
          </div>

          {/* Right: avatar */}
          <div
            className={`flex justify-center transition-all duration-700 delay-300 ${
              isPresenter ? "" : "hidden lg:flex"
            } ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
          >
            <AvatarOverwhelmed size={isPresenter ? 300 : 260} />
          </div>
        </div>
      </div>
    </section>
  );
}
