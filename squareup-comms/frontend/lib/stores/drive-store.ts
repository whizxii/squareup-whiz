import { create } from "zustand";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  folder: string;
  thumbnail_url?: string;
  storage_path: string;
  channel_id?: string;
  contact_id?: string;
  agent_id?: string;
  uploaded_by: string;
  uploaded_by_type: "user" | "agent";
  created_at: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) return { Authorization: `Bearer ${token}` };
  return { "X-User-Id": getCurrentUserId() };
}

interface DriveState {
  files: DriveFile[];
  currentFolder: string;
  view: "grid" | "list";
  searchQuery: string;
  selectedFileId: string | null;
  loading: boolean;
  error: string | null;

  // Synchronous actions
  setFiles: (files: DriveFile[]) => void;
  addFile: (file: DriveFile) => void;
  removeFile: (id: string) => void;
  setCurrentFolder: (folder: string) => void;
  setView: (view: "grid" | "list") => void;
  setSearchQuery: (query: string) => void;
  setSelectedFile: (id: string | null) => void;

  // Async API actions
  fetchFiles: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  downloadFile: (id: string) => Promise<void>;
}

export const useDriveStore = create<DriveState>((set, get) => ({
  files: [],
  currentFolder: "/",
  view: "grid",
  searchQuery: "",
  selectedFileId: null,
  loading: false,
  error: null,

  // --- Synchronous actions (unchanged) ---

  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [file, ...s.files] })),
  removeFile: (id) =>
    set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setView: (view) => set({ view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedFile: (id) => set({ selectedFileId: id }),

  // --- Async API actions ---

  fetchFiles: async () => {
    const { currentFolder, searchQuery } = get();

    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({ folder: currentFolder });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(
        `${API_URL}/api/drive/files?${params.toString()}`,
        { headers: getAuthHeaders() },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch files: ${response.status} ${response.statusText}`,
        );
      }

      const files: DriveFile[] = await response.json();
      set({ files, loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch files";
      set({ error: message, loading: false });
    }
  },

  uploadFile: async (file: File) => {
    const { currentFolder } = get();

    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams({ folder: currentFolder });

      // Do NOT set Content-Type — the browser sets the multipart boundary.
      const response = await fetch(
        `${API_URL}/api/drive/upload?${params.toString()}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to upload file: ${response.status} ${response.statusText}`,
        );
      }

      const uploaded: DriveFile = await response.json();
      set((s) => ({
        files: [uploaded, ...s.files],
        loading: false,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload file";
      set({ error: message, loading: false });
    }
  },

  deleteFile: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/drive/files/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to delete file: ${response.status} ${response.statusText}`,
        );
      }

      set((s) => ({
        files: s.files.filter((f) => f.id !== id),
        loading: false,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete file";
      set({ error: message, loading: false });
    }
  },

  downloadFile: async (id: string) => {
    set({ error: null });
    try {
      const downloadUrl = `${API_URL}/api/drive/files/${id}/download`;
      const token = useAuthStore.getState().token;

      if (token) {
        // For authenticated requests, fetch the blob and trigger a download
        // so the Authorization header is included.
        const response = await fetch(downloadUrl, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to download file: ${response.status} ${response.statusText}`,
          );
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Derive filename from Content-Disposition or fall back to the store.
        const disposition = response.headers.get("Content-Disposition");
        const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
        const storeFile = get().files.find((f) => f.id === id);
        const filename =
          filenameMatch?.[1] ?? storeFile?.name ?? "download";

        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();

        // Clean up
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Without a token we rely on the X-User-Id cookie/header approach.
        // Opening in a new tab is the simplest mechanism.
        window.open(downloadUrl, "_blank");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to download file";
      set({ error: message });
    }
  },
}));
