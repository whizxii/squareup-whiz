import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import paramImg from "@/assets/param.png";
import kunjImg from "@/assets/kunj.png";
import mesaLogo from "@/assets/mesa-logo.png";

const TEAM = [
  {
    name: "Param Jain",
    role: "Co-Founder · Product & AI",
    tags: ["Ex–EA Sports", "AI/ML", "Voice AI", "Full-Stack"],
    bio: "Ran 100 Ascent and shipped built product at scale at EA. Faced the same customer insight gap firsthand while making global products. Built SquareUp's entire stack — voice agent, real-time synthesis, Insight generation and routing engine — from first line of code to working MVP in 15 days.",
    linkedin: "https://www.linkedin.com/in/param-jain/",
    photo: paramImg,
    achievements: [
      { stat: "EA", label: "Global Scale" },
      { stat: "15d", label: "Code → MVP" },
      { stat: "Solo", label: "Full AI Stack" },
    ],
  },
  {
    name: "Kunj Dhamsaniya",
    role: "Co-Founder · GTM & Strategy",
    tags: ["D2C Founder", "Consumer Brands", "GTM", "Ops"],
    bio: "Founded and scaled Ollymix, a D2C consumer brand — lived the exact pain of making decisions on instinct because real customer data was too slow or didn't exist. Validated the problem across 50+ leaders at Zepto, Swiggy, Meesho, and Titan. Signed 6 pilots and built the MVP in 90 days.",
    linkedin: "https://linkedin.com/in/kunjdhamsaniya/",
    photo: kunjImg,
    achievements: [
      { stat: "1", label: "D2C Brand Built" },
      { stat: "50+", label: "Leaders Validated" },
      { stat: "6", label: "Pilots Signed" },
    ],
  },
];

const WHY_THIS_TEAM = [
  {
    title: "Founder-Market Fit",
    desc: "Both founders ran consumer brands. Both hit the same wall — decisions made on instinct, not data. They proved 50+ other leaders feel the same pain.",
  },
  {
    title: "Execution Speed",
    desc: "Founded Dec '25. MVP shipped in 15 days. 6 pilots signed by Mar '26. This team doesn't theorize — it ships.",
  },
  {
    title: "Zero Overlap",
    desc: "One builds the AI. One sells the product. Complementary by design.",
  },
];

/* ── Presenter / export-safe card style (no backdrop-filter) ── */
const GLASS_PRINT_SAFE: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
};

/* ── Presenter-mode photo border (simple solid, no backgroundClip tricks) ── */
const PHOTO_BORDER_SAFE: React.CSSProperties = {
  border: "3px solid hsl(25, 95%, 53%)",
};

