"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { motion, AnimatePresence } from "framer-motion";
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
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DrivePage() {
  const {
    files,
    currentFolder,
    setCurrentFolder,
    view,
    setView,
    searchQuery,
    setSearchQuery,
    selectedFileId,
    setSelectedFile,
    loading,
    fetchFiles,
    uploadFile,
    deleteFile,
    downloadFile,
  } = useDriveStore();

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files from API on mount and when folder/search changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, currentFolder, searchQuery]);

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

  // Upload file via API
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    try {
      await uploadFile(file);
    } finally {
      setUploadFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadFile]);

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
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "relative p-1.5 rounded-md transition-colors z-10",
                view === "grid"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground sq-tap"
              )}
              title="Grid view"
            >
              {view === "grid" && (
                <motion.div
                  layoutId="drive-view-toggle"
                  className="absolute inset-0 bg-card rounded-md shadow-sm z-[-1]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "relative p-1.5 rounded-md transition-colors z-10",
                view === "list"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground sq-tap"
              )}
              title="List view"
            >
              {view === "list" && (
                <motion.div
                  layoutId="drive-view-toggle"
                  className="absolute inset-0 bg-card rounded-md shadow-sm z-[-1]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort toggle */}
          <button
            onClick={toggleSort}
            className="sq-tap hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
            className="sq-tap sq-focus-ring sq-hover-breathe flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Upload indicator */}
      <AnimatePresence>
        {uploadFileName && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border/50 text-sm">
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
                className="sq-tap ml-auto p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                "relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors z-10 sq-tap",
                currentFolder === folder
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {currentFolder === folder && (
                <motion.div
                  layoutId="drive-folder-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-lg z-[-1]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
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
            onDelete={async () => {
              await deleteFile(selectedFile.id);
              setSelectedFile(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
