import { create } from "zustand";

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

interface DriveState {
  files: DriveFile[];
  currentFolder: string;
  view: "grid" | "list";
  searchQuery: string;
  selectedFileId: string | null;
  setFiles: (files: DriveFile[]) => void;
  addFile: (file: DriveFile) => void;
  removeFile: (id: string) => void;
  setCurrentFolder: (folder: string) => void;
  setView: (view: "grid" | "list") => void;
  setSearchQuery: (query: string) => void;
  setSelectedFile: (id: string | null) => void;
}

export const useDriveStore = create<DriveState>((set) => ({
  files: [],
  currentFolder: "/",
  view: "grid",
  searchQuery: "",
  selectedFileId: null,
  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [file, ...s.files] })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setView: (view) => set({ view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedFile: (id) => set({ selectedFileId: id }),
}));
