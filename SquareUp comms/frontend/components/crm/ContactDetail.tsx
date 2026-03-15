"use client";

import { Contact, STAGES, CRMStage } from "@/lib/stores/crm-store";
import { ContextPanel } from "@/components/ContextPanel";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  Building2,
  Mail,
  Phone,
  Tag,
  DollarSign,
  StickyNote,
  Activity,
  Plus,
  Bot,
  Briefcase,
} from "lucide-react";

interface ContactDetailProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

function getStageConfig(stage: CRMStage) {
  return STAGES.find((s) => s.id === stage) ?? STAGES[0];
}

function getStageBadgeClasses(stage: CRMStage): string {
  const map: Record<CRMStage, string> = {
    lead: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    qualified: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    proposal: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    won: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return map[stage];
}

export function ContactDetail({ contact, isOpen, onClose }: ContactDetailProps) {
  if (!contact) {
    return (
      <ContextPanel isOpen={isOpen} onClose={onClose} title="Contact Details">
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">No contact selected</p>
        </div>
      </ContextPanel>
    );
  }

  const stageConfig = getStageConfig(contact.stage);
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ContextPanel isOpen={isOpen} onClose={onClose} title="Contact Details">
      <div className="space-y-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center space-y-2">
          {contact.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt={contact.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
              <span className="text-white font-display font-bold text-lg">
                {initials}
              </span>
            </div>
          )}
          <div>
            <p className="font-display font-bold text-base">{contact.name}</p>
            {(contact.title || contact.company) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {contact.title}
                {contact.title && contact.company && " at "}
                {contact.company}
              </p>
            )}
          </div>

          {/* Stage badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
              getStageBadgeClasses(contact.stage)
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", stageConfig.color)} />
            {stageConfig.label}
          </span>
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <SectionLabel icon={Mail} label="Contact Info" />
          <div className="space-y-1.5 pl-1">
            {contact.email && (
              <InfoRow icon={Mail} value={contact.email} />
            )}
            {contact.phone && (
              <InfoRow icon={Phone} value={contact.phone} />
            )}
            {contact.company && (
              <InfoRow icon={Building2} value={contact.company} />
            )}
            {contact.title && (
              <InfoRow icon={Briefcase} value={contact.title} />
            )}
          </div>
        </div>

        {/* Deal value */}
        {contact.value != null && contact.value > 0 && (
          <div className="space-y-2">
            <SectionLabel icon={DollarSign} label="Deal Value" />
            <p className="text-lg font-mono font-semibold text-primary pl-1">
              {formatCurrency(contact.value, contact.currency)}
            </p>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="space-y-2">
            <SectionLabel icon={Tag} label="Tags" />
            <div className="flex flex-wrap gap-1.5 pl-1">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Activity section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel icon={Activity} label="Activity" />
            <button className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-3 h-3" />
              Log Activity
            </button>
          </div>
          <div className="flex items-center justify-center h-16 border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted-foreground">No activity logged yet</p>
          </div>
        </div>

        {/* Notes section */}
        <div className="space-y-2">
          <SectionLabel icon={StickyNote} label="Notes" />
          {contact.notes ? (
            <p className="text-xs text-muted-foreground leading-relaxed pl-1 whitespace-pre-wrap">
              {contact.notes}
            </p>
          ) : (
            <div className="flex items-center justify-center h-16 border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground">No notes added</p>
            </div>
          )}
        </div>

        {/* Quick action: Send to agent */}
        <div className="pt-2 border-t border-border">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            <Bot className="w-4 h-4" />
            Send to Agent
          </button>
        </div>
      </div>
    </ContextPanel>
  );
}

/* ---------- Small helper components ---------- */

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}
