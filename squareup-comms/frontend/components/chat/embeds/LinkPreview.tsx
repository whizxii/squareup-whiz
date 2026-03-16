"use client";

import { cn } from "@/lib/utils";
import { ExternalLink, X } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";

interface LinkPreviewProps {
  url: string;
  className?: string;
}

/** Extract domain from URL for display */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/** Check if URL points to an image */
function isImageUrl(url: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const lower = url.toLowerCase().split("?")[0];
  return imageExts.some((ext) => lower.endsWith(ext));
}

/** Check if URL is a YouTube link */
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      return u.searchParams.get("v") || u.pathname.slice(1) || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Check if URL is a GitHub repo link */
function isGitHubRepo(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("github.com")) return false;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length === 2; // owner/repo
  } catch {
    return false;
  }
}

/**
 * Rich link preview embed (Discord-style).
 * Renders inline image, YouTube embed, or generic link card.
 */
export function LinkPreview({ url, className }: LinkPreviewProps) {
  const [dismissed, setDismissed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const domain = useMemo(() => extractDomain(url), [url]);
  const youtubeId = useMemo(() => getYouTubeId(url), [url]);
  const isImage = useMemo(() => isImageUrl(url), [url]);
  const isGitHub = useMemo(() => isGitHubRepo(url), [url]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  // YouTube embed
  if (youtubeId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mt-2 rounded-lg border border-border overflow-hidden bg-card group relative max-w-md",
          className
        )}
      >
        <DismissButton onDismiss={handleDismiss} />
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="w-full h-full"
          />
        </div>
        <div className="px-3 py-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium">YouTube</span>
          <span className="text-muted-foreground/40">·</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors truncate"
          >
            {url}
          </a>
        </div>
      </motion.div>
    );
  }

  // Inline image
  if (isImage && !imageError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mt-2 rounded-lg border border-border overflow-hidden bg-card group relative max-w-sm",
          className
        )}
      >
        <DismissButton onDismiss={handleDismiss} />
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Shared image"
            className="max-h-[300px] w-auto object-contain"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </a>
      </motion.div>
    );
  }

  // GitHub repo card
  if (isGitHub) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mt-2 rounded-lg border border-border bg-card group relative max-w-md",
          className
        )}
      >
        <DismissButton onDismiss={handleDismiss} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors"
        >
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
            <GitHubIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {new URL(url).pathname.slice(1)}
            </div>
            <div className="text-[11px] text-muted-foreground">github.com</div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
        </a>
      </motion.div>
    );
  }

  // Generic link card
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-2 rounded-lg border border-border bg-card group relative max-w-md",
        className
      )}
    >
      <DismissButton onDismiss={handleDismiss} />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors"
      >
        <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
          <ExternalLink className="w-4 h-4 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {domain}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {url}
          </div>
        </div>
      </a>
    </motion.div>
  );
}

/** Extract URLs from message content */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>)"']+/g;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

function DismissButton({ onDismiss }: { onDismiss: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onDismiss}
      className="absolute top-1.5 right-1.5 p-0.5 rounded bg-card/80 border border-border opacity-0 group-hover:opacity-100 hover:bg-accent transition-all z-10"
      aria-label="Dismiss preview"
    >
      <X className="w-3 h-3 text-muted-foreground" />
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-foreground/80">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
