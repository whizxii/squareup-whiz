"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SquareUpLogo from "../ui/SquareUpLogo";
import { ChevronDown, Menu, X } from "lucide-react";

const navItems = [
  { label: "PLATFORM", hasDropdown: true },
  { label: "SOLUTIONS", hasDropdown: true },
  { label: "RESOURCES", hasDropdown: true },
  { label: "CUSTOMERS", hasDropdown: true },
  { label: "PRICING", hasDropdown: false },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 sm:h-20 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        {}
        <a href="/" aria-label="Square Up" className="shrink-0">
          <SquareUpLogo className="w-auto h-7 text-maze-black" />
        </a>

        {}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-1 px-3 py-2 text-[15px] font-medium text-maze-black hover:text-black transition-colors"
            >
              {item.label}
              {item.hasDropdown && <ChevronDown className="w-4 h-4 opacity-50" />}
            </button>
          ))}
        </nav>

        {}
        <div className="hidden lg:flex items-center gap-3">
          <button className="px-5 py-2.5 text-sm font-medium text-maze-black border border-neutral-300 rounded-full hover:bg-neutral-100 transition-colors">
            Log in
          </button>
          <a href="#book-call" className="px-5 py-2.5 text-sm font-medium text-white bg-maze-black rounded-full hover:bg-black transition-colors">
            Talk to us
          </a>
        </div>

        {}
        <button
          className="lg:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden border-t border-neutral-200 bg-white px-6 py-4"
        >
          {navItems.map((item) => (
            <button
              key={item.label}
              className="block w-full text-left py-3.5 text-sm font-medium text-maze-black min-h-[44px] flex items-center"
            >
              {item.label}
            </button>
          ))}
          <div className="flex gap-3 mt-4 pt-4 border-t border-neutral-200">
            <button className="flex-1 py-3 min-h-[44px] text-sm font-medium border border-neutral-300 rounded-full flex items-center justify-center">
              Log in
            </button>
            <a href="#book-call" className="flex-1 py-3 min-h-[44px] text-sm font-medium text-white bg-maze-black rounded-full flex items-center justify-center">
              Talk to us
            </a>
          </div>
        </motion.div>
      )}
    </header>
  );
}
