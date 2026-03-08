import { useState, useRef } from "react";
import { X, Play, Download, GripVertical, Plus } from "lucide-react";
import { ALL_SLIDES, type SlideDefinition, getSlidesForLength } from "@/lib/slides";

interface PresenterBuilderProps {
    onStartPresentation: (slides: SlideDefinition[]) => void;
    onDownloadPDF: (slides: SlideDefinition[]) => void;
    onExit: () => void;
}

export default function PresenterBuilder({ onStartPresentation, onDownloadPDF, onExit }: PresenterBuilderProps) {
    const [selectedSlides, setSelectedSlides] = useState<SlideDefinition[]>(() => {
        return getSlidesForLength(8);
    });

    // Drag state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragCounter = useRef(0);

    const availableSlides = ALL_SLIDES.filter((s) => !selectedSlides.find((sel) => sel.id === s.id));

    // Smart insertion: insert at canonical position
    const addSlide = (slide: SlideDefinition) => {
        const canonicalIndex = ALL_SLIDES.findIndex((s) => s.id === slide.id);
        let insertAt = selectedSlides.length;
        for (let i = 0; i < selectedSlides.length; i++) {
            const currentCanonical = ALL_SLIDES.findIndex((s) => s.id === selectedSlides[i].id);
            if (canonicalIndex < currentCanonical) {
                insertAt = i;
                break;
            }
        }
        const newSlides = [...selectedSlides];
        newSlides.splice(insertAt, 0, slide);
        setSelectedSlides(newSlides);
    };

    const removeSlide = (id: string) => {
        setSelectedSlides(selectedSlides.filter((s) => s.id !== id));
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        // Delay so the dragged element renders before opacity changes
        requestAnimationFrame(() => setDragIndex(index));
    };

    const handleDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        dragCounter.current++;
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setDragOverIndex(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        dragCounter.current = 0;
        if (dragIndex === null || dragIndex === dropIndex) {
            resetDrag();
            return;
        }
        const newSlides = [...selectedSlides];
        const [moved] = newSlides.splice(dragIndex, 1);
        const adjustedIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
        newSlides.splice(adjustedIndex, 0, moved);
        setSelectedSlides(newSlides);
        resetDrag();
    };

    const resetDrag = () => {
        setDragIndex(null);
        setDragOverIndex(null);
        dragCounter.current = 0;
    };

    const handleDragEnd = () => {
        resetDrag();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[hsl(var(--sq-off-white))] flex flex-col md:flex-row overflow-hidden">

            {/* Left panel: Builder controls */}
            <div className="w-full md:w-[400px] border-r border-[hsl(var(--sq-subtle))] bg-[hsl(var(--sq-card))] flex flex-col h-full shrink-0">
                <div className="p-6 border-b border-[hsl(var(--sq-subtle))] flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-[hsl(var(--sq-text))]">Build your deck</h2>
                        <p className="text-sm text-[hsl(var(--sq-muted))] mt-1">{selectedSlides.length} slides selected</p>
                    </div>
                    <button onClick={onExit} className="p-2 rounded-full hover:bg-[hsl(var(--sq-subtle))] transition-colors">
                        <X size={20} className="text-[hsl(var(--sq-text))]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Selected Slides */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--sq-muted))] mb-4">Included Slides</h3>
                        <div className="space-y-1">
                            {selectedSlides.map((slide, i) => (
                                <div key={slide.id}>
                                    {/* Drop indicator above */}
                                    {dragIndex !== null && dragOverIndex === i && dragIndex !== i && dragIndex !== i - 1 && (
                                        <div className="h-[2px] mx-3 rounded-full mb-1" style={{ background: "hsl(var(--sq-orange))" }} />
                                    )}
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, i)}
                                        onDragEnter={(e) => handleDragEnter(e, i)}
                                        onDragLeave={handleDragLeave}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, i)}
                                        onDragEnd={handleDragEnd}
                                        className={`group flex items-center gap-3 p-3 bg-[hsl(var(--sq-off-white))] border border-[hsl(var(--sq-subtle))] rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150 ${
                                            dragIndex === i ? "opacity-40 scale-[0.97]" : "opacity-100"
                                        }`}
                                    >
                                        <GripVertical size={16} className="text-[hsl(var(--sq-muted))] flex-shrink-0 group-hover:text-[hsl(var(--sq-text))]" />
                                        <span className="text-xs font-bold text-[hsl(var(--sq-muted))] w-5 flex-shrink-0">{i + 1}</span>
                                        <div className="flex-1 font-semibold text-[14px] text-[hsl(var(--sq-text))]">{slide.title}</div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                                            className="p-1.5 text-[hsl(var(--sq-muted))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {/* Drop indicator at end */}
                            {dragIndex !== null && dragOverIndex === selectedSlides.length && (
                                <div className="h-[2px] mx-3 rounded-full mt-1" style={{ background: "hsl(var(--sq-orange))" }} />
                            )}
                            {/* Invisible drop zone at end */}
                            {dragIndex !== null && (
                                <div
                                    className="h-8"
                                    onDragEnter={(e) => handleDragEnter(e, selectedSlides.length)}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, selectedSlides.length)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Available Slides */}
                    {availableSlides.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--sq-muted))] mb-4">Available Slides</h3>
                            <div className="space-y-2 opacity-70">
                                {availableSlides.map((slide) => (
                                    <button
                                        key={slide.id}
                                        onClick={() => addSlide(slide)}
                                        className="w-full flex items-center justify-between p-3 border border-transparent hover:border-[hsl(var(--sq-subtle))] hover:bg-[hsl(var(--sq-off-white))] rounded-xl transition-all text-left group"
                                    >
                                        <span className="font-semibold text-[14px] text-[hsl(var(--sq-text))]">{slide.title}</span>
                                        <Plus size={16} className="text-[hsl(var(--sq-muted))] group-hover:text-[hsl(var(--sq-orange))]" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Panel */}
                <div className="p-6 border-t border-[hsl(var(--sq-subtle))] bg-[hsl(var(--sq-card))] space-y-3 shrink-0">
                    <button
                        onClick={() => onStartPresentation(selectedSlides)}
                        disabled={selectedSlides.length === 0}
                        className="w-full py-3.5 bg-[hsl(var(--sq-orange))] hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Play size={18} fill="currentColor" /> Present Fullscreen
                    </button>
                    <button
                        onClick={() => onDownloadPDF(selectedSlides)}
                        disabled={selectedSlides.length === 0}
                        className="w-full py-3.5 bg-transparent border-2 border-[hsl(var(--sq-subtle))] hover:border-[hsl(var(--sq-text))] text-[hsl(var(--sq-text))] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Download size={18} /> Download PDF
                    </button>
                </div>
            </div>

            {/* Right panel: Preview area */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 bg-[hsl(var(--sq-off-white))] overflow-y-auto">
                <div className="w-full max-w-4xl grid grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                    {selectedSlides.map((slide, i) => (
                        <div
                            key={slide.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, i)}
                            onDragEnter={(e) => handleDragEnter(e, i)}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, i)}
                            onDragEnd={handleDragEnd}
                            className={`relative aspect-video bg-[hsl(var(--sq-card))] rounded-xl shadow-sm border overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150 ${
                                dragIndex === i
                                    ? "opacity-40 scale-95 border-[hsl(var(--sq-subtle))]"
                                    : dragOverIndex === i && dragIndex !== null && dragIndex !== i
                                    ? "border-[hsl(var(--sq-orange))] shadow-[0_0_0_2px_hsl(var(--sq-orange)/0.3)]"
                                    : "border-[hsl(var(--sq-subtle))]"
                            }`}
                        >
                            <div className="absolute top-2 left-2 w-6 h-6 rounded-md bg-[hsl(var(--sq-subtle))] flex items-center justify-center text-xs font-bold text-[hsl(var(--sq-text))] shadow-sm">
                                {i + 1}
                            </div>
                            <span className="font-bold text-[hsl(var(--sq-muted))] text-sm px-4 text-center">{slide.title}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
