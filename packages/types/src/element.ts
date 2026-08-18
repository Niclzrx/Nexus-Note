import type { BaseEntity, ColorValue, Point, Size } from "./base";

export type ElementType =
  | "note"
  | "text"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "link"
  | "bookmark"
  | "checklist"
  | "list"
  | "task"
  | "code"
  | "file"
  | "location";

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Fields shared by every element on the canvas, regardless of type.
 * This is the "Node" base referenced in the spec — every concrete element
 * (Note, Image, Task, ...) extends this shape via `NexusElement<T>` below.
 */
export interface ElementBase extends BaseEntity {
  boardId: string;
  type: ElementType;
  position: Point;
  size: Size;
  rotation: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  groupId: string | null;
  tags: string[];
  color?: ColorValue;
}

export interface NoteData {
  title: string;
  content: string;
  priority?: TaskPriority;
}

export interface TextData {
  content: string;
  variant: "display" | "heading" | "body";
}

export interface ImageData {
  assetId: string;
  alt?: string;
  objectFit: "cover" | "contain";
}

export interface VideoData {
  assetId: string;
  posterAssetId?: string;
}

export interface AudioData {
  assetId: string;
}

export interface PdfData {
  assetId: string;
  fileName: string;
  pageCount?: number;
}

export interface LinkData {
  url: string;
  title?: string;
  faviconUrl?: string;
}

export interface BookmarkData {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  domain: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}
export interface ChecklistData {
  title: string;
  items: ChecklistItem[];
}

export interface ListData {
  title: string;
  items: string[];
  ordered: boolean;
}

export interface TaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: number;
}

export interface CodeData {
  language: string;
  content: string;
}

export interface FileData {
  assetId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

/** Maps each ElementType to its type-specific data payload. */
export interface ElementDataMap {
  note: NoteData;
  text: TextData;
  image: ImageData;
  video: VideoData;
  audio: AudioData;
  pdf: PdfData;
  link: LinkData;
  bookmark: BookmarkData;
  checklist: ChecklistData;
  list: ListData;
  task: TaskData;
  code: CodeData;
  file: FileData;
  location: LocationData;
}

/** A concrete, fully-typed canvas element for a given ElementType `T`. */
export type NexusElement<T extends ElementType = ElementType> = ElementBase & {
  type: T;
  data: ElementDataMap[T];
};

export type AnyElement = { [K in ElementType]: NexusElement<K> }[ElementType];

/** Default world-space size (px) used when a new element of this type is created. */
export const DEFAULT_ELEMENT_SIZE: Record<ElementType, { width: number; height: number }> = {
  note: { width: 240, height: 160 },
  text: { width: 220, height: 80 },
  image: { width: 280, height: 200 },
  video: { width: 320, height: 200 },
  audio: { width: 280, height: 90 },
  pdf: { width: 220, height: 260 },
  link: { width: 260, height: 92 },
  bookmark: { width: 260, height: 140 },
  checklist: { width: 240, height: 190 },
  list: { width: 220, height: 170 },
  task: { width: 240, height: 120 },
  code: { width: 340, height: 220 },
  file: { width: 220, height: 90 },
  location: { width: 240, height: 140 },
};

/** Factory for the default `data` payload of a freshly created element of type `T`. */
export function createDefaultElementData<T extends ElementType>(type: T): ElementDataMap[T] {
  const factories: { [K in ElementType]: () => ElementDataMap[K] } = {
    note: () => ({ title: "Nova nota", content: "" }),
    text: () => ({ content: "Texto", variant: "body" }),
    image: () => ({ assetId: "", objectFit: "cover" }),
    video: () => ({ assetId: "" }),
    audio: () => ({ assetId: "" }),
    pdf: () => ({ assetId: "", fileName: "documento.pdf" }),
    link: () => ({ url: "", title: "Novo link" }),
    bookmark: () => ({ url: "", title: "Novo bookmark", domain: "" }),
    checklist: () => ({ title: "Checklist", items: [] }),
    list: () => ({ title: "Lista", items: [], ordered: false }),
    task: () => ({ title: "Nova tarefa", status: "todo", priority: "medium" }),
    code: () => ({ language: "javascript", content: "" }),
    file: () => ({ assetId: "", fileName: "arquivo", fileType: "", fileSize: 0 }),
    location: () => ({ address: "", lat: 0, lng: 0 }),
  };
  return factories[type]();
}
