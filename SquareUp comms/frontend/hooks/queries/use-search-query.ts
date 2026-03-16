"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";

/** Query key factory for search */
export const searchKeys = {
  messages: (query: string) => ["search", "messages", query] as const,
};

interface SearchResult {
  id: string;
  channel_id: string;
  channel_name?: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
  highlight?: string;
}

/**
 * Debounced message search query.
 * Waits 300ms after last keystroke before firing.
 */
export function useSearchQuery(enabled = true) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce the search query
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const searchResult = useQuery({
    queryKey: searchKeys.messages(debouncedQuery),
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery) return [];
      const params = new URLSearchParams({ q: debouncedQuery });
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/messages/search?${params}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    query,
    setQuery,
    results: searchResult.data ?? [],
    isLoading: searchResult.isLoading,
    isError: searchResult.isError,
    clearSearch,
  };
}
