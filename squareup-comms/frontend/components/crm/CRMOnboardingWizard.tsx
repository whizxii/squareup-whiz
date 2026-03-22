"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Upload,
  Bot,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  UserPlus,
  FileSpreadsheet,
  MessageSquareText,
  Rocket,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────

const STORAGE_KEY = "sq-crm-onboarded";

interface WizardStep {
  readonly id: string;
  readonly icon: typeof Users;
  readonly title: string;
  readonly subtitle: string;
}

const STEPS: readonly WizardStep[] = [
  {
    id: "welcome",
    icon: Rocket,
    title: "Welcome to SquareUp CRM",
    subtitle: "Your AI-powered sales command center. Let's get you set up in under a minute.",
  },
  {
    id: "add-contacts",
    icon: Users,
    title: "Add Your Contacts",
    subtitle: "Choose how you'd like to get started with your contacts.",
  },
  {
    id: "copilot",
    icon: Bot,
    title: "Meet Your AI Copilot",
    subtitle: "Your copilot can create contacts, draft emails, score leads, and more — all via natural language.",
  },
  {
    id: "ready",
    icon: Sparkles,
    title: "You're All Set!",
    subtitle: "Your CRM is ready. Start exploring your dashboard, pipeline, and AI-powered features.",
  },
];

// ─── Props ───────────────────────────────────────────────────

interface CRMOnboardingWizardProps {
  readonly onComplete: () => void;
  readonly onAddContact: () => void;
  readonly onImportCSV: () => void;
  readonly onLoadDemo: () => void;
  readonly onOpenCopilot: () => void;
  readonly isDemoLoading?: boolean;
}

// ─── Quick-start option card ─────────────────────────────────

function OptionCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  readonly icon: typeof Users;
  readonly title: string;
  readonly description: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 w-full p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Copilot prompt preview ──────────────────────────────────

const SAMPLE_PROMPTS = [
  { text: "Create a contact for Jane at Acme Corp", icon: UserPlus },
  { text: "Show me all deals closing this month", icon: FileSpreadsheet },
  { text: "Draft a follow-up email to John", icon: MessageSquareText },
];

// ─── Main component ──────────────────────────────────────────

export function CRMOnboardingWizard({
  onComplete,
  onAddContact,
  onImportCSV,
  onLoadDemo,
  onOpenCopilot,
  isDemoLoading = false,
}: CRMOnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleFinish = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onComplete();
  }, [onComplete]);

  // Step-specific content
  const renderStepContent = () => {
    switch (STEPS[step].id) {
      case "welcome":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "AI Lead Scoring", desc: "Automatic scoring" },
                { label: "Deal Pipeline", desc: "Visual tracking" },
                { label: "Smart Copilot", desc: "Natural language" },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{feature.label}</span>
                  <span className="text-[10px] text-muted-foreground">{feature.desc}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "add-contacts":
        return (
          <div className="space-y-2.5">
            <OptionCard
              icon={UserPlus}
              title="Add a contact manually"
              description="Create your first contact with name, email, and company."
              onClick={() => {
                onAddContact();
                handleNext();
              }}
            />
            <OptionCard
              icon={Upload}
              title="Import from CSV"
              description="Upload a spreadsheet of your existing contacts."
              onClick={() => {
                onImportCSV();
                handleNext();
              }}
            />
            <OptionCard
              icon={Sparkles}
              title="Load demo data"
              description="Explore with sample contacts, deals, and companies."
              onClick={() => {
                onLoadDemo();
                handleNext();
              }}
              disabled={isDemoLoading}
            />
            <button
              onClick={handleNext}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Skip — I&apos;ll add contacts later
            </button>
          </div>
        );

      case "copilot":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={onOpenCopilot}
                  className="flex items-center gap-2.5 w-full p-3 rounded-lg bg-muted/50 border border-border hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
                >
                  <prompt.icon className="w-4 h-4 text-primary/70 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    &ldquo;{prompt.text}&rdquo;
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Click any prompt to try the AI Copilot, or press the{" "}
              <Bot className="w-3 h-3 inline" /> button anytime.
            </p>
          </div>
        );

      case "ready":
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {[
                { label: "Dashboard", desc: "AI-powered KPIs and deal risk overview" },
                { label: "Pipeline", desc: "Drag-and-drop deal stages" },
                { label: "Lead Scoring", desc: "AI scores every contact automatically" },
                { label: "AI Copilot", desc: "Natural language commands via the chat button" },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-foreground">{feature.label}</span>
                    <span className="text-xs text-muted-foreground"> — {feature.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              {/* Step indicator dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 20 : 6,
                      backgroundColor: i === step
                        ? "hsl(var(--primary))"
                        : i < step
                          ? "hsl(var(--primary) / 0.4)"
                          : "hsl(var(--muted-foreground) / 0.2)",
                    }}
                  />
                ))}
              </div>
              {/* Skip button */}
              {step < STEPS.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip setup
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  {(() => {
                    const StepIcon = STEPS[step].icon;
                    return <StepIcon className="w-6 h-6 text-primary" />;
                  })()}
                </div>

                {/* Title & subtitle */}
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {STEPS[step].title}
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {STEPS[step].subtitle}
                </p>

                {/* Step-specific content */}
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer with navigation */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === STEPS.length - 1 ? (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all shadow-sm"
              >
                <Rocket className="w-4 h-4" />
                Launch CRM
              </button>
            ) : STEPS[step].id !== "add-contacts" ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all shadow-sm"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Hook to check onboarding status ─────────────────────────

export function useCRMOnboardingComplete(): boolean {
  const [complete, setComplete] = useState(true); // default true to avoid flash
  useEffect(() => {
    if (typeof window !== "undefined") {
      setComplete(localStorage.getItem(STORAGE_KEY) === "true");
    }
  }, []);
  return complete;
}

export function markCRMOnboardingComplete(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, "true");
  }
}
