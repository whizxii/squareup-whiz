"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore, Message } from "@/lib/stores/chat-store";
import { useCallback } from "react";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const MESSAGES_PAGE_SIZE = 50;

/** Query key factory for messages */
export const messageKeys = {
  all: ["messages"] as const,
  channel: (channelId: string) => ["messages", channelId] as const,
  thread: (messageId: string) => ["messages", "thread", messageId] as const,
};

/**
 * Infinite query for paginated message loading.
 * Fetches older messages on scroll-up (cursor-based via beforeId).
 */
export function useMessagesQuery(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: channelId ? messageKeys.channel(channelId) : ["messages", "none"],
    queryFn: async ({ pageParam }) => {
      if (!channelId) return [];
      return api.getMessages(channelId, pageParam, MESSAGES_PAGE_SIZE);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // If we got fewer messages than requested, we've reached the start
      if (lastPage.length < MESSAGES_PAGE_SIZE) return undefined;
      return lastPage[0]?.id;
    },
    enabled: !!channelId,
    staleTime: 60_000,
  });
}

/** Query for thread replies */
export function useThreadQuery(messageId: string | null) {
  return useInfiniteQuery({
    queryKey: messageId ? messageKeys.thread(messageId) : ["messages", "thread", "none"],
    queryFn: async () => {
      if (!messageId) return [];
      return api.getThreadReplies(messageId);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: () => undefined,
    enabled: !!messageId,
    staleTime: 30_000,
  });
}

/** Send message mutation with optimistic update */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const addMessage = useChatStore((s) => s.addMessage);

  return useMutation({
    mutationFn: async (data: {
      channel_id: string;
      content: string;
      content_html?: string;
      thread_id?: string;
      mentions?: { type: string; id: string }[];
    }) => {
      return api.sendMessage(data);
    },
    onMutate: async (variables) => {
      // Optimistic: add message to store immediately
      const optimisticMsg: Message = {
        id: `pending-${Date.now()}`,
        channel_id: variables.channel_id,
        sender_id: getCurrentUserId(),
        sender_name: "You",
        sender_type: "user",
        content: variables.content,
        content_html: variables.content_html,
        thread_id: variables.thread_id,
        reply_count: 0,
        edited: false,
        pinned: false,
        pending: true,
        created_at: new Date().toISOString(),
        reactions: [],
      };
      addMessage(variables.channel_id, optimisticMsg);
      return { optimisticMsg };
    },
    onSuccess: (serverMsg, variables, context) => {
      // Replace optimistic message with server response
      if (context?.optimisticMsg) {
        const removeMessage = useChatStore.getState().removeMessage;
        removeMessage(variables.channel_id, context.optimisticMsg.id);
        addMessage(variables.channel_id, serverMsg as unknown as Message);
      }
      queryClient.invalidateQueries({
        queryKey: messageKeys.channel(variables.channel_id),
      });
    },
    onError: (_error, variables, context) => {
      // Mark optimistic message as failed
      if (context?.optimisticMsg) {
        const updateMessage = useChatStore.getState().updateMessage;
        updateMessage(variables.channel_id, context.optimisticMsg.id, {
          pending: false,
          failed: true,
        });
      }
    },
  });
}

/** Edit message mutation */
export function useEditMessage() {
  const queryClient = useQueryClient();
  const updateMessage = useChatStore((s) => s.updateMessage);

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      contentHtml,
    }: {
      messageId: string;
      channelId: string;
      content: string;
      contentHtml?: string;
    }) => {
      return api.editMessage(messageId, content, contentHtml);
    },
    onMutate: async (variables) => {
      // Optimistic edit
      updateMessage(variables.channelId, variables.messageId, {
        content: variables.content,
        content_html: variables.contentHtml,
        edited: true,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.channel(variables.channelId),
      });
    },
  });
}

/** Delete message mutation */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const removeMessage = useChatStore((s) => s.removeMessage);

  return useMutation({
    mutationFn: async ({
      messageId,
    }: {
      messageId: string;
      channelId: string;
    }) => {
      return api.deleteMessage(messageId);
    },
    onMutate: async (variables) => {
      removeMessage(variables.channelId, variables.messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.channel(variables.channelId),
      });
    },
  });
}

/** Reaction toggle mutation with optimistic update */
export function useToggleReaction() {
  const updateMessage = useChatStore((s) => s.updateMessage);

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      hasExisting,
    }: {
      messageId: string;
      channelId: string;
      emoji: string;
      hasExisting: boolean;
      currentReactions: Message["reactions"];
    }) => {
      if (hasExisting) {
        return api.removeReaction(messageId, emoji);
      }
      return api.addReaction(messageId, emoji);
    },
    onMutate: async (variables) => {
      const currentUserId = getCurrentUserId();
      const updatedReactions = variables.hasExisting
        ? (variables.currentReactions || []).filter(
            (r) => !(r.emoji === variables.emoji && r.user_id === currentUserId)
          )
        : [
            ...(variables.currentReactions || []),
            {
              emoji: variables.emoji,
              user_id: currentUserId,
              created_at: new Date().toISOString(),
            },
          ];

      updateMessage(variables.channelId, variables.messageId, {
        reactions: updatedReactions,
      });

      return { previousReactions: variables.currentReactions };
    },
    onError: (_error, variables, context) => {
      // Revert on failure
      if (context?.previousReactions) {
        updateMessage(variables.channelId, variables.messageId, {
          reactions: context.previousReactions,
        });
      }
    },
  });
}
