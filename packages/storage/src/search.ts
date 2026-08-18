import type { AnyElement } from "@nexus/types";

/**
 * Pulls the human-readable text out of an element regardless of its type,
 * for full-text search (StorageService.searchElements) and, later, for
 * result highlighting. Adding a new element type means adding one case here.
 */
export function extractSearchableText(element: AnyElement): { text: string; snippet: string } {
  let raw = "";
  switch (element.type) {
    case "note":
      raw = `${element.data.title} ${element.data.content}`;
      break;
    case "text":
      raw = element.data.content;
      break;
    case "task":
      raw = `${element.data.title} ${element.data.description ?? ""}`;
      break;
    case "checklist":
      raw = `${element.data.title} ${element.data.items.map((i) => i.label).join(" ")}`;
      break;
    case "list":
      raw = `${element.data.title} ${element.data.items.join(" ")}`;
      break;
    case "link":
      raw = `${element.data.title ?? ""} ${element.data.url}`;
      break;
    case "bookmark":
      raw = `${element.data.title} ${element.data.url} ${element.data.description ?? ""}`;
      break;
    case "code":
      raw = `${element.data.language} ${element.data.content}`;
      break;
    case "file":
      raw = element.data.fileName;
      break;
    case "pdf":
      raw = element.data.fileName;
      break;
    case "location":
      raw = element.data.address;
      break;
    case "image":
    case "video":
    case "audio":
      raw = element.data.assetId ?? "";
      break;
    default:
      raw = "";
  }
  const snippet = raw.trim().replace(/\s+/g, " ").slice(0, 90);
  return { text: raw.toLowerCase(), snippet };
}
