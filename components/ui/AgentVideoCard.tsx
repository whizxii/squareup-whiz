"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface AgentVideoCardProps {
    name: string;
    videoSrc: string;
    posterSrc: string;
    description: string;
    isActive: boolean;
    isAdjacent: boolean;
    cardWidth: number;
}

export default function AgentVideoCard({
    videoSrc,
    posterSrc,
    isActive,
    isAdjacent,
    cardWidth,
}: AgentVideoCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);


    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            video.currentTime = 0;
            video.playbackRate = 2;
            const timer = setTimeout(() => {
                video.play().catch(() => {});
            }, 400);
            return () => clearTimeout(timer);
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isActive]);

    const scale = isActive ? 1 : isAdjacent ? 0.95 : 0.9;
    const opacity = isActive ? 1 : isAdjacent ? 0.55 : 0.3;

    const cropAmount = Math.min(46, cardWidth * 0.055);
    const isMobileCard = cardWidth < 400;

    return (
        <motion.div
            animate={{ scale, opacity }}
            transition={{
                scale: { type: "spring", stiffness: isMobileCard ? 200 : 300, damping: isMobileCard ? 35 : 30, mass: 0.8 },
                opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            }}
            className="flex-shrink-0 rounded-[20px] overflow-hidden relative"
            style={{
                width: cardWidth,
                height: cardWidth * (9 / 16) - cropAmount,
                boxShadow: isActive
                    ? "0 24px 80px -16px rgba(0,0,0,0.14), 0 8px 24px -8px rgba(0,0,0,0.06)"
                    : "0 12px 40px -12px rgba(0,0,0,0.08)",
            }}
        >
            {}
            <video
                ref={videoRef}
                src={(isActive || isAdjacent) ? videoSrc : undefined}
                poster={posterSrc}
                muted
                loop
                playsInline
                preload={isActive ? "auto" : "metadata"}
                className="absolute top-0 left-0 w-full"
                style={{ height: cardWidth * (9 / 16) }}
            />
        </motion.div>
    );
}
