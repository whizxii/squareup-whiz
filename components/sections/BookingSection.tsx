"use client";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Clock,
  Video,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
} from "lucide-react";
import Reveal from "../ui/Reveal";

export default function BookingSection() {
  const [selectedDate, setSelectedDate] = useState<number | null>(18);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);


  const sectionRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, {
    stiffness: 60,
    damping: 25,
    mass: 0.5,
  });
  const smoothMouseY = useSpring(mouseY, {
    stiffness: 60,
    damping: 25,
    mass: 0.5,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!sectionRef.current || !e.touches[0]) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      mouseX.set(x);
      mouseY.set(y);
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener("mousemove", handleMouseMove);
      section.addEventListener("touchmove", handleTouchMove, { passive: true });
      return () => {
        section.removeEventListener("mousemove", handleMouseMove);
        section.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [mouseX, mouseY]);


  const daysInMonth = 30;
  const startOffset = 3;
  const daysArray = Array.from({ length: 42 }, (_, i) => {
    const dateStr = i - startOffset + 1;
    return dateStr > 0 && dateStr <= daysInMonth ? dateStr : null;
  });

  const timeSlots = [
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "1:30 PM",
    "2:00 PM",
    "3:30 PM",
    "4:00 PM",
  ];

  return (
    <motion.section
      id="book-call"
      className="py-12 sm:py-16 lg:py-24 relative overflow-hidden group"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
        e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
      }}
    >
      {}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,235,225,0.6) 0%, transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[100px] bg-[#FF5A36]/5 z-0 pointer-events-none" />

      {}
      <motion.div animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-[#FF5A36]/10 z-0 pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.5], opacity: [0.4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[#fc7c62]/10 z-0 pointer-events-none" />

      {}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 mix-blend-normal animate-in fade-in"
        style={{
          background: `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(255,90,54,0.4) 0%, rgba(255,109,64,0.1) 40%, transparent 60%)`,
        }}
      />

      <div className="max-w-[1000px] mx-auto px-6 relative z-10 flex flex-col items-center">
        <Reveal width="100%">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16 w-full flex flex-col items-center">
            <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.04em] text-[#0b132b] mb-4 text-center leading-[1.05]">
              See it in{" "}
              <span className="text-white">
                action.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-[#475569] font-medium text-center max-w-2xl mx-auto">
              Book a 30-minute tailored setup call to see how SquareUp can unify
              your customer data.
            </p>
          </div>
        </Reveal>

        {}
        <Reveal width="100%">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full relative overflow-hidden rounded-[32px] flex flex-col md:flex-row shadow-2xl items-stretch"
            style={{
              background:
                "linear-gradient(160deg, rgba(245,242,237,0.6) 0%, rgba(245,242,237,0.2) 100%)",
              backdropFilter: "blur(48px) saturate(2.0)",
              WebkitBackdropFilter: "blur(48px) saturate(2.0)",
              border: "1px solid rgba(245,242,237,0.9)",
              boxShadow:
                "0 32px 80px -16px rgba(0,0,0,0.08), 0 24px 64px -12px rgba(255,90,54,0.12), inset 0 1px 1px rgba(255,255,255,0.6)",
            }}
          >
            {}
            <div className="absolute inset-x-0 top-0 h-[30%] rounded-[32px_32px_50%_50%] bg-gradient-to-b from-cream/70 to-transparent pointer-events-none z-0" />

            {}
            <div className="w-full md:w-[35%] py-8 px-6 sm:p-10 border-b md:border-b-0 md:border-r border-gray-200/50 relative z-10 flex flex-col bg-cream/40">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center mb-6 overflow-hidden">
                {}
                <div className="w-8 h-8 rounded bg-[#0b132b] relative">
                  <div className="absolute inset-1 border border-white/50 rounded-sm overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-[#FF5A36] to-transparent opacity-30"></div>
                  </div>
                </div>
              </div>

              <h3 className="text-[14px] font-bold text-gray-400 mb-1 tracking-wider uppercase">
                SquareUp
              </h3>
              <h1 className="text-2xl font-extrabold text-[#0b132b] mb-6">
                Discovery & Setup Call
              </h1>

              <div className="flex flex-col gap-4 text-[#475569] font-medium text-[15px]">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span>30 mins</span>
                </div>
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-gray-400" />
                  <span>Google Meet details provided upon confirmation.</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200/50">
                <p className="text-[#475569] leading-relaxed text-[15px]">
                  Let&apos;s discuss your current data architecture and see
                  exactly how SquareUp can unify it all into one intelligent
                  brain.
                </p>
              </div>
            </div>

            {}
            <div className="w-full md:w-[65%] py-8 px-6 sm:p-10 relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-10">
              {}
              <div className="flex-1 w-full">
                <h2 className="text-xl font-bold text-[#0b132b] mb-6">
                  Select a Date & Time
                </h2>

                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold text-[#0b132b] text-[16px]">
                    October 2026
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FF5A36]/10 text-gray-400 hover:text-[#FF5A36] cursor-pointer transition-colors border-none bg-transparent outline-none">
                      <ChevronLeft size={18} />
                    </button>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FF5A36]/10 text-gray-400 hover:text-[#FF5A36] cursor-pointer transition-colors border-none bg-transparent outline-none">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                  {daysArray.map((date, i) => {
                    const isSelected = date === selectedDate;
                    const isPast = date !== null && date < 15;

                    return (
                      <div
                        key={i}
                        className="aspect-square flex items-center justify-center p-1"
                      >
                        {date && (
                          <motion.button
                            onClick={() => {
                              if (!isPast) {
                                setSelectedDate(date);
                                setSelectedTime(null);
                              }
                            }}
                            disabled={isPast}
                            whileHover={
                              !isPast && !isSelected
                                ? {
                                  scale: 1.1,
                                  backgroundColor: "rgba(255,90,54,0.1)",
                                }
                                : {}
                            }
                            whileTap={!isPast ? { scale: 0.9 } : {}}
                            className={`w-full h-full rounded-full flex items-center justify-center text-[15px] font-semibold transition-colors outline-none cursor-pointer border-none
                                                            ${isSelected
                                ? "bg-[#FF5A36] text-white shadow-md"
                                : isPast
                                  ? "text-gray-300 cursor-not-allowed opacity-50"
                                  : "text-[#0b132b] hover:text-[#FF5A36] bg-transparent"
                              }`}
                          >
                            {date}
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {}
              <div className="w-full lg:w-[180px] flex flex-col pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200/50 lg:border-none mt-4 lg:mt-0">
                <h2 className="text-[13px] uppercase tracking-wider font-bold text-gray-400 mb-6 opacity-0 lg:opacity-100 hidden lg:block">
                  Available Times
                </h2>

                <div className="text-sm font-bold text-gray-500 mb-4 lg:hidden mt-2">
                  Wednesday, October {selectedDate}
                </div>

                {selectedDate ? (
                  <div className="flex flex-col gap-2 h-full max-h-[240px] sm:max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {timeSlots.map((time, i) => {
                      const isTimeSelected = selectedTime === time;
                      return (
                        <div key={time} className="w-full flex">
                          <motion.button
                            onClick={() => setSelectedTime(time)}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            whileHover={!isTimeSelected ? { scale: 1.02 } : {}}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              background: isTimeSelected
                                ? "#0b132b"
                                : "rgba(245,242,237,0.8)",
                              borderColor: isTimeSelected
                                ? "#0b132b"
                                : "rgba(0,0,0,0.08)",
                            }}
                            className={`py-3 px-4 min-h-[44px] rounded-xl border text-[14px] font-bold transition-all w-full text-center outline-none cursor-pointer
                                                            ${isTimeSelected
                                ? "text-white shadow-lg"
                                : "text-[#0b132b] hover:shadow-md hover:border-[#FF5A36]/30"
                              }`}
                          >
                            {time}
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4 bg-cream/30 rounded-2xl border border-dashed border-gray-300">
                    <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-[13px] font-medium leading-relaxed">
                      Select a date to view available times
                    </p>
                  </div>
                )}

                {}
                <AnimatePresence>
                  {selectedTime && (
                    <motion.button
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 10, height: 0 }}
                      className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF5A36] to-[#fc7c62] text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(255,90,54,0.3)] hover:shadow-[0_8px_25px_rgba(255,90,54,0.4)] transition-shadow cursor-pointer border-none outline-none flex justify-center items-center gap-2 shrink-0 relative overflow-hidden group"
                    >
                      <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-xl group-hover:bg-white/30 transition-colors pointer-events-none" />
                      Confirm <ChevronRight size={16} strokeWidth={3} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </Reveal>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(11, 19, 43, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(11, 19, 43, 0.2);
        }
      `}</style>
    </motion.section>
  );
}
