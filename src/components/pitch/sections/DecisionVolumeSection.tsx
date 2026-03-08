import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import { Zap, RefreshCcw, Search, BarChart } from "lucide-react";

export default function DecisionVolumeSection({ mode = "detailed" }: { mode?: SlideMode }) {
    const isPresenter = mode === "presenter";
    const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

    return (
        <section
            id="decisionvolume"
            className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
            style={{ background: "hsl(var(--sq-card))" }}
        >
            <div className="max-w-6xl mx-auto w-full" ref={ref}>

                <div className={`text-center ${isPresenter ? "mb-8" : "mb-16"} transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                    <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
                        The Frequency
                    </p>
                    <h2
                        className={`font-black tracking-tight leading-tight mb-4 ${isPresenter ? "text-5xl" : "text-4xl sm:text-5xl"}`}
                        style={{ color: "hsl(var(--sq-text))" }}
                    >
                        This is not an annual research problem.<br />
                        <span style={{ color: "hsl(var(--sq-orange))" }}>It is a weekly operating problem.</span>
                    </h2>
                    {!isPresenter && (
                        <p className="text-lg font-medium max-w-2xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
                            In a typical consumer brand, high-stakes customer decisions happen every week. Most deserve fast validation. Very few get it.
                        </p>
                    )}
                </div>

                <div className={`grid ${isPresenter ? "grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"} gap-4 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    {[
                        { icon: Zap, title: "Product & Concept", desc: "New product launches, feature prioritization, category expansion validation." },
                        { icon: BarChart, title: "Pricing & Packaging", desc: "Price-pack architecture, discounting strategies, format shifting." },
                        { icon: Search, title: "Messaging & Positioning", desc: "Campaign diagnosis, repositioning cohorts, creative testing." },
                        { icon: RefreshCcw, title: "CX & Retention", desc: "Churn diagnosis, repeat-purchase barriers, core complaint analysis." }
                    ].map((item, i) => (
                        <div key={i} className={`${isPresenter ? "p-4" : "p-6"} rounded-2xl border`} style={{ backgroundColor: "hsl(var(--sq-off-white))", borderColor: "hsl(var(--sq-subtle))" }}>
                            <div className={`${isPresenter ? "w-10 h-10 mb-3" : "w-12 h-12 mb-5"} rounded-xl flex items-center justify-center`} style={{ background: "hsl(var(--sq-orange)/0.1)", border: "1px solid hsl(var(--sq-orange)/0.2)" }}>
                                <item.icon className="text-[hsl(var(--sq-orange))]" size={isPresenter ? 16 : 20} />
                            </div>
                            <h4 className={`font-bold ${isPresenter ? "text-base mb-1" : "text-lg mb-2"}`} style={{ color: "hsl(var(--sq-text))" }}>{item.title}</h4>
                            <p className={`${isPresenter ? "text-xs" : "text-sm"} font-medium leading-relaxed`} style={{ color: "hsl(var(--sq-muted))" }}>{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Volume stat */}
                <div className={`${isPresenter ? "mt-6" : "mt-12"} text-center transition-all duration-700 delay-400 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                    <div className="inline-block rounded-2xl px-8 py-5"
                      style={{ background: "hsl(var(--sq-orange)/0.06)", border: "1px solid hsl(var(--sq-orange)/0.2)" }}>
                      <p className="font-black sq-glow-text leading-none" style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", color: "hsl(var(--sq-orange))" }}>10–30</p>
                      <p className={`font-bold ${isPresenter ? "text-xs" : "text-sm"} mt-2 max-w-sm`} style={{ color: "hsl(var(--sq-text))" }}>
                        high-stakes customer decisions per quarter across product, pricing, growth, and CX
                      </p>
                      <p className="text-[10px] font-medium italic mt-1.5" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>
                        Based on operator interviews with 50+ brand leaders
                      </p>
                    </div>
                </div>

                {!isPresenter && (
                <div className={`mt-8 text-center transition-all duration-700 delay-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                    <p className="text-[13px] font-semibold max-w-2xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
                        The status quo forces brands to reserve deep customer work for only a few "important" moments, when in reality many more decisions deserve it.
                    </p>
                </div>
                )}

            </div>
        </section>
    );
}
