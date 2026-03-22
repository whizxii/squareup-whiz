"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import {
  useCreateDeal,
  usePipelines,
  useDefaultPipeline,
  useContacts,
} from "@/lib/hooks/use-crm-queries";
import type { PipelineStage } from "@/lib/types/crm";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDealDialog({ open, onOpenChange }: CreateDealDialogProps) {
  const dialogData = useCRMUIStore((s) => s.dialog.data);

  const { data: pipelinesRes } = usePipelines();
  const { data: defaultRes } = useDefaultPipeline();
  const createDeal = useCreateDeal();

  const pipelines = pipelinesRes ?? [];
  const defaultPipeline = defaultRes ?? null;

  const initialPipelineId =
    (dialogData as { pipeline_id?: string })?.pipeline_id ??
    defaultPipeline?.id ??
    "";
  const initialStage = (dialogData as { stage?: string })?.stage ?? "";
  const initialContactId = (dialogData as { contact_id?: string })?.contact_id ?? "";

  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState(initialContactId);
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [selectedContactName, setSelectedContactName] = useState("");
  const contactSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pipelineId, setPipelineId] = useState(initialPipelineId);
  const [stage, setStage] = useState(initialStage);
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [expectedClose, setExpectedClose] = useState("");

  // Debounced contact search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(contactSearch), 300);
    return () => clearTimeout(timer);
  }, [contactSearch]);

  const { data: contactsRes, isLoading: contactsLoading } = useContacts(
    debouncedSearch.length >= 2 ? { search: debouncedSearch } : undefined,
    { limit: 8 },
  );
  const contactResults = contactsRes?.items ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setContactDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectContact = useCallback(
    (id: string, name: string) => {
      setContactId(id);
      setSelectedContactName(name);
      setContactSearch("");
      setContactDropdownOpen(false);
    },
    [],
  );

  const handleClearContact = useCallback(() => {
    setContactId("");
    setSelectedContactName("");
    setContactSearch("");
  }, []);

  const selectedPipeline =
    pipelines.find((p) => p.id === pipelineId) ?? defaultPipeline;
  const stages: PipelineStage[] = selectedPipeline?.stages
    ? [...selectedPipeline.stages].sort((a, b) => a.order - b.order)
    : [];
  const selectedStage = stages.find((s) => s.id === stage);

  const resetForm = () => {
    setTitle("");
    setContactId(initialContactId);
    setPipelineId(initialPipelineId);
    setStage(initialStage);
    setValue("");
    setCurrency("INR");
    setExpectedClose("");
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    createDeal.mutate(
      {
        title: title.trim(),
        contact_id: contactId || undefined,
        pipeline_id: pipelineId || undefined,
        stage: stage || undefined,
        value: value ? Number(value) : undefined,
        currency,
        expected_close_date: expectedClose || undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-display font-bold mb-1">
            Create Deal
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground mb-4">
            Create a new deal in your pipeline.
          </Dialog.Description>

          <div className="space-y-3">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deal title *"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              autoFocus
            />

            {/* Contact search */}
            <div className="relative" ref={dropdownRef}>
              {contactId ? (
                <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <span className="flex-1 truncate">{selectedContactName || contactId}</span>
                  <button
                    type="button"
                    onClick={handleClearContact}
                    className="p-0.5 rounded hover:bg-accent text-muted-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    ref={contactSearchRef}
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      setContactDropdownOpen(e.target.value.length >= 2);
                    }}
                    onFocus={() => {
                      if (contactSearch.length >= 2) setContactDropdownOpen(true);
                    }}
                    placeholder="Search contact (optional)"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  {contactsLoading && contactSearch.length >= 2 && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}

              {contactDropdownOpen && contactSearch.length >= 2 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                  {contactResults.length === 0 && !contactsLoading ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No contacts found
                    </p>
                  ) : (
                    contactResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectContact(c.id, c.name ?? c.email ?? c.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                          "flex items-center gap-2"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium shrink-0">
                          {(c.name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{c.name ?? "Unnamed"}</p>
                          {c.email && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {c.email}
                            </p>
                          )}
                        </div>
                        {c.company && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {c.company}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pipeline */}
            <select
              value={pipelineId}
              onChange={(e) => {
                setPipelineId(e.target.value);
                setStage(""); // reset stage when pipeline changes
              }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Select pipeline</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Stage */}
            {stages.length > 0 && (
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Select stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.probability}%)
                  </option>
                ))}
              </select>
            )}

            {/* Value + Currency */}
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Deal value"
                type="text"
                inputMode="decimal"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {/* Expected close date */}
            <input
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
              type="date"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />

            {/* Probability hint */}
            {selectedStage && (
              <p className="text-xs text-muted-foreground">
                Probability will be set to {selectedStage.probability}% based on
                stage.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createDeal.isPending || !title.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                {createDeal.isPending ? "Creating..." : "Create Deal"}
              </button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
