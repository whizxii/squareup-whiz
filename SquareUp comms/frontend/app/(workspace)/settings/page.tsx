"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Palette,
  Bell,
  Plug,
  Info,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useIntegrationStore } from "@/lib/stores/integration-store";

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmented Control                                                  */
/* ------------------------------------------------------------------ */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderOption?: (option: T, active: boolean) => React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center bg-muted rounded-xl p-1 gap-0.5">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            value === option
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {renderOption ? renderOption(option, value === option) : option}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-card rounded-2xl border border-border p-6 space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Row                                                          */
/* ------------------------------------------------------------------ */
function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Google Calendar Integration Card                                   */
/* ------------------------------------------------------------------ */
function GoogleCalendarCard() {
  const connected = useIntegrationStore((s) => s.calendarConnected);
  const email = useIntegrationStore((s) => s.calendarEmail);
  const loading = useIntegrationStore((s) => s.calendarLoading);
  const checkStatus = useIntegrationStore((s) => s.checkCalendarStatus);
  const connect = useIntegrationStore((s) => s.connectCalendar);
  const disconnect = useIntegrationStore((s) => s.disconnectCalendar);
  const searchParams = useSearchParams();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Re-check status when redirected back from OAuth
  useEffect(() => {
    if (searchParams.get("calendar") === "connected") {
      checkStatus();
    }
  }, [searchParams, checkStatus]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-accent/30 transition-colors">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 bg-red-500/10 text-red-500">
        G
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Google Calendar</p>
        <p className="text-xs text-muted-foreground truncate">
          {connected ? email ?? "Connected" : "Sync your calendar events"}
        </p>
      </div>
      <div className="shrink-0">
        {loading ? (
          <div className="px-3 py-1.5">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : connected ? (
          <button
            onClick={disconnect}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Static Integration Card (Coming Soon)                              */
/* ------------------------------------------------------------------ */
const comingSoonIntegrations = [
  {
    name: "GitHub",
    description: "Issues, PRs, and repo activity",
    icon: "GH",
    color: "bg-gray-500/10 text-gray-400",
  },
  {
    name: "Slack",
    description: "Cross-post channels and threads",
    icon: "S",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    name: "Notion",
    description: "Docs, wikis, and databases",
    icon: "N",
    color: "bg-gray-800/10 text-gray-600 dark:text-gray-300",
  },
];

function IntegrationCard({
  name,
  description,
  icon,
  color,
}: {
  name: string;
  description: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-accent/30 transition-colors">
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
          color
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <div className="relative group shrink-0">
        <button
          disabled
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground bg-muted/50 cursor-not-allowed"
        >
          Connect
        </button>
        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md">
          Coming soon
          <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-foreground rotate-45" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Options                                                     */
/* ------------------------------------------------------------------ */
const statusOptions = [
  { value: "online", label: "Online", dot: "bg-sq-online" },
  { value: "away", label: "Away", dot: "bg-sq-away" },
  { value: "busy", label: "Busy", dot: "bg-sq-busy" },
  { value: "dnd", label: "Do Not Disturb", dot: "bg-red-600" },
] as const;


/* ------------------------------------------------------------------ */
/*  Settings Page                                                      */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  // --- Persisted state from Zustand store ---
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const status = useSettingsStore((s) => s.status);
  const setStatus = useSettingsStore((s) => s.setStatus);
  const statusMessage = useSettingsStore((s) => s.statusMessage);
  const setStatusMessage = useSettingsStore((s) => s.setStatusMessage);
  const statusEmoji = useSettingsStore((s) => s.statusEmoji);
  const setStatusEmoji = useSettingsStore((s) => s.setStatusEmoji);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const notifMentions = useSettingsStore((s) => s.notifMentions);
  const setNotifMentions = useSettingsStore((s) => s.setNotifMentions);
  const notifDMs = useSettingsStore((s) => s.notifDMs);
  const setNotifDMs = useSettingsStore((s) => s.setNotifDMs);
  const notifAgentUpdates = useSettingsStore((s) => s.notifAgentUpdates);
  const setNotifAgentUpdates = useSettingsStore((s) => s.setNotifAgentUpdates);
  const notifChannelMessages = useSettingsStore((s) => s.notifChannelMessages);
  const setNotifChannelMessages = useSettingsStore((s) => s.setNotifChannelMessages);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);

  // --- Local-only UI state ---
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // --- Theme (already persisted by next-themes) ---
  const { theme, setTheme } = useTheme();

  const currentStatus = statusOptions.find((s) => s.value === status)!;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-sm">Settings</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* ========== PROFILE ========== */}
          <Section icon={User} title="Profile" delay={0}>
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Your display name"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Status
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        currentStatus.dot
                      )}
                    />
                    {currentStatus.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      statusDropdownOpen && "rotate-180"
                    )}
                  />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-md overflow-hidden">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setStatus(opt.value);
                          setStatusDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors",
                          status === opt.value && "bg-accent/30"
                        )}
                      >
                        <span
                          className={cn("w-2.5 h-2.5 rounded-full", opt.dot)}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Status message
              </label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="What are you working on?"
              />
            </div>

            {/* Status Emoji */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Status emoji
              </label>
              <input
                type="text"
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 🚀"
                maxLength={4}
              />
            </div>
          </Section>

          {/* ========== APPEARANCE ========== */}
          <Section icon={Palette} title="Appearance" delay={0.05}>
            {/* Theme */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Theme
              </label>
              <div className="inline-flex items-center bg-muted rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    theme === "light"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    theme === "dark"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    theme === "system"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  System
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Font size
              </label>
              <SegmentedControl
                options={["Small", "Medium", "Large"] as const}
                value={fontSize}
                onChange={(v) =>
                  setFontSize(v as "Small" | "Medium" | "Large")
                }
              />
            </div>
          </Section>

          {/* ========== NOTIFICATIONS ========== */}
          <Section icon={Bell} title="Notifications" delay={0.1}>
            <FieldRow
              label="Mentions"
              description="When someone @mentions you"
            >
              <Toggle checked={notifMentions} onChange={setNotifMentions} />
            </FieldRow>

            <FieldRow
              label="Direct messages"
              description="New messages in DMs"
            >
              <Toggle checked={notifDMs} onChange={setNotifDMs} />
            </FieldRow>

            <FieldRow
              label="Agent updates"
              description="When AI agents post results"
            >
              <Toggle
                checked={notifAgentUpdates}
                onChange={setNotifAgentUpdates}
              />
            </FieldRow>

            <FieldRow
              label="Channel messages"
              description="All new messages in channels"
            >
              <Toggle
                checked={notifChannelMessages}
                onChange={setNotifChannelMessages}
              />
            </FieldRow>

            <div className="border-t border-border pt-4">
              <FieldRow label="Sound" description="Play notification sounds">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
                </div>
              </FieldRow>
            </div>
          </Section>

          {/* ========== INTEGRATIONS ========== */}
          <Section icon={Plug} title="Integrations" delay={0.15}>
            <p className="text-sm text-muted-foreground">
              Connect your favourite tools to SquareUp Comms.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <GoogleCalendarCard />
              {comingSoonIntegrations.map((integration) => (
                <IntegrationCard key={integration.name} {...integration} />
              ))}
            </div>
          </Section>

          {/* ========== ABOUT ========== */}
          <Section icon={Info} title="About" delay={0.2}>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">App</span>
                <span className="font-medium">SquareUp Comms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">
                  0.1.0
                </span>
              </div>
              <div className="pt-2 border-t border-border text-center">
                <p className="text-muted-foreground text-xs">
                  Built with ❤️ by SquareUp team
                </p>
              </div>
            </div>
          </Section>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
