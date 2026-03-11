"use client";

import Link from "next/link";
import { useStudy } from "@/lib/study-context";

export default function Sidebar() {
  const { studies, activeStudy, setActiveStudy } = useStudy();

  return (
    <aside className="w-60 h-screen bg-white border-r border-cream-dark flex flex-col">
      <div className="p-5 border-b border-cream-dark">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">SU</span>
          </div>
          <span className="font-display font-semibold text-maze-black">Square Up</span>
        </Link>
      </div>

      <div className="p-4">
        <Link
          href="/"
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-coral text-white rounded-full font-medium text-sm hover:bg-coral-bright transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Study
        </Link>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-medium text-maze-gray uppercase tracking-wider">
          Studies
        </p>
        {studies.map((s) => (
          <button
            key={s.study.id}
            onClick={() => setActiveStudy(s.study.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
              activeStudy?.study.id === s.study.id
                ? "bg-cream text-maze-black font-medium"
                : "text-maze-gray hover:bg-cream/60"
            }`}
          >
            <p className="truncate">{s.study.brandName}</p>
            <p className="text-xs text-maze-gray truncate mt-0.5">{s.study.title}</p>
          </button>
        ))}
      </nav>
    </aside>
  );
}
