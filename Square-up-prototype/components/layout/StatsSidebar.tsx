"use client";

interface Stat {
  value: string;
  label: string;
}

interface StatsSidebarProps {
  title: string;
  description: string;
  stats: Stat[];
}

export default function StatsSidebar({ title, description, stats }: StatsSidebarProps) {
  return (
    <aside className="w-72 h-full glass border-l border-white/30 p-6 flex flex-col gap-6 overflow-y-auto">
      <div>
        <h3 className="font-display font-semibold text-maze-black text-lg">{title}</h3>
        <p className="text-sm text-maze-gray mt-2 leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-col gap-5">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="font-display font-bold text-2xl text-coral">{stat.value}</span>
            <span className="text-sm text-maze-gray">{stat.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
