import type { AssetKind, ElementType } from "@nexus/types";

export const MAX_ASSET_BYTES = 50 * 1024 * 1024; // 50MB — generous for a local-only app

const ACCEPTED_PREFIXES: { prefix: string; kind: AssetKind; elementType: Extract<ElementType, "image" | "video" | "audio"> }[] = [
  { prefix: "image/", kind: "image", elementType: "image" },
  { prefix: "video/", kind: "video", elementType: "video" },
  { prefix: "audio/", kind: "audio", elementType: "audio" },
];

export interface FileClassification {
  elementType: Extract<ElementType, "image" | "video" | "audio" | "pdf" | "file">;
  assetKind: AssetKind;
}

/**
 * Classifies an uploaded/dropped File by MIME type. Falls back to the
 * generic "file" element for anything not explicitly recognized — the app
 * never rejects a file outright, it just can't preview it richly (§24).
 */
export function classifyFile(file: File): FileClassification {
  if (file.type === "application/pdf") return { elementType: "pdf", assetKind: "pdf" };
  const match = ACCEPTED_PREFIXES.find((p) => file.type.startsWith(p.prefix));
  if (match) return { elementType: match.elementType, assetKind: match.kind };
  return { elementType: "file", assetKind: "file" };
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_ASSET_BYTES) {
    return `"${file.name}" excede o limite de ${MAX_ASSET_BYTES / (1024 * 1024)}MB.`;
  }
  return null;
}

/** Reads natural width/height for an image file, without blocking on failure. */
export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
