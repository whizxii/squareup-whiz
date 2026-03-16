"use client";

import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  MentionList,
  type MentionSuggestion,
} from "../mentions/MentionList";

type MentionActiveRef = React.MutableRefObject<boolean>;
type SuggestionsGetter = () => MentionSuggestion[];

/**
 * Creates a Tiptap Suggestion configuration for @mentions.
 *
 * Uses a `getItems` callback so the items list stays reactive
 * even though the Tiptap extension is created once on mount.
 *
 * `activeRef` is toggled true/false so the parent editor can
 * skip Enter-to-send while the mention popup is open.
 */
export function createMentionSuggestion(
  getItems: SuggestionsGetter,
  activeRef: MentionActiveRef
): Omit<SuggestionOptions<MentionSuggestion>, "editor"> {
  return {
    items: ({ query }: { query: string }) => {
      const all = getItems();
      if (!query) return all.slice(0, 10);

      const lower = query.toLowerCase();
      return all
        .filter(
          (item) =>
            item.label.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower)
        )
        .slice(0, 10);
    },

    render: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let component: ReactRenderer<any, any> | null = null;
      let popup: HTMLDivElement | null = null;

      return {
        onStart: (props) => {
          activeRef.current = true;

          // Create floating container
          popup = document.createElement("div");
          popup.style.position = "fixed";
          popup.style.zIndex = "9999";
          document.body.appendChild(popup);

          component = new ReactRenderer(MentionList, {
            props: {
              items: props.items,
              command: (item: MentionSuggestion) => {
                props.command({
                  id: item.id,
                  label: item.label,
                  type: item.type,
                });
              },
            },
            editor: props.editor,
          });

          if (component.element) {
            popup.appendChild(component.element);
          }

          updatePosition(props, popup);
        },

        onUpdate: (props) => {
          component?.updateProps({
            items: props.items,
            command: (item: MentionSuggestion) => {
              props.command({
                id: item.id,
                label: item.label,
                type: item.type,
              });
            },
          });

          if (popup) {
            updatePosition(props, popup);
          }
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === "Escape") {
            activeRef.current = false;
            popup?.remove();
            component?.destroy();
            popup = null;
            component = null;
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          activeRef.current = false;
          popup?.remove();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  };
}

/**
 * Positions the popup above the cursor using the `clientRect`
 * provided by Tiptap's suggestion plugin.
 */
function updatePosition(
  props: { clientRect?: (() => DOMRect | null) | null },
  popup: HTMLDivElement
) {
  const rect = props.clientRect?.();
  if (!rect || !popup) return;

  // Position above the cursor
  const popupHeight = popup.offsetHeight || 200;
  const top = rect.top - popupHeight - 8;
  const left = rect.left;

  // If popup would go off-screen top, show below instead
  const finalTop = top < 8 ? rect.bottom + 8 : top;

  popup.style.top = `${finalTop}px`;
  popup.style.left = `${Math.max(8, left)}px`;
}
