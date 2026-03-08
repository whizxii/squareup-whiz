"use client";

import SquareUpLogo from "../ui/SquareUpLogo";
import { Linkedin, Instagram, Youtube } from "lucide-react";

const footerColumns = [
  {
    title: "COMPANY",
    links: ["About", "Blog", "Careers", "Newsroom", "Contact us"],
  },
  {
    title: "PLATFORM",
    links: [
      "Pricing",
      { label: "AI Moderator", badge: "New" },
      "Moderated Interviews",
      "Prototype Testing",
      "Surveys",
      "Live Website Testing",
      "Mobile Testing",
      "Card Sorting",
      "Tree Testing",
    ],
  },
  {
    title: "RESOURCES",
    links: [
      "Reports & Guides",
      "Research Collections",
      "Events & Webinars",
      "Maze University",
      "Customer Stories",
      "Glossary",
      "Question Library",
      "Templates",
      "Compare Maze",
    ],
  },
  {
    title: "USE CASES",
    links: [
      "Concept Validation",
      "Usability Testing",
      "Copy Testing",
      "User Satisfaction",
    ],
  },
  {
    title: "CUSTOMERS",
    links: ["Itau", "Homebase", "LCS", "Braze", "Hopper"],
  },
];

const legalLinks = [
  "PRIVACY POLICY",
  "TERMS AND CONDITIONS",
  "SECURITY",
  "COMPLIANCE",
  "COOKIE SETTINGS",
  "STATUS",
];


function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-cream pt-16 lg:pt-20" style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr] gap-6 sm:gap-8 lg:gap-6 mb-16">
          {}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-medium tracking-wide uppercase text-maze-black mb-4 border-b border-neutral-300 pb-2 inline-block">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link, i) => {
                  const isObj = typeof link === "object";
                  const label = isObj ? link.label : link;
                  const badge = isObj ? link.badge : null;
                  return (
                    <li key={i}>
                      <a
                        href="#"
                        className="text-sm text-neutral-600 hover:text-maze-black transition-colors inline-flex items-center gap-2 min-h-[44px] sm:min-h-0"
                      >
                        {label}
                        {badge && (
                          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                            {badge}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {}
          <div className="col-span-1 xs:col-span-2 md:col-span-3 lg:col-span-1">
            {}
            <div className="rounded-xl overflow-hidden bg-lime/30 aspect-[4/3] mb-4 flex items-center justify-center">
              <svg viewBox="0 0 120 90" className="w-3/4 opacity-20">
                {Array.from({ length: 20 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={15 + (i % 5) * 24}
                    cy={15 + Math.floor(i / 5) * 20}
                    r={4}
                    fill="#FF5A36"
                  />
                ))}
              </svg>
            </div>
            <h4 className="text-sm font-semibold mb-3">
              Sign up for our newsletter
            </h4>
            <div className="flex gap-2 mb-6">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2.5 min-h-[44px] text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-maze-black transition-colors"
              />
              <button className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-maze-black border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors">
                Subscribe
              </button>
            </div>

            {}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Follow us</span>
              <div className="flex gap-3">
                <a href="#" className="text-neutral-500 hover:text-maze-black transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-neutral-500 hover:text-maze-black transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-neutral-500 hover:text-maze-black transition-colors">
                  <XIcon className="w-5 h-5" />
                </a>
                <a href="#" className="text-neutral-500 hover:text-maze-black transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="mb-8">
          <SquareUpLogo className="w-full max-w-[280px] sm:max-w-[400px] h-auto text-maze-black mx-auto lg:mx-0" />
        </div>

        {}
        <div className="border-t border-neutral-200 pt-6 flex flex-wrap items-center gap-2 sm:gap-4 text-[12px] text-neutral-600 uppercase tracking-wide">
          <span>Copyright &copy; 2026 Square Up</span>
          {legalLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-maze-black transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
