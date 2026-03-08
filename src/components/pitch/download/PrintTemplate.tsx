import { useEffect, useState } from "react";
import type { SlideDefinition } from "@/lib/slides";
import { SLIDE_COMPONENTS } from "@/lib/slideComponents";

interface PrintTemplateProps {
    slides: SlideDefinition[];
    onFinish: () => void;
}

export default function PrintTemplate({ slides, onFinish }: PrintTemplateProps) {
    const [ready, setReady] = useState(false);

    // Force all lazy images to load eagerly, then wait for them
    useEffect(() => {
        // Step 1: Override loading="lazy" to "eager" and force reload
        const images = document.querySelectorAll(".print-only img");
        images.forEach((img) => {
            const el = img as HTMLImageElement;
            if (el.loading === "lazy") {
                el.loading = "eager";
                // Force the browser to re-fetch by resetting src
                const src = el.src;
                el.src = "";
                el.src = src;
            }
        });

        // Step 2: Wait for ALL images to finish loading
        const waitForImages = () => {
            const allImages = document.querySelectorAll(".print-only img");
            const promises = Array.from(allImages).map((img) => {
                const el = img as HTMLImageElement;
                if (el.complete && el.naturalWidth > 0) return Promise.resolve();
                return new Promise<void>((resolve) => {
                    el.onload = () => resolve();
                    el.onerror = () => resolve();
                });
            });
            Promise.all(promises).then(() => {
                setTimeout(() => setReady(true), 2000);
            });
        };

        // Small delay to let the DOM update after src reset
        setTimeout(waitForImages, 100);

        // Fallback: ready after 5s no matter what
        const t = setTimeout(() => setReady(true), 5000);
        return () => clearTimeout(t);
    }, []);

    const handlePrint = () => {
        window.print();
        onFinish();
    };

    return (
        <div className="print-only" style={{ background: "#0a0a0f" }}>
            {/* Instruction overlay — hidden during print via CSS */}
            <div className="print-instructions fixed inset-0 z-[9999] flex items-center justify-center"
                style={{ background: "rgba(10,10,15,0.98)" }}>
                <div className="max-w-md w-full mx-6 rounded-2xl p-8 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>

                    {!ready ? (
                        <>
                            <div className="mb-5 mx-auto rounded-full animate-spin"
                                style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "hsl(var(--sq-orange))" }} />
                            <p className="text-white font-bold text-base">Loading all images…</p>
                            <p className="text-white/40 text-xs mt-2">Preparing {slides.length} slides</p>
                        </>
                    ) : (
                        <>
                            <div className="mb-5 mx-auto flex items-center justify-center rounded-full"
                                style={{ width: 52, height: 52, background: "hsl(var(--sq-orange) / 0.15)" }}>
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="hsl(var(--sq-orange))" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-6-6m6 6l6-6M5 19h14" />
                                </svg>
                            </div>

                            <h2 className="text-white text-xl font-black mb-2">Save as PDF</h2>
                            <p className="text-white/50 text-sm mb-6">
                                {slides.length} slides ready. Follow these steps:
                            </p>

                            <div className="text-left space-y-3 mb-8">
                                <div className="flex gap-3 items-start">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                                        style={{ background: "hsl(var(--sq-orange))", color: "white" }}>1</span>
                                    <p className="text-white/70 text-sm">Set <strong className="text-white">Destination</strong> to <strong className="text-white">"Save as PDF"</strong></p>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                                        style={{ background: "hsl(var(--sq-orange))", color: "white" }}>2</span>
                                    <p className="text-white/70 text-sm">Open <strong className="text-white">"More settings"</strong> and check <strong className="text-white">"Background graphics"</strong></p>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                                        style={{ background: "hsl(var(--sq-orange))", color: "white" }}>3</span>
                                    <p className="text-white/70 text-sm">Click <strong className="text-white">"Save"</strong></p>
                                </div>
                            </div>

                            <button onClick={handlePrint}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                                style={{ background: "linear-gradient(135deg, hsl(var(--sq-orange)), hsl(var(--sq-amber)))" }}>
                                Open Print Dialog
                            </button>
                            <button onClick={onFinish}
                                className="mt-4 text-white/30 hover:text-white/60 text-xs transition-colors">
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Slides */}
            {slides.map((slide, i) => {
                const Comp = SLIDE_COMPONENTS[slide.id];
                if (!Comp) return null;
                return (
                    <div key={i} className="print-slide">
                        <Comp mode="presenter" />
                    </div>
                );
            })}
        </div>
    );
}
