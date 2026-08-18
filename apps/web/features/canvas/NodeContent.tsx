"use client";

import * as React from "react";
import type {
  AnyElement,
  ChecklistItem,
  NexusElement,
  TaskPriority,
  TaskStatus,
} from "@nexus/types";
import { createId } from "@nexus/storage";
import { Download, FileText, MapPin, Plus, X } from "lucide-react";
import { useAssetUrl } from "../../hooks/use-asset-url";
import { formatBytes } from "../../lib/format";

interface NodeContentProps {
  element: AnyElement;
  onChange: (patch: Record<string, unknown>) => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

const inputClass =
  "w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint";
const labelClass = "font-display text-sm font-semibold text-text";

export function NodeContent({ element, onChange }: NodeContentProps) {
  switch (element.type) {
    case "note":
      return (
        <div className="flex h-full flex-col gap-1 p-2.5">
          <input
            value={element.data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onPointerDown={stop}
            className={labelClass + " bg-transparent outline-none"}
            placeholder="Título"
          />
          <textarea
            value={element.data.content}
            onChange={(e) => onChange({ content: e.target.value })}
            onPointerDown={stop}
            className="nx-scroll h-full w-full resize-none bg-transparent text-xs leading-relaxed text-text-muted outline-none placeholder:text-text-faint"
            placeholder="Escreva algo…"
          />
        </div>
      );

    case "text":
      return (
        <div className="flex h-full items-center p-2.5">
          <textarea
            value={element.data.content}
            onChange={(e) => onChange({ content: e.target.value })}
            onPointerDown={stop}
            className="nx-scroll h-full w-full resize-none bg-transparent font-display text-base font-medium text-text outline-none placeholder:text-text-faint"
            placeholder="Texto…"
          />
        </div>
      );

    case "task": {
      const statuses: TaskStatus[] = ["todo", "in-progress", "done"];
      const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
      return (
        <div className="flex h-full flex-col gap-2 p-2.5">
          <input
            value={element.data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onPointerDown={stop}
            className={labelClass + " bg-transparent outline-none"}
            placeholder="Título da tarefa"
          />
          <div className="flex gap-1.5" onPointerDown={stop}>
            <select
              value={element.data.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 text-[11px] text-text-muted outline-none"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {{ todo: "A fazer", "in-progress": "Em progresso", done: "Concluído" }[s]}
                </option>
              ))}
            </select>
            <select
              value={element.data.priority}
              onChange={(e) => onChange({ priority: e.target.value })}
              className="rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 text-[11px] text-text-muted outline-none"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {{ low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" }[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    case "checklist": {
      const items = element.data.items;
      const setItems = (next: ChecklistItem[]) => onChange({ items: next });
      return (
        <div className="flex h-full flex-col gap-1.5 p-2.5">
          <input
            value={element.data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onPointerDown={stop}
            className={labelClass + " bg-transparent outline-none"}
            placeholder="Checklist"
          />
          <div className="nx-scroll flex-1 space-y-1 overflow-y-auto" onPointerDown={stop}>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) =>
                    setItems(items.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))
                  }
                  className="h-3.5 w-3.5 accent-signal"
                />
                <input
                  value={item.label}
                  onChange={(e) =>
                    setItems(items.map((i) => (i.id === item.id ? { ...i, label: e.target.value } : i)))
                  }
                  className={`flex-1 bg-transparent text-xs outline-none ${item.done ? "text-text-faint line-through" : "text-text-muted"}`}
                  placeholder="Item"
                />
                <button
                  type="button"
                  onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                  className="text-text-faint hover:text-error"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => setItems([...items, { id: createId("item"), label: "", done: false }])}
            className="flex items-center gap-1 text-[11px] text-text-faint hover:text-signal"
          >
            <Plus className="h-3 w-3" /> Adicionar item
          </button>
        </div>
      );
    }

    case "list": {
      const items = element.data.items;
      const setItems = (next: string[]) => onChange({ items: next });
      return (
        <div className="flex h-full flex-col gap-1.5 p-2.5">
          <input
            value={element.data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onPointerDown={stop}
            className={labelClass + " bg-transparent outline-none"}
            placeholder="Lista"
          />
          <div className="nx-scroll flex-1 space-y-1 overflow-y-auto" onPointerDown={stop}>
            {items.map((value, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-faint">{element.data.ordered ? `${i + 1}.` : "•"}</span>
                <input
                  value={value}
                  onChange={(e) => setItems(items.map((v, idx) => (idx === i ? e.target.value : v)))}
                  className="flex-1 bg-transparent text-xs text-text-muted outline-none"
                  placeholder="Item"
                />
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  className="text-text-faint hover:text-error"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => setItems([...items, ""])}
            className="flex items-center gap-1 text-[11px] text-text-faint hover:text-signal"
          >
            <Plus className="h-3 w-3" /> Adicionar item
          </button>
        </div>
      );
    }

    case "link":
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-2.5" onPointerDown={stop}>
          <input
            value={element.data.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            className={labelClass + " bg-transparent outline-none"}
            placeholder="Título do link"
          />
          <input
            value={element.data.url}
            onChange={(e) => onChange({ url: e.target.value })}
            className={inputClass + " text-xs text-signal"}
            placeholder="https://…"
          />
        </div>
      );

    case "bookmark":
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-2.5" onPointerDown={stop}>
          <input
            value={element.data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={labelClass + " bg-transparent outline-none"}
            placeholder="Título"
          />
          <input
            value={element.data.url}
            onChange={(e) => {
              const url = e.target.value;
              let domain = element.data.domain;
              try {
                domain = new URL(url).hostname;
              } catch {
                /* keep previous domain while typing an incomplete URL */
              }
              onChange({ url, domain });
            }}
            className={inputClass + " text-xs text-signal"}
            placeholder="https://…"
          />
          {element.data.domain ? (
            <span className="text-[11px] text-text-faint">{element.data.domain}</span>
          ) : null}
        </div>
      );

    case "code":
      return (
        <div className="flex h-full flex-col p-2.5">
          <input
            value={element.data.language}
            onChange={(e) => onChange({ language: e.target.value })}
            onPointerDown={stop}
            className="mb-1 w-24 bg-transparent font-mono text-[11px] uppercase tracking-wide text-text-faint outline-none"
            placeholder="linguagem"
          />
          <textarea
            value={element.data.content}
            onChange={(e) => onChange({ content: e.target.value })}
            onPointerDown={stop}
            spellCheck={false}
            className="nx-scroll h-full w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-text outline-none placeholder:text-text-faint"
            placeholder="// código"
          />
        </div>
      );

    case "image":
      return <ImageContent element={element} />;

    case "video":
      return <VideoContent element={element} />;

    case "audio":
      return <AudioContent element={element} />;

    case "pdf":
      return <PdfContent element={element} />;

    case "file":
      return <FileContent element={element} />

    case "location":
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-2.5" onPointerDown={stop}>
          <span className="flex items-center gap-1.5 text-xs text-text-faint">
            <MapPin className="h-3.5 w-3.5" /> Local
          </span>
          <input
            value={element.data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className={inputClass + " text-sm"}
            placeholder="Endereço"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={element.data.lat || ""}
              onChange={(e) => onChange({ lat: Number(e.target.value) })}
              className="w-1/2 rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-muted outline-none"
              placeholder="lat"
              step="any"
            />
            <input
              type="number"
              value={element.data.lng || ""}
              onChange={(e) => onChange({ lng: Number(e.target.value) })}
              className="w-1/2 rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-muted outline-none"
              placeholder="lng"
              step="any"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-text-faint">
          Tipo de elemento não suportado
        </div>
      );
  }
}

function MediaError() {
  return <span className="px-2 text-center text-[11px] text-text-faint">Não foi possível carregar o arquivo</span>;
}

function ImageContent({ element }: { element: NexusElement<"image"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId);
  return (
    <div className="h-full w-full overflow-hidden rounded-b-lg bg-canvas-bg">
      {loading ? (
        <div className="flex h-full items-center justify-center text-xs text-text-faint">Carregando…</div>
      ) : error || !url ? (
        <MediaError />
      ) : (
        <img
          src={url}
          alt={element.data.alt ?? ""}
          className="h-full w-full"
          style={{ objectFit: element.data.objectFit }}
          draggable={false}
        />
      )}
    </div>
  );
}

function VideoContent({ element }: { element: NexusElement<"video"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId);
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-b-lg bg-black"
      onPointerDown={stop}
    >
      {loading ? (
        <span className="text-xs text-text-faint">Carregando…</span>
      ) : error || !url ? (
        <MediaError />
      ) : (
        <video src={url} controls className="h-full w-full" />
      )}
    </div>
  );
}

function AudioContent({ element }: { element: NexusElement<"audio"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId);
  return (
    <div className="flex h-full w-full items-center justify-center p-3" onPointerDown={stop}>
      {loading ? (
        <span className="text-xs text-text-faint">Carregando…</span>
      ) : error || !url ? (
        <MediaError />
      ) : (
        <audio src={url} controls className="w-full" />
      )}
    </div>
  );
}

function PdfContent({ element }: { element: NexusElement<"pdf"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId);
  return (
    <FileCard
      icon={FileText}
      fileName={element.data.fileName}
      subtitle={element.data.pageCount ? `${element.data.pageCount} páginas` : "PDF"}
      url={url}
      loading={loading}
      error={error}
    />
  );
}

function FileContent({ element }: { element: NexusElement<"file"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId);
  return (
    <FileCard
      icon={FileText}
      fileName={element.data.fileName}
      subtitle={formatBytes(element.data.fileSize)}
      url={url}
      loading={loading}
      error={error}
    />
  );
}

function FileCard({
  icon: Icon,
  fileName,
  subtitle,
  url,
  loading,
  error,
}: {
  icon: typeof FileText;
  fileName: string;
  subtitle: string;
  url: string | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center" onPointerDown={stop}>
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-elevated text-text-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text">{fileName}</p>
        <p className="text-[10px] text-text-faint">{subtitle}</p>
      </div>
      {url && !loading && !error ? (
        <a
          href={url}
          download={fileName}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] text-signal hover:underline"
        >
          <Download className="h-3 w-3" /> Abrir
        </a>
      ) : loading ? (
        <span className="text-[10px] text-text-faint">Carregando…</span>
      ) : (
        <span className="text-[10px] text-text-faint">Indisponível</span>
      )}
    </div>
  );
}
