"use client";

import { useCRMStore, STAGES, Contact } from "@/lib/stores/crm-store";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Building2, Mail, Phone, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function PipelineView() {
  const getContactsByStage = useCRMStore((s) => s.getContactsByStage);
  const setSelectedContact = useCRMStore((s) => s.setSelectedContact);
  const selectedContactId = useCRMStore((s) => s.selectedContactId);

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full scrollbar-thin">
      {STAGES.filter((s) => s.id !== "lost").map((stage) => {
        const contacts = getContactsByStage(stage.id);
        const totalValue = contacts.reduce((sum, c) => sum + (c.value || 0), 0);

        return (
          <div
            key={stage.id}
            className="flex flex-col min-w-[280px] w-[280px] shrink-0"
          >
            {/* Stage header */}
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", stage.color)} />
                <span className="text-sm font-semibold">{stage.label}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {contacts.length}
                </span>
              </div>
              {totalValue > 0 && (
                <span className="text-xs text-muted-foreground font-mono">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContactId === contact.id}
                  onClick={() => setSelectedContact(contact.id)}
                />
              ))}

              {contacts.length === 0 && (
                <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-xl">
                  <p className="text-xs text-muted-foreground">No contacts</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactCard({
  contact,
  isSelected,
  onClick,
}: {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border bg-card hover:shadow-md transition-all duration-150 space-y-2",
        isSelected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border hover:border-primary/20"
      )}
    >
      {/* Name + Company */}
      <div>
        <p className="text-sm font-semibold truncate">{contact.name}</p>
        {contact.company && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{contact.company}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {contact.value && (
        <p className="text-sm font-mono font-medium text-primary">
          {formatCurrency(contact.value, contact.currency)}
        </p>
      )}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {contact.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {contact.email && (
          <span className="flex items-center gap-0.5">
            <Mail className="w-2.5 h-2.5" />
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-0.5">
            <Phone className="w-2.5 h-2.5" />
          </span>
        )}
        {contact.next_follow_up_at && (
          <span className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(contact.next_follow_up_at), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
    </button>
  );
}

