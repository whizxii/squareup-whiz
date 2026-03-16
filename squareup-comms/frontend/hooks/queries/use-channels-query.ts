"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Query key factory for channels */
export const channelKeys = {
  all: ["channels"] as const,
  detail: (id: string) => ["channels", id] as const,
};

/** Channels list with stale-while-revalidate */
export function useChannelsQuery() {
  return useQuery({
    queryKey: channelKeys.all,
    queryFn: () => api.getChannels(),
    staleTime: 60_000, // 1 min stale-while-revalidate
    refetchOnWindowFocus: true,
  });
}

/** Single channel detail */
export function useChannelQuery(channelId: string | null) {
  return useQuery({
    queryKey: channelId ? channelKeys.detail(channelId) : ["channels", "none"],
    queryFn: () => {
      if (!channelId) throw new Error("No channel ID");
      return api.getChannel(channelId);
    },
    enabled: !!channelId,
    staleTime: 60_000,
  });
}

/** Create channel mutation */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      type: string;
      description?: string;
      icon?: string;
    }) => api.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
}
