import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarNPDManager from "../avatars/AvatarNPDManager";
import type { SlideMode } from "@/lib/slides";

export default function CostSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="cost"
      className={`bg-sq-card ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-10 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          One wrong launch.{" "}
          <span className="text-sq-orange">Months of runway gone.</span>
        </h2>

        {/* Pull quote */}
        <blockquote
          className={`border-l-4 border-sq-orange pl-6 py-2 mb-10 max-w-2xl mx-auto transition-all duration-500 delay-100 ${revealed ? "opacity-100" : "opacity-0 translate-x-4"}`}
        >
          <p className="text-sq-text font-bold text-lg leading-relaxed italic">
            "We talked to 50+ leaders across Zepto, Meesho, Swiggy, Titan Consumer, Rebel Foods. Same story, every time."
          </p>
        </blockquote>

        <div className={`grid md:grid-cols-2 gap-6 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Without — red */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
            <p className="font-bold text-red-700 text-xs uppercase tracking-widest mb-5">Without real signal</p>
            <div className="space-y-3">
              {[
                "❌ Decision made on internal metrics + gut feel",
                "❌ Launch fails — wrong segment, wrong timing",
                "❌ 6 months of dev spend written off",
                "❌ Board trust eroded. Team morale hit.",
              ].map((item) => (
                <p key={item} className="text-red-800 text-sm">{item}</p>
              ))}
            </div>
          </div>

          {/* With — orange */}
          <div className="bg-orange-50 border border-sq-orange/20 rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-sq-orange" />
            <p className="font-bold text-sq-orange text-xs uppercase tracking-widest mb-5">With SquareUp</p>
            <div className="space-y-3">
              {[
                "✓ Risk flagged in week 1 — before you commit",
                "✓ Assumptions validated against real customer voice",
                "✓ Launch repositioned or cancelled before costly build",
                "✓ Team learns. Board sees velocity, not wreckage.",
              ].map((item) => (
                <p key={item} className="text-sq-text text-sm">{item}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Avatar */}
        {!isPresenter && (
          <div className={`flex justify-end mt-6 transition-all duration-700 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
            <AvatarNPDManager size={140} />
          </div>
        )}
      </div>
    </section>
  );
}
