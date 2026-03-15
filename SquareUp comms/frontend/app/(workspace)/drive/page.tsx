"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDriveStore, DriveFile } from "@/lib/stores/drive-store";
import {
  LayoutGrid,
  List,
  Search,
  Upload,
  ChevronRight,
  Home,
  ArrowUpDown,
  FolderOpen,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFolderLabel } from "@/lib/drive-utils";
import { DriveGridView } from "@/components/drive/DriveGridView";
import { DriveListView } from "@/components/drive/DriveListView";
import { DriveDetailPanel } from "@/components/drive/DriveDetailPanel";
import { DriveEmptyState } from "@/components/drive/DriveEmptyState";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FOLDERS = ["/", "/recordings", "/proposals", "/assets"] as const;

type SortKey = "name" | "date";
type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Mock seed data                                                     */
/* ------------------------------------------------------------------ */

const MOCK_FILES: DriveFile[] = [
  {
    id: "f1",
    name: "Q1 Sales Proposal.pdf",
    mime_type: "application/pdf",
    size_bytes: 2_456_000,
    folder: "/proposals",
    storage_path: "/proposals/q1-sales-proposal.pdf",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-03-12T10:30:00Z",
  },
  {
    id: "f2",
    name: "Brand Guidelines.pdf",
    mime_type: "application/pdf",
    size_bytes: 8_120_000,
    folder: "/assets",
    storage_path: "/assets/brand-guidelines.pdf",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-03-10T14:00:00Z",
  },
  {
    id: "f3",
    name: "Client Call - Mar 8.mp3",
    mime_type: "audio/mpeg",
    size_bytes: 14_300_000,
    folder: "/recordings",
    storage_path: "/recordings/client-call-mar-8.mp3",
    uploaded_by: "Sales Agent",
    uploaded_by_type: "agent",
    agent_id: "agent-sales",
    created_at: "2026-03-08T16:45:00Z",
  },
  {
    id: "f4",
    name: "Product Screenshot.png",
    mime_type: "image/png",
    size_bytes: 540_000,
    folder: "/assets",
    storage_path: "/assets/product-screenshot.png",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-03-07T09:15:00Z",
  },
  {
    id: "f5",
    name: "Demo Recording.mp4",
    mime_type: "video/mp4",
    size_bytes: 78_500_000,
    folder: "/recordings",
    storage_path: "/recordings/demo-recording.mp4",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-03-05T11:20:00Z",
  },
  {
    id: "f6",
    name: "Revenue Forecast.xlsx",
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 320_000,
    folder: "/proposals",
    storage_path: "/proposals/revenue-forecast.xlsx",
    uploaded_by: "CRM Agent",
    uploaded_by_type: "agent",
    agent_id: "agent-crm",
    created_at: "2026-03-04T08:00:00Z",
  },
  {
    id: "f7",
    name: "Team Photo.jpg",
    mime_type: "image/jpeg",
    size_bytes: 3_100_000,
    folder: "/assets",
    storage_path: "/assets/team-photo.jpg",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-03-02T13:30:00Z",
  },
  {
    id: "f8",
    name: "Meeting Notes.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size_bytes: 85_000,
    folder: "/",
    storage_path: "/meeting-notes.docx",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "f9",
    name: "api-spec.json",
    mime_type: "application/json",
    size_bytes: 12_400,
    folder: "/",
    storage_path: "/api-spec.json",
    uploaded_by: "Dev Agent",
    uploaded_by_type: "agent",
    agent_id: "agent-dev",
    created_at: "2026-02-28T17:00:00Z",
  },
  {
    id: "f10",
    name: "backup-feb.zip",
    mime_type: "application/zip",
    size_bytes: 45_000_000,
    folder: "/",
    storage_path: "/backup-feb.zip",
    uploaded_by: "Kunj D.",
    uploaded_by_type: "user",
    created_at: "2026-02-25T09:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DrivePage() {
  const {
    files,
    setFiles,
    currentFolder,
    setCurrentFolder,
    view,
    setView,
    searchQuery,
    setSearchQuery,
    selectedFileId,
    setSelectedFile,
    removeFile,
  } = useDriveStore();

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed mock data on first mount
  useEffect(() => {
    if (files.length === 0) {
      setFiles(MOCK_FILES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort
  const filteredFiles = useMemo(() => {
    let result = files;

    // Folder filter (root shows everything)
    if (currentFolder !== "/") {
      result = result.filter((f) => f.folder === currentFolder);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === "asc" ? cmp : -cmp;
      }
      // date
      const cmp =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, currentFolder, searchQuery, sortKey, sortDir]);

  const selectedFile = selectedFileId
    ? files.find((f) => f.id === selectedFileId) ?? null
    : null;

  // Toggle sort
  const toggleSort = () => {
    if (sortKey === "date") {
      setSortKey("name");
      setSortDir("asc");
    } else {
      setSortKey("date");
      setSortDir("desc");
    }
  };

  // Simulated upload — adds file to store with mock data
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);

    // Simulate a short upload delay then add to store
    const timer = setTimeout(() => {
      const newFile: DriveFile = {
        id: `f-${Date.now()}`,
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        folder: currentFolder === "/" ? "/" : currentFolder,
        storage_path: `${currentFolder}/${file.name}`,
        uploaded_by: "Kunj D.",
        uploaded_by_type: "user",
        created_at: new Date().toISOString(),
      };
      useDriveStore.getState().addFile(newFile);
      setUploadFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 800);

    return () => clearTimeout(timer);
  };

  // Count files per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { "/": files.length };
    for (const folder of FOLDERS) {
      if (folder !== "/") {
        counts[folder] = files.filter((f) => f.folder === folder).length;
      }
    }
    return counts;
  }, [files]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-sm">Drive</h2>

          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                view === "grid"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                view === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort toggle */}
          <button
            onClick={toggleSort}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={`Sorted by ${sortKey} (${sortDir})`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortKey}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-8 pr-3 py-1.5 w-48 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
            />
          </div>

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Upload indicator */}
      {uploadFileName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border text-sm">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium truncate">
            {uploadFileName}
          </span>
          <span className="text-muted-foreground text-xs animate-pulse">
            Uploading...
          </span>
          <button
            onClick={() => {
              setUploadFileName(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="ml-auto p-0.5 rounded hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - folder navigation */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-card/50 p-3 gap-1 overflow-y-auto scrollbar-thin">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 mb-1">
            Folders
          </span>
          {FOLDERS.map((folder) => (
            <button
              key={folder}
              onClick={() => setCurrentFolder(folder)}
              className={cn(
                "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors",
                currentFolder === folder
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {folder === "/" ? (
                  <Home className="w-4 h-4 shrink-0" />
                ) : (
                  <FolderOpen className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">{getFolderLabel(folder)}</span>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {folderCounts[folder] ?? 0}
              </span>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb (mobile-friendly) */}
          <div className="flex items-center gap-1 px-4 py-2.5 text-xs text-muted-foreground border-b border-border bg-card/30 shrink-0">
            <button
              onClick={() => setCurrentFolder("/")}
              className={cn(
                "hover:text-foreground transition-colors",
                currentFolder === "/" && "text-foreground font-medium"
              )}
            >
              Drive
            </button>
            {currentFolder !== "/" && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground font-medium">
                  {getFolderLabel(currentFolder)}
                </span>
              </>
            )}
            <span className="ml-auto text-muted-foreground/60 tabular-nums">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Mobile folder selector */}
          <div className="md:hidden flex items-center gap-1.5 px-4 py-2 border-b border-border overflow-x-auto scrollbar-thin shrink-0">
            {FOLDERS.map((folder) => (
              <button
                key={folder}
                onClick={() => setCurrentFolder(folder)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
                  currentFolder === folder
                    ? "bg-primary/10 text-foreground font-medium"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {getFolderLabel(folder)}
              </button>
            ))}
          </div>

          {/* File content area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {filteredFiles.length === 0 ? (
              <DriveEmptyState
                hasSearch={searchQuery.trim().length > 0}
                onUpload={() => fileInputRef.current?.click()}
              />
            ) : view === "grid" ? (
              <DriveGridView
                files={filteredFiles}
                selectedFileId={selectedFileId}
                onSelect={setSelectedFile}
              />
            ) : (
              <DriveListView
                files={filteredFiles}
                selectedFileId={selectedFileId}
                onSelect={setSelectedFile}
              />
            )}
          </div>
        </main>

        {/* Detail sidebar */}
        {selectedFile && (
          <DriveDetailPanel
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
            onDelete={() => {
              removeFile(selectedFile.id);
              setSelectedFile(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
