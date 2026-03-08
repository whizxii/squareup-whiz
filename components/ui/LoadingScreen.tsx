"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import Image from "next/image";

export default function LoadingScreen() {
    const [done, setDone] = useState(false);
    const ranRef = useRef(false);


    const textProgress = useMotionValue(0);
    const clipPath = useTransform(
        textProgress,
        [0, 1],
        ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
    );


    const overlayY = useMotionValue("0%");

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;


        document.documentElement.style.overflow = "hidden";

        const run = async () => {

            await animate(textProgress, 1, {
                duration: 0.6,
                ease: [0.65, 0, 0.35, 1],
            });


            await new Promise<void>((res) => setTimeout(res, 300));


            await animate(overlayY, "-100%", {
                duration: 0.7,
                ease: [0.76, 0, 0.24, 1],
            });


            document.documentElement.style.overflow = "";
            setDone(true);
        };

        run();

        return () => {
            document.documentElement.style.overflow = "";
        };

    }, []);

    if (done) return null;

    return (
        <motion.div
            style={{ y: overlayY, backgroundColor: "#FF5A36" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        >
            {}
            <motion.div
                style={{ clipPath }}
                className="relative w-[260px] sm:w-[380px] md:w-[480px] lg:w-[560px]"
            >
                <Image
                    src="/su_wordmark_transparent.svg"
                    alt="Square Up"
                    width={560}
                    height={187}
                    className="w-full h-auto"
                    style={{ filter: "brightness(0) invert(1)" }}
                    priority
                />
            </motion.div>
        </motion.div>
    );
}
