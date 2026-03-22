"use client";

import { motion } from "framer-motion";
import {
  LayoutGrid,
  LayoutDashboard,
  Plus,
  Search,
  BarChart3,
  Calendar,
  Users,
  Building2,
  Target,
  Workflow,
  GitBranch,
  ListFilter,
  Upload,
  Download,
  Bot,
  Newspaper,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import type { CRMView } from "@/lib/types/crm";

// ─── View config ─────────────────────────────────────────────────

interface ViewConfig {
  id: CRMView;
  label: string;
  icon: React.ReactNode;
}

const VIEWS: ViewConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "pipeline", label: "Pipeline", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "table", label: "Contacts", icon: <Users className="w-4 h-4" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "leads", label: "Leads", icon: <Target className="w-4 h-4" /> },
  { id: "companies", label: "Companies", icon: <Building2 className="w-4 h-4" /> },
  { id: "sequences", label: "Sequences", icon: <Workflow className="w-4 h-4" /> },
  { id: "workflows", label: "Workflows", icon: <GitBranch className="w-4 h-4" /> },
  { id: "smart_lists", label: "Smart Lists", icon: <ListFilter className="w-4 h-4" /> },
  { id: "automation", label: "AI Activity", icon: <Bot className="w-4 h-4" /> },
  { id: "digest", label: "Digest", icon: <Newspaper className="w-4 h-4" /> },
  { id: "graph", label: "Graph", icon: <Network className="w-4 h-4" /> },
];

// ─── Quick add menu items ────────────────────────────────────────

const QUICK_ADD_ITEMS = [
  { label: "New Contact", dialog: "create-contact" as const },
  { label: "New Deal", dialog: "create-deal" as const },
  { label: "Log Activity", dialog: "log-activity" as const },
  { label: "New Event", dialog: "create-event" as const },
] as const;

// ─── Component ───────────────────────────────────────────────────

export function CRMHeader() {
  const activeView = useCRMUIStore((s) => s.activeView);
  const setActiveView = useCRMUIStore((s) => s.setActiveView);
  const searchQuery = useCRMUIStore((s) => s.searchQuery);
  const setSearchQuery = useCRMUIStore((s) => s.setSearchQuery);
  const openDialog = useCRMUIStore((s) => s.openDialog);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="font-display font-bold text-sm">CRM</h2>

        {/* View toggle */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={cn(
                "relative p-1.5 rounded-md transition-colors z-10 sq-tap",
                activeView === view.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={`${view.label} view`}
            >
              {activeView === view.id && (
                <motion.div
                  layoutId="crm-view-toggle"
                  className="absolute inset-0 bg-card rounded-md shadow-sm z-[-1]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {view.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="pl-8 pr-3 py-1.5 w-48 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
          />
        </div>

        {/* Import / Export */}
        <button
          onClick={() => openDialog("import")}
          className="sq-tap p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Import contacts"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={() => openDialog("export")}
          className="sq-tap p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Export contacts"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Quick add */}
        <button
          onClick={() => openDialog("create-contact")}
          className="sq-tap sq-focus-ring sq-hover-breathe flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Contact</span>
        </button>
      </div>
    </div>
  );
}
