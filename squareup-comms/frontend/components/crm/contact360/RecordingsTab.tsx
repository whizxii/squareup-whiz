"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRecordings, useRecording, useTriggerTranscription } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import type { CallRecording } from "@/lib/types/crm";
import {
  Mic,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Plus,
  FileText,
  Sparkles,
  ChevronRight,
} from "lucide-react";

// ─── Status config ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", icon: Loader2 },
  completed: { label: "Transcribed", color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Recording Row ──────────────────────────────────────────────

function RecordingRow({
  recording,
  onSelect,
  onTranscribe,
  isTranscribing,
}: {
  recording: CallRecording;
  onSelect: (id: string) => void;
  onTranscribe: (id: string) => void;
  isTranscribing: boolean;
}) {
  const status = STATUS_CONFIG[recording.transcription_status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div
      className="rounded-lg border border-border p-3 transition-colors hover:shadow-sm cursor-pointer"
      onClick={() => onSelect(recording.id)}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{recording.title}</p>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(recording.duration_seconds)}
            </span>
            <span>{new Date(recording.created_at).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1", status.color)}>
              <StatusIcon className={cn("w-3 h-3", recording.transcription_status === "processing" && "animate-spin")} />
              {status.label}
            </span>

            {recording.ai_sentiment && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  recording.ai_sentiment === "positive" && "bg-green-50 text-green-600 dark:bg-green-900/20",
                  recording.ai_sentiment === "neutral" && "bg-gray-100 text-gray-500 dark:bg-gray-800",
                  recording.ai_sentiment === "negative" && "bg-red-50 text-red-600 dark:bg-red-900/20",
                  recording.ai_sentiment === "mixed" && "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                )}
              >
                {recording.ai_sentiment}
              </span>
            )}

            {recording.ai_action_items.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {recording.ai_action_items.filter((a) => a.is_completed).length}/{recording.ai_action_items.length} actions
              </span>
            )}
          </div>

          {recording.ai_summary && (
            <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
              {recording.ai_summary}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {recording.transcription_status === "pending" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTranscribe(recording.id);
              }}
              disabled={isTranscribing}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
            >
              {isTranscribing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Transcribe
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ─── RecordingsTab ──────────────────────────────────────────────

interface RecordingsTabProps {
  contactId: string;
}

export function RecordingsTab({ contactId }: RecordingsTabProps) {
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, error } = useRecordings(contactId);
  const recordings: CallRecording[] = data?.items ?? [];
  const triggerTranscription = useTriggerTranscription(contactId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={80} className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-sm font-medium">Failed to load recordings</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Mic className="w-6 h-6" />}
          title="No recordings yet"
          description="Upload call recordings to get AI-powered transcription, summaries, and action items."
          action={{
            label: "Upload Recording",
            onClick: () => openDialog("upload-recording", { contact_id: contactId }),
          }}
        />
      </div>
    );
  }

  // If a recording is selected, show detail view
  if (selectedId) {
    return (
      <TranscriptionDetail
        recordingId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {recordings.length} recording{recordings.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => openDialog("upload-recording", { contact_id: contactId })}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="w-3 h-3" /> Upload Recording
        </button>
      </div>

      {/* Recording list */}
      <div className="space-y-2">
        {recordings.map((rec) => (
          <RecordingRow
            key={rec.id}
            recording={rec}
            onSelect={setSelectedId}
            onTranscribe={(id) => triggerTranscription.mutate(id)}
            isTranscribing={triggerTranscription.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Transcription Detail View ──────────────────────────────────

function TranscriptionDetail({
  recordingId,
  onBack,
}: {
  recordingId: string;
  onBack: () => void;
}) {
  const { data, isLoading, error } = useRecording(recordingId);
  const recording: CallRecording | undefined = data ?? undefined;

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton height={40} className="rounded-lg" />
        <Skeleton height={200} className="rounded-lg" />
        <Skeleton height={100} className="rounded-lg" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-xs text-primary hover:underline mb-4">
          &larr; Back to recordings
        </button>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-sm font-medium mt-2">Failed to load recording</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-primary hover:underline">
          &larr; Back to recordings
        </button>
        <span className="text-[10px] text-muted-foreground">
          {formatDuration(recording.duration_seconds)} &middot;{" "}
          {new Date(recording.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{recording.title}</h3>
          {recording.ai_sentiment && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                recording.ai_sentiment === "positive" && "bg-green-50 text-green-600 dark:bg-green-900/20",
                recording.ai_sentiment === "neutral" && "bg-gray-100 text-gray-500 dark:bg-gray-800",
                recording.ai_sentiment === "negative" && "bg-red-50 text-red-600 dark:bg-red-900/20",
                recording.ai_sentiment === "mixed" && "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
              )}
            >
              Sentiment: {recording.ai_sentiment}
            </span>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {recording.ai_summary && (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI Summary
          </h4>
          <p className="text-sm leading-relaxed">{recording.ai_summary}</p>
        </div>
      )}

      {/* Key Topics */}
      {recording.ai_key_topics.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Key Topics
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {recording.ai_key_topics.map((topic, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {topic.topic}
                <span className="ml-1 opacity-60">{Math.round(topic.relevance_score * 100)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {recording.ai_action_items.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Action Items
          </h4>
          <div className="space-y-1.5">
            {recording.ai_action_items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border p-2.5"
              >
                <CheckCircle2
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    item.is_completed ? "text-green-500" : "text-gray-300 dark:text-gray-600"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs", item.is_completed && "line-through text-muted-foreground")}>
                    {item.text}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    {item.assignee && <span>{item.assignee}</span>}
                    {item.due_date && <span>Due: {item.due_date}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objections */}
      {recording.ai_objections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Objections
          </h4>
          <div className="space-y-1.5">
            {recording.ai_objections.map((obj, i) => (
              <div key={i} className="rounded-lg border border-border p-2.5">
                <p className="text-xs font-medium">{obj.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{obj.context}</p>
                <span
                  className={cn(
                    "inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    obj.resolved
                      ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                  )}
                >
                  {obj.resolved ? "Resolved" : "Unresolved"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {recording.ai_next_steps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Next Steps
          </h4>
          <ul className="space-y-1">
            {recording.ai_next_steps.map((step, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript */}
      {recording.transcript && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Transcript
          </h4>
          <div className="rounded-lg border border-border p-4 max-h-80 overflow-y-auto scrollbar-thin space-y-2">
            {recording.transcript_segments.length > 0
              ? recording.transcript_segments.map((seg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[10px] font-semibold text-primary shrink-0 w-20 text-right">
                      {seg.speaker}
                    </span>
                    <p className="text-xs leading-relaxed">{seg.text}</p>
                  </div>
                ))
              : <p className="text-xs whitespace-pre-wrap">{recording.transcript}</p>
            }
          </div>
        </div>
      )}
    </div>
  );
}
