"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Design", href: "design", icon: "✏️" },
  { label: "Recruit", href: "recruit", icon: "👥" },
  { label: "Run Interviews", href: "interview", icon: "🎙️" },
  { label: "Analyze", href: "analyze", icon: "📊" },
  { label: "Share Insights", href: "insights", icon: "📋" },
];

export default function TabBar({ studyId }: { studyId: string }) {
  const pathname = usePathname();

  const getTabIndex = (href: string) => tabs.findIndex((t) => t.href === href);
  const activeTab = tabs.find((t) => pathname.includes(t.href));
  const activeIndex = activeTab ? getTabIndex(activeTab.href) : 0;

  return (
    <div className="border-b border-cream-dark bg-white px-6">
      <div className="flex items-center gap-1 py-2">
        {tabs.map((tab, i) => {
          const isActive = pathname.includes(tab.href);
          const isCompleted = i < activeIndex;

          return (
            <div key={tab.href} className="flex items-center">
              {i > 0 && (
                <div className={`w-8 h-px mx-1 ${i <= activeIndex ? "bg-coral/40" : "bg-cream-dark"}`} />
              )}
              <Link
                href={`/study/${studyId}/${tab.href}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-coral text-white shadow-sm"
                    : isCompleted
                    ? "bg-cream text-maze-black"
                    : "text-maze-gray hover:bg-cream/60"
                }`}
              >
                {isCompleted && !isActive && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-6" stroke="#FF5A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span>{tab.label}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
