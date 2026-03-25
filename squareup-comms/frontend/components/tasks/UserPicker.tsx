"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X, User } from "lucide-react";
import { useUsers, type AppUser } from "@/lib/hooks/use-users";

// ─── Types ──────────────────────────────────────────────────────

interface UserPickerProps {
  /** Currently selected user ID (firebase_uid) */
  value: string;
  /** Called with the selected user's firebase_uid, or "" to clear */
  onChange: (userId: string) => void;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Additional CSS class for the trigger button */
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────

export function UserPicker({
  value,
  onChange,
  placeholder = "Select team member",
  className = "",
}: UserPickerProps) {
  const { users, loading } = useUsers();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === value);

  const handleSelect = (user: AppUser) => {
    onChange(user.id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
      >
        {selectedUser ? (
          <span className="flex items-center gap-2 truncate">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
              {getInitials(selectedUser.display_name)}
            </span>
            <span className="truncate">{selectedUser.display_name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground truncate">{placeholder}</span>
        )}

        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-accent"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring/30"
            />
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Loading team members...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No members found
              </div>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
                    user.id === value ? "bg-accent/60 font-medium" : ""
                  }`}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
                      {getInitials(user.display_name)}
                    </span>
                  )}
                  <span className="flex flex-col min-w-0">
                    <span className="truncate">{user.display_name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
