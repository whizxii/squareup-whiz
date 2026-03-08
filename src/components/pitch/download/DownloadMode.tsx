import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { DECK_LENGTHS, type DeckLength, getSlidesForLength, type SlideDefinition } from "@/lib/slides";

interface DownloadModeProps {
    onDownloadPDF: (slides: SlideDefinition[]) => void;
}

const DECK_LABELS: Record<DeckLength, string> = { 8: "Pitch", 12: "Deep Dive" };

export default function DownloadMode({ onDownloadPDF }: DownloadModeProps) {
    const [deckLength, setDeckLength] = useState<DeckLength>(8);
    const selectedSlides = getSlidesForLength(deckLength);

    return (
        <div className="pt-24 pb-20 min-h-screen bg-[hsl(var(--sq-off-white))] flex flex-col items-center">
            <div className="max-w-4xl w-full px-6">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-[hsl(var(--sq-text))] tracking-tight mb-4">
                        Download the Pitch
                    </h1>
                    <p className="text-lg text-[hsl(var(--sq-muted))] max-w-xl mx-auto">
                        Select how much time you have, and we'll generate a custom PDF deck covering exactly what you need to know.
                    </p>
                </div>

                {/* Length Selector */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {DECK_LENGTHS.map((len) => (
                        <button
                            key={len}
                            onClick={() => setDeckLength(len)}
                            className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${deckLength === len
                                ? "bg-[hsl(var(--sq-orange))] text-white shadow-md shadow-[hsl(var(--sq-orange)/0.2)]"
                                : "bg-[hsl(var(--sq-card))] text-[hsl(var(--sq-muted))] border border-[hsl(var(--sq-subtle))] hover:border-[hsl(var(--sq-text))]"
                                }`}
                        >
                            {DECK_LABELS[len]}
                        </button>
                    ))}
                </div>

                {/* Preview Grid */}
                <div className="bg-[hsl(var(--sq-card))] border border-[hsl(var(--sq-subtle))] rounded-2xl p-8 mb-10 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-[hsl(var(--sq-text))] flex items-center gap-2">
                            <FileText size={18} className="text-[hsl(var(--sq-orange))]" />
                            Deck Preview
                        </h3>
                        <span className="text-sm font-semibold px-3 py-1 bg-[hsl(var(--sq-subtle))] text-[hsl(var(--sq-muted))] rounded-full">
                            {selectedSlides.length} Pages
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {selectedSlides.map((slide, i) => (
                            <div key={slide.id} className="aspect-video bg-[hsl(var(--sq-off-white))] rounded-lg border border-[hsl(var(--sq-subtle))] flex items-center justify-center p-2 text-center text-xs font-semibold text-[hsl(var(--sq-muted))]">
                                <div className="opacity-60">{i + 1}. {slide.title}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Download Action */}
                <div className="flex justify-center">
                    <button
                        onClick={() => onDownloadPDF(selectedSlides)}
                        className="px-8 py-4 bg-[hsl(var(--sq-text))] hover:opacity-90 text-white font-bold rounded-xl flex items-center gap-3 transition-all shadow-lg"
                    >
                        <Download size={20} />
                        Download PDF — {DECK_LABELS[deckLength]} ({selectedSlides.length} Slides)
                    </button>
                </div>

            </div>
        </div>
    );
}
