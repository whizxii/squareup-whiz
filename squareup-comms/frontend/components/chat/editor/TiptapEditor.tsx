"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Mention from "@tiptap/extension-mention";
import {
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
} from "react";

import { FloatingToolbar } from "./FloatingToolbar";
import { createMentionSuggestion } from "./mentionSuggestion";
import {
  SlashCommandMenu,
  type SlashCommand,
} from "../command/SlashCommandMenu";
import type { MentionSuggestion as MentionSuggestionType } from "../mentions/MentionList";
import type { Mention as MentionData } from "@/lib/stores/chat-store";

export interface TiptapEditorHandle {
  focus: () => void;
  clear: () => void;
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  insertText: (text: string) => void;
  getMentions: () => MentionData[];
}

interface TiptapEditorProps {
  placeholder?: string;
  initialContent?: string;
  onUpdate?: (html: string, text: string) => void;
  onSubmit?: () => void;
  onTyping?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  editable?: boolean;
  compact?: boolean;
  mentionSuggestions?: MentionSuggestionType[];
}

/**
 * Custom Mention extension with a `type` attribute
 * so user mentions and agent mentions render differently.
 */
const CustomMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: "user",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-mention-type") || "user",
        renderHTML: (attributes: Record<string, string>) => ({
          "data-mention-type": attributes.type || "user",
        }),
      },
    };
  },
});

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor(
    {
      placeholder = "Type a message...",
      initialContent = "",
      onUpdate,
      onSubmit,
      onTyping,
      onFocus,
      onBlur,
      editable = true,
      compact = false,
      mentionSuggestions = [],
    },
    ref
  ) {
    // Track whether the mention popup is open to prevent Enter-to-send
    const mentionActiveRef = useRef(false);

    // Slash command state
    const [slashQuery, setSlashQuery] = useState("");
    const [slashVisible, setSlashVisible] = useState(false);
    const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
    const slashActiveRef = useRef(false);

    // Keep latest suggestions in a ref so the suggestion plugin
    // always reads current data (plugin is captured at creation time)
    const suggestionsRef = useRef<MentionSuggestionType[]>(mentionSuggestions);
    useEffect(() => {
      suggestionsRef.current = mentionSuggestions;
    }, [mentionSuggestions]);

    // Stable ref for onSubmit to avoid re-creating editor
    const onSubmitRef = useRef(onSubmit);
    useEffect(() => {
      onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          horizontalRule: false,
          codeBlock: {
            HTMLAttributes: {
              class:
                "rounded-lg bg-muted/80 p-3 font-mono text-[13px] my-1.5 overflow-x-auto",
            },
          },
          code: {
            HTMLAttributes: {
              class: "rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]",
            },
          },
          blockquote: {
            HTMLAttributes: {
              class:
                "border-l-2 border-primary/30 pl-3 italic text-muted-foreground",
            },
          },
        }),
        Placeholder.configure({ placeholder }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2 cursor-pointer",
          },
        }),
        Underline,
        CustomMention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: createMentionSuggestion(
            () => suggestionsRef.current,
            mentionActiveRef
          ),
        }),
      ],
      content: initialContent,
      editable,
      editorProps: {
        attributes: {
          class: compact
            ? "prose prose-sm max-w-none focus:outline-none min-h-[36px] max-h-[80px] overflow-y-auto px-3 py-2 text-sm scrollbar-thin"
            : "prose prose-sm max-w-none focus:outline-none min-h-[40px] max-h-[160px] overflow-y-auto px-4 py-2.5 text-sm scrollbar-thin",
          "aria-label": "Message input",
        },
        handleKeyDown: (_view, event) => {
          // Don't intercept Enter when the mention or slash popup is open
          if (mentionActiveRef.current || slashActiveRef.current) return false;

          if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            onSubmitRef.current?.();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        const text = ed.getText();
        onUpdate?.(html, text);
        onTyping?.();

        // Slash command detection: check if current line starts with /
        const { state } = ed;
        const { from } = state.selection;
        const currentLine = state.doc.textBetween(
          Math.max(0, state.doc.resolve(from).start()),
          from,
          ""
        );

        if (currentLine.startsWith("/")) {
          setSlashQuery(currentLine);
          slashActiveRef.current = true;

          // Position the menu above cursor
          const coords = ed.view.coordsAtPos(from);
          setSlashPosition({ top: coords.top, left: coords.left });
          setSlashVisible(true);
        } else if (slashActiveRef.current) {
          setSlashVisible(false);
          slashActiveRef.current = false;
        }
      },
      onFocus: () => onFocus?.(),
      onBlur: () => onBlur?.(),
    });

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      clear: () => editor?.commands.clearContent(),
      getHTML: () => editor?.getHTML() ?? "",
      getText: () => editor?.getText() ?? "",
      isEmpty: () => editor?.isEmpty ?? true,
      insertText: (text: string) => editor?.commands.insertContent(text),
      getMentions: () => {
        if (!editor) return [];
        const mentions: MentionData[] = [];
        editor.state.doc.descendants((node) => {
          if (node.type.name === "mention") {
            mentions.push({
              type: (node.attrs.type as "user" | "agent") || "user",
              id: node.attrs.id as string,
            });
          }
        });
        return mentions;
      },
    }));

    // Sync editable state
    useEffect(() => {
      if (editor && editor.isEditable !== editable) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        editor?.destroy();
      };
    }, [editor]);

    const handleLinkAdd = useCallback(
      (url: string) => {
        if (!editor) return;
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      },
      [editor]
    );

    // Handle slash command selection — clear the /query text and execute
    const handleSlashSelect = useCallback(
      (command: SlashCommand) => {
        if (!editor) return;

        // Delete the slash command text from the editor
        const { state } = editor;
        const { from } = state.selection;
        const lineStart = state.doc.resolve(from).start();
        editor.chain().focus().deleteRange({ from: lineStart, to: from }).run();

        setSlashVisible(false);
        slashActiveRef.current = false;

        // Execute the command
        command.execute("");
      },
      [editor]
    );

    const handleSlashClose = useCallback(() => {
      setSlashVisible(false);
      slashActiveRef.current = false;
    }, []);

    if (!editor) return null;

    return (
      <div className="relative">
        <FloatingToolbar editor={editor} onLinkAdd={handleLinkAdd} />
        <EditorContent editor={editor} />
        <SlashCommandMenu
          query={slashQuery}
          visible={slashVisible}
          position={slashPosition}
          onSelect={handleSlashSelect}
          onClose={handleSlashClose}
        />
      </div>
    );
  }
);
