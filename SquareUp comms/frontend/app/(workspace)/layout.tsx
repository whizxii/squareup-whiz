"use client";

import {
  Building2,
  MessageSquare,
  Users,
  FolderOpen,
  Bot,
  Settings,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CommandPalette, openCommandPalette } from "@/components/CommandPalette";
import { ToastContainer } from "@/components/ToastContainer";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { AuthGuard } from "@/components/AuthGuard";
import { CallOverlay } from "@/components/calls/CallOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSeedData } from "@/hooks/use-seed-data";

const navItems = [
  { href: "/office", icon: Building2, label: "Office" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/crm", icon: Users, label: "CRM" },
  { href: "/drive", icon: FolderOpen, label: "Drive" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const displayName = useSettingsStore((s) => s.displayName);
  useSeedData();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-16 lg:w-56 flex-col border-r border-border bg-card shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
            <span className="text-white font-display font-bold text-sm">S</span>
          </div>
          <span className="hidden lg:block font-display font-bold text-foreground">
            Comms
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1" onMouseLeave={() => { }}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors z-10",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Framer motion sliding active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/10 z-0"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
                <item.icon className="w-5 h-5 shrink-0 relative z-10" />
                <span className="hidden lg:block relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* MiniMap */}
        <div className="hidden lg:block p-3 border-t border-border">
          <div className="w-full h-24 rounded-lg bg-muted/30 relative overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
            {/* Desk markers */}
            <div className="absolute top-3 left-3 w-4 h-3 rounded-sm bg-primary/20 border border-primary/30" title="Your desk" />
            <div className="absolute top-3 left-10 w-4 h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/20" />
            <div className="absolute top-3 right-3 w-4 h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/20" />
            {/* Agent stations */}
            <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-sq-agent/20 border border-sq-agent/30" />
            <div className="absolute bottom-3 left-9 w-3 h-3 rounded-full bg-sq-agent/20 border border-sq-agent/30" />
            {/* Meeting room */}
            <div className="absolute bottom-3 right-3 w-8 h-5 rounded-sm bg-primary/10 border border-primary/15 border-dashed" />
            {/* You indicator */}
            <div className="absolute top-2.5 left-3.5 w-2 h-2 rounded-full bg-sq-online ring-1 ring-sq-online/30" />
            {/* Label */}
            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground/60 font-medium tracking-wider uppercase">Office</p>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <button onClick={openCommandPalette} className="sq-tap sq-focus-ring flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border border-border bg-background/50 text-muted-foreground text-sm hover:border-primary/30 hover:bg-background transition-colors">
              <Search className="w-4 h-4" />
              <span>Search or Cmd+K</span>
              <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
              <span className="text-white text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50 pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Command Palette */}
      <CommandPalette />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Call Overlay — floating controls during active call */}
      <CallOverlay />
      </div>
    </AuthGuard>
  );
}
