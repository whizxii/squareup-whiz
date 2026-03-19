"use client";

import { motion } from "framer-motion";
import React from "react";

interface RevealProps {
    children: React.ReactNode;
    width?: "fit-content" | "100%";
    delay?: number;
    y?: number;
}

const Reveal = ({ children, width = "fit-content", delay = 0, y = 14 }: RevealProps) => {
    return (
        <div style={{ position: "relative", width, overflow: "hidden" }}>
            <motion.div
                style={{ width }}
                variants={{
                    hidden: { opacity: 0, y },
                    visible: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{
                    duration: 0.52,
                    delay: delay,
                    ease: [0.22, 1, 0.36, 1],
                }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default Reveal;
