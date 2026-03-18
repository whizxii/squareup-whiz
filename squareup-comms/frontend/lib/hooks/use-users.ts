"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

/**
 * Fetches all users once and caches in component state.
 * Returns { users, usersMap, loading }.
 * usersMap is a Map<userId, displayName> for quick lookups.
 */
export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      try {
        const data = await api.getUsers();
        if (!cancelled) {
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const usersMap = new Map(users.map((u) => [u.id, u.display_name]));

  return { users, usersMap, loading };
}