export default function TeamSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  /* ═══════════════════════════════════════════
   * PRESENTER MODE — fully print-safe layout
   * No backdrop-filter, no gradient-text, no lazy,
   * no flex-center on section, no absolute orbs.
   * ═══════════════════════════════════════════ */
  if (isPresenter) {
    return (
      <section
        id="team"
        style={{
          background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a12 100%)",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: "40px 64px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <p style={{ color: "hsl(25, 95%, 53%)", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" }}>
              The Founders
            </p>
            <h2 style={{ color: "white", fontWeight: 900, fontSize: "1.85rem", lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0 }}>
              One lived the problem.{" "}
              <br />
              <span style={{ color: "hsl(25, 95%, 53%)" }}>One built the engine.</span>
            </h2>
          </div>

          {/* Founder cards — side by side */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
            {TEAM.map((member) => (
              <div key={member.name} style={{ ...GLASS_PRINT_SAFE, flex: "1 1 0%", borderRadius: "16px", overflow: "hidden" }}>

                {/* Photo + identity */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px 8px" }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: "72px", height: "72px", borderRadius: "14px", overflow: "hidden", ...PHOTO_BORDER_SAFE }}>
                      <img
                        src={member.photo}
                        alt={member.name}
                        loading="eager"
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 style={{ color: "white", fontWeight: 900, fontSize: "15px", lineHeight: 1.2, margin: "0 0 2px" }}>{member.name}</h3>
                    <p style={{ color: "hsl(25, 95%, 53%)", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{member.role}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {member.tags.map((t) => (
                        <span key={t} style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Achievement stats */}
                <div style={{ padding: "4px 16px 14px", display: "flex", gap: "16px" }}>
                  {member.achievements.map((a) => (
                    <div key={a.label}>
                      <div style={{ color: "hsl(25, 95%, 53%)", fontWeight: 900, fontSize: "18px", textShadow: "0 0 40px rgba(249, 115, 22, 0.25)" }}>
                        {a.stat}
                      </div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Why this team wins */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            {WHY_THIS_TEAM.map((item) => (
              <div key={item.title} style={{ ...GLASS_PRINT_SAFE, flex: "1 1 0%", borderRadius: "12px", padding: "10px 14px" }}>
                <p style={{ color: "hsl(25, 95%, 53%)", fontWeight: 900, fontSize: "10px", margin: "0 0 2px" }}>{item.title}</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "9px", lineHeight: 1.4, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Founder truth — emotional anchor */}
          <div style={{
            ...GLASS_PRINT_SAFE,
            borderRadius: "12px",
            padding: "10px 20px",
            textAlign: "center",
            marginBottom: "12px",
            maxWidth: "700px",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            <p style={{ color: "hsl(25, 95%, 53%)", fontWeight: 900, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 4px" }}>
              The Honest Truth
            </p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
              "The number one reason our past ventures failed?{" "}
              <span style={{ color: "white", fontWeight: 800 }}>We didn't understand our customers deeply enough.</span>{" "}
              SquareUp exists so no founder makes that mistake again."
            </p>
          </div>

          {/* Mesa badge */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ ...GLASS_PRINT_SAFE, display: "flex", alignItems: "center", gap: "10px", borderRadius: "12px", padding: "6px 16px" }}>
              <img src={mesaLogo} alt="Mesa" style={{ height: "16px", width: "auto" }} loading="eager" />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Mesa School of Business — backed by Elevation Capital</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════════
   * DETAILED MODE — original interactive layout
   * ═══════════════════════════════════════════ */
  return (
    <section
      id="team"
      className="relative overflow-hidden py-32 px-6 sm:px-16"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a12 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-20 right-20 w-[400px] h-[400px] rounded-full sq-orb pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-orange) / 0.06) 0%, transparent 70%)" }} />
      <div className="absolute bottom-20 left-10 w-[300px] h-[300px] rounded-full sq-orb pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-amber) / 0.04) 0%, transparent 70%)", animationDelay: "5s" }} />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      <div className="max-w-6xl mx-auto w-full relative z-10" ref={ref}>

        {/* Header */}
        <div className={`mb-14 text-center transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Founders
          </p>
          <h2
            className="font-black tracking-tight leading-[1.0] mb-2 text-[2.5rem] sm:text-[3.2rem]"
            style={{ color: "white" }}
          >
            One lived the problem.{" "}
            <br />
            <span className="sq-gradient-text">One built the engine.</span>
          </h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto">
            Met at Mesa. Quit everything. Full-time since day one.
          </p>
        </div>

        {/* Founder-Market Fit narrative */}
        <div className="rounded-2xl px-8 py-6 mb-10 max-w-3xl mx-auto transition-all duration-700 delay-100"
          style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.2)", opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(24px)" }}>
          <p className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: "hsl(var(--sq-orange))" }}>
            Why us
          </p>
          <p className="text-sm font-medium leading-relaxed text-white/70">
            Kunj{" "}
            <span className="font-bold text-white">ran a D2C brand</span>.
            He had to make a lot of decisions on instinct because real customer data was too slow, too expensive, or didn't exist.
            Param faced the same problem while{" "}
            <span className="font-bold text-white">running 100 Ascent</span>.
            That frustration became SquareUp. We validated the pain with{" "}
            <span className="font-bold text-white">50+ brand leaders</span>, signed{" "}
            <span className="font-bold text-white">6 pilots</span>, and built our MVP in 90 days.
          </p>
        </div>

        {/* Founder cards */}
        <div
          className={`grid md:grid-cols-2 gap-6 mb-10 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {TEAM.map((member, idx) => (
            <div key={member.name}
              className="sq-glass rounded-3xl overflow-hidden transition-all duration-500"
              style={{ transitionDelay: `${idx * 150}ms` }}
            >
              {/* Photo + identity header */}
              <div className="flex items-center gap-6 px-8 py-7">
                <div className="flex-shrink-0">
                  <div className="w-[140px] h-[140px] rounded-2xl overflow-hidden"
                    style={{
                      border: "3px solid transparent",
                      backgroundImage: "linear-gradient(#0d1117, #0d1117), linear-gradient(135deg, hsl(var(--sq-orange)), hsl(var(--sq-amber)))",
                      backgroundOrigin: "border-box",
                      backgroundClip: "padding-box, border-box",
                      boxShadow: "0 0 40px hsl(var(--sq-orange) / 0.2)",
                    }}>
                    <img src={member.photo} alt={member.name}
                      className="w-full h-full object-cover object-top" loading="lazy" />
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-xl text-white leading-tight mb-0.5">{member.name}</h3>
                  <p className="font-bold text-xs uppercase tracking-wider mb-1.5"
                    style={{ color: "hsl(var(--sq-orange))" }}>{member.role}</p>
                  <div className="flex flex-wrap gap-1">
                    {member.tags.map((t) => (
                      <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="px-8 pb-4">
                <p className="text-sm leading-relaxed text-white/50">{member.bio}</p>
              </div>

              {/* Achievement stats */}
              <div className="px-8 pb-5 pt-2">
                <div className="flex gap-6">
                  {member.achievements.map((a) => (
                    <div key={a.label}>
                      <div className="font-black text-2xl sq-glow-text" style={{ color: "hsl(var(--sq-orange))" }}>
                        {a.stat}
                      </div>
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{a.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LinkedIn */}
              <div className="px-8 pb-7">
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                  className="font-bold text-xs hover:underline"
                  style={{ color: "hsl(var(--sq-orange))" }}>
                  LinkedIn →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Why this team wins */}
        <div
          className={`grid sm:grid-cols-3 gap-4 mb-10 transition-all duration-700 delay-300 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {WHY_THIS_TEAM.map((item) => (
            <div key={item.title} className="sq-glass rounded-2xl px-6 py-5">
              <p className="font-black text-sm mb-0.5" style={{ color: "hsl(var(--sq-orange))" }}>{item.title}</p>
              <p className="text-xs leading-relaxed text-white/50">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Founder truth — emotional anchor */}
        <div className={`rounded-2xl px-8 py-6 mb-10 max-w-3xl mx-auto text-center transition-all duration-700 delay-150 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}>
          <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: "hsl(var(--sq-orange))" }}>
            The Honest Truth
          </p>
          <p className="text-base font-semibold leading-relaxed text-white/70">
            "The number one reason our past ventures failed?{" "}
            <span className="font-bold text-white">We didn't understand our customers deeply enough.</span>{" "}
            SquareUp exists so no founder makes that mistake again."
          </p>
        </div>

        {/* Mesa badge */}
        <div className={`flex justify-center transition-all duration-700 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="sq-glass flex items-center gap-3 rounded-xl px-5 py-2.5">
            <img src={mesaLogo} alt="Mesa" className="h-5 w-auto object-contain" />
            <span className="text-xs font-bold text-white/60">Mesa School of Business — backed by Elevation Capital</span>
          </div>
        </div>
      </div>
    </section>
  );
}
