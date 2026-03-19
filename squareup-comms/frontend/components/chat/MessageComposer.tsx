"use client";

import { useChatStore, type Message as StoreMessage } from "@/lib/stores/chat-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Smile, Paperclip, Mic, MicOff, Send } from "lucide-react";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { TiptapEditor, type TiptapEditorHandle } from "./editor/TiptapEditor";
import { type UploadFile } from "./upload/FilePreview";
import { SmartReplies } from "./SmartReplies";
import type { MentionSuggestion } from "./mentions/MentionList";
import { EffectPicker } from "./effects/EffectPicker";
import { detectEffect, type EffectType } from "./effects/MessageEffects";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useUsers } from "@/lib/hooks/use-users";

// Web Speech API type declarations (not in default TS lib)
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface MessageComposerProps {
  onTypingChange?: (isTyping: boolean) => void;
}

export function MessageComposer({ onTypingChange }: MessageComposerProps) {
  const currentUserId = useCurrentUserId();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const addMessage = useChatStore((s) => s.addMessage);
  const agents = useAgentStore((s) => s.agents);
  const { users } = useUsers();

  // Build mention suggestions from real users + agents
  const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
    const agentSuggestions: MentionSuggestion[] = agents
      .filter((a) => a.active)
      .map((a) => ({
        id: a.id,
        label: a.name,
        type: "agent" as const,
        icon: a.office_station_icon,
        description: a.description,
      }));

    const userSuggestions: MentionSuggestion[] = users.map((u) => ({
      id: u.id,
      label: u.id === currentUserId ? "You" : u.display_name,
      type: "user" as const,
    }));

    // If users haven't loaded yet, at least show current user
    if (userSuggestions.length === 0) {
      userSuggestions.push({ id: currentUserId, label: "You", type: "user" });
    }

    return [...userSuggestions, ...agentSuggestions];
  }, [agents, currentUserId, users]);

  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [pendingEffect, setPendingEffect] = useState<EffectType | null>(null);

  const editorRef = useRef<TiptapEditorHandle>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Draft key for per-channel persistence
  const draftKey = activeChannelId ? `sq_draft_${activeChannelId}` : null;

  // Restore draft on channel switch
  const initialDraft = useMemo(() => {
    if (!draftKey) return "";
    try {
      return localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  }, [draftKey]);

  // Save draft on content change (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveDraft = useCallback(
    (html: string) => {
      if (!draftKey) return;
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        try {
          if (html && html !== "<p></p>") {
            localStorage.setItem(draftKey, html);
          } else {
            localStorage.removeItem(draftKey);
          }
        } catch {
          // localStorage full or unavailable
        }
      }, 500);
    },
    [draftKey]
  );

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!activeChannelId || sending) return;
    const editor = editorRef.current;
    if (!editor) return;

    const text = editor.getText().trim();
    const html = editor.getHTML();

    if (!text && uploadFiles.length === 0) return;

    // Extract mentions from editor before clearing
    const mentions = editor.getMentions();

    // Optimistic: generate a temp ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Determine effect: manual pick takes priority, then auto-detect from text
    const effectType = pendingEffect ?? detectEffect(text);

    // Optimistic message
    const optimisticMsg: StoreMessage = {
      id: tempId,
      channel_id: activeChannelId,
      sender_id: currentUserId,
      sender_type: "user",
      content: text,
      content_html: html !== "<p></p>" ? html : undefined,
      created_at: new Date().toISOString(),
      sender_name: "You",
      reply_count: 0,
      edited: false,
      pinned: false,
      reactions: [],
      attachments: [],
      mentions,
      effect_type: effectType ?? undefined,
    };

    // Add optimistically
    addMessage(activeChannelId, optimisticMsg);
    editor.clear();
    setHasContent(false);
    setPendingEffect(null);
    setSending(true);
    onTypingChange?.(false);

    // Clear draft
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }

    try {
      const message = await api.sendMessage({
        channel_id: activeChannelId,
        content: text,
        content_html: html !== "<p></p>" ? html : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });

      // Replace temp message with server response
      const updateMessage = useChatStore.getState().updateMessage;
      updateMessage(activeChannelId, tempId, {
        id: message.id,
        created_at: message.created_at,
        updated_at: message.updated_at,
      });
    } catch (err) {
      // Mark as failed — keep the message but show error state
      const updateMessage = useChatStore.getState().updateMessage;
      updateMessage(activeChannelId, tempId, {
        sender_name: "You (failed to send)",
      });
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      editor.focus();
    }

    // Agent invocation is handled server-side via WebSocket handler
    // (handle_chat_send detects agent mentions and spawns execution tasks)
  }, [activeChannelId, sending, addMessage, onTypingChange, draftKey, uploadFiles.length]);

  const handleEditorUpdate = useCallback(
    (html: string, text: string) => {
      const empty = !text.trim();
      setHasContent(!empty);
      saveDraft(html);
      if (!empty) {
        onTypingChange?.(true);
      }
    },
    [saveDraft, onTypingChange]
  );

  const handleEmojiSelect = useCallback(
    (emoji: { native: string }) => {
      editorRef.current?.insertText(emoji.native);
      setShowEmojiPicker(false);
      editorRef.current?.focus();
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      const newFiles: UploadFile[] = Array.from(e.target.files).map((file) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadFiles((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    },
    []
  );

  const removeFile = useCallback((id: string) => {
    setUploadFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        editorRef.current?.insertText(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsVoiceActive(false);
    };

    recognition.onend = () => {
      setIsVoiceActive(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsVoiceActive(true);
  }, [isVoiceActive]);

  // Handle paste for images
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const uploadFile: UploadFile = {
            id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            name: `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
            size: file.size,
            type: file.type,
            preview: URL.createObjectURL(file),
            progress: 0,
            status: "pending",
          };

          setUploadFiles((prev) => [...prev, uploadFile]);
          break;
        }
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, []);

  const handleSmartReplySelect = useCallback((text: string) => {
    editorRef.current?.insertText(text);
    editorRef.current?.focus();
    setHasContent(true);
  }, []);

  const handleEffectSelect = useCallback((effect: EffectType) => {
    setPendingEffect(effect);
  }, []);

  if (!activeChannelId) return null;

  const canSend = hasContent || uploadFiles.length > 0;

  return (
    <div className="border-t border-border bg-card">
      {/* Smart reply suggestions */}
      <SmartReplies onSelect={handleSmartReplySelect} />

      {/* File previews */}
      {uploadFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/50">
          {uploadFiles.map((file) => (
            <FilePreviewPill
              key={file.id}
              file={file}
              onRemove={() => removeFile(file.id)}
            />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Editor area */}
        <div
          className={cn(
            "mx-3 mt-3 mb-1 rounded-xl border border-border bg-background transition-all",
            "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30"
          )}
        >
          <TiptapEditor
            ref={editorRef}
            placeholder="Type a message... (Shift+Enter for new line)"
            initialContent={initialDraft}
            onUpdate={handleEditorUpdate}
            onSubmit={handleSend}
            onTyping={() => onTypingChange?.(true)}
            mentionSuggestions={mentionSuggestions}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-0.5">
            {/* Attach */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <ToolbarBtn
              icon={<Paperclip className="w-4 h-4" />}
              label="Attach file"
              onClick={() => fileInputRef.current?.click()}
            />

            {/* Emoji */}
            <div className="relative" ref={emojiPickerRef}>
              <ToolbarBtn
                icon={<Smile className="w-4 h-4" />}
                label="Emoji"
                active={showEmojiPicker}
                onClick={() => setShowEmojiPicker((v) => !v)}
              />
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="auto"
                    previewPosition="none"
                    skinTonePosition="none"
                    maxFrequentRows={2}
                  />
                </div>
              )}
            </div>

            {/* Voice */}
            <ToolbarBtn
              icon={
                isVoiceActive ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )
              }
              label={isVoiceActive ? "Stop voice input" : "Voice input"}
              active={isVoiceActive}
              activeColor="text-red-500 bg-red-500/10"
              onClick={toggleVoice}
            />

            {/* Effects */}
            <EffectPicker onSelect={handleEffectSelect} />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pending effect badge */}
            {pendingEffect && (
              <button
                onClick={() => setPendingEffect(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                title="Click to remove effect"
              >
                <span>
                  {pendingEffect === "confetti" && "\u{1F389}"}
                  {pendingEffect === "balloons" && "\u{1F388}"}
                  {pendingEffect === "fireworks" && "\u{1F386}"}
                  {pendingEffect === "sparkles" && "\u2728"}
                </span>
                <span className="capitalize">{pendingEffect}</span>
              </button>
            )}

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              className={cn(
                "p-2 rounded-lg transition-all duration-150",
                canSend && !sending
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  active = false,
  activeColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? activeColor ?? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {icon}
    </button>
  );
}

function FilePreviewPill({
  file,
  onRemove,
}: {
  file: UploadFile;
  onRemove: () => void;
}) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs">
      {isImage && file.preview ? (
        <div className="w-8 h-8 rounded overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <span className="truncate max-w-[120px]">{file.name}</span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Remove ${file.name}`}
      >
        <span className="sr-only">Remove</span>
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
