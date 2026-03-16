/**
 * File icon and color utilities for the Drive page.
 * Extracted to avoid duplication between grid/list views.
 */

import {
  Image,
  Music,
  Video,
  FileSpreadsheet,
  FileCode,
  Archive,
  FileText,
  File,
  type LucideIcon,
} from "lucide-react";

export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.includes("json") || mimeType.includes("xml") || mimeType.includes("html"))
    return FileCode;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip") || mimeType.includes("rar"))
    return Archive;
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return FileText;
  return File;
}

export function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "text-pink-500";
  if (mimeType.startsWith("audio/")) return "text-violet-500";
  if (mimeType.startsWith("video/")) return "text-red-500";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "text-green-500";
  if (mimeType.includes("json") || mimeType.includes("xml") || mimeType.includes("html"))
    return "text-cyan-500";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip"))
    return "text-amber-500";
  if (mimeType.includes("pdf")) return "text-red-400";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "text-blue-500";
  return "text-muted-foreground";
}

export function getFolderLabel(folder: string): string {
  if (folder === "/") return "All Files";
  return folder.slice(1).charAt(0).toUpperCase() + folder.slice(2);
}
