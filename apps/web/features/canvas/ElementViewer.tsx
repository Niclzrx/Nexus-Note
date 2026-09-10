"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, ExternalLink, MapPin, CheckSquare, ListChecks, List, Link as LinkIcon, Bookmark, Code2, FileText } from "lucide-react";
import type { AnyElement, NexusElement } from "@nexus/types";
import { useAssetUrl } from "../../hooks/use-asset-url";
import { formatBytes } from "../../lib/format";
import { CodeEditor } from "./CodeEditor";

interface ElementViewerProps {
  element: AnyElement | null;
  open: boolean;
  onClose: () => void;
}

export function ElementViewer({ element, open, onClose }: ElementViewerProps) {
  return (
    <AnimatePresence>
      {open && element ? (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-xl bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-display text-sm font-medium text-text">
                {getElementTitle(element)}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-md p-1 text-text-faint transition-colors hover:bg-surface-elevated hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <ElementFullscreenContent element={element} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function getElementTitle(element: AnyElement): string {
  switch (element.type) {
    case "note":
      return (element as NexusElement<"note">).data.title || "Nota";
    case "text":
      return "Texto";
    case "task":
      return (element as NexusElement<"task">).data.title || "Tarefa";
    case "checklist":
      return (element as NexusElement<"checklist">).data.title || "Checklist";
    case "list":
      return (element as NexusElement<"list">).data.title || "Lista";
    case "code":
      return `Código — ${(element as NexusElement<"code">).data.language || "..."}`;
    case "link":
      return (element as NexusElement<"link">).data.title || "Link";
    case "bookmark":
      return (element as NexusElement<"bookmark">).data.title || "Bookmark";
    case "image":
      return "Imagem";
    case "video":
      return "Vídeo";
    case "audio":
      return "Áudio";
    case "pdf":
      return (element as NexusElement<"pdf">).data.fileName || "PDF";
    case "file":
      return (element as NexusElement<"file">).data.fileName || "Arquivo";
    case "location":
      return (element as NexusElement<"location">).data.address || "Local";
    default:
      return "Elemento";
  }
}

function ElementFullscreenContent({ element }: { element: AnyElement }) {
  switch (element.type) {
    case "image":
      return <FullscreenImage element={element as NexusElement<"image">} />;
    case "video":
      return <FullscreenVideo element={element as NexusElement<"video">} />;
    case "audio":
      return <FullscreenAudio element={element as NexusElement<"audio">} />;
    case "pdf":
      return <FullscreenPdf element={element as NexusElement<"pdf">} />;
    case "file":
      return <FullscreenFile element={element as NexusElement<"file">} />;
    case "code":
      return <FullscreenCode element={element as NexusElement<"code">} />;
    case "text":
      return <FullscreenText element={element as NexusElement<"text">} />;
    case "note":
      return <FullscreenNote element={element as NexusElement<"note">} />;
    case "task":
      return <FullscreenTask element={element as NexusElement<"task">} />;
    case "checklist":
      return <FullscreenChecklist element={element as NexusElement<"checklist">} />;
    case "list":
      return <FullscreenList element={element as NexusElement<"list">} />;
    case "link":
      return <FullscreenLink element={element as NexusElement<"link">} />;
    case "bookmark":
      return <FullscreenBookmark element={element as NexusElement<"bookmark">} />;
    case "location":
      return <FullscreenLocation element={element as NexusElement<"location">} />;
    default:
      return (
        <div className="flex h-64 items-center justify-center text-sm text-text-faint">
          Tipo de elemento não suportado em tela cheia
        </div>
      );
  }
}

function FullscreenImage({ element }: { element: NexusElement<"image"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId, element.data.publicUrl);
  return (
    <div className="flex items-center justify-center bg-black p-4" style={{ minHeight: "60vh" }}>
      {loading ? (
        <span className="text-sm text-text-faint">Carregando…</span>
      ) : error || !url ? (
        <span className="text-sm text-text-faint">Não foi possível carregar a imagem</span>
      ) : (
        <img
          src={url}
          alt={element.data.alt ?? ""}
          className="max-h-[80vh] max-w-full object-contain"
          draggable={false}
        />
      )}
    </div>
  );
}

function FullscreenVideo({ element }: { element: NexusElement<"video"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId, element.data.publicUrl);
  return (
    <div className="flex items-center justify-center bg-black p-4" style={{ minHeight: "60vh" }}>
      {loading ? (
        <span className="text-sm text-text-faint">Carregando…</span>
      ) : error || !url ? (
        <span className="text-sm text-text-faint">Não foi possível carregar o vídeo</span>
      ) : (
        <video src={url} controls className="max-h-[80vh] max-w-full" />
      )}
    </div>
  );
}

function FullscreenAudio({ element }: { element: NexusElement<"audio"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId, element.data.publicUrl);
  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-surface p-8" style={{ minHeight: "40vh" }}>
      {loading ? (
        <span className="text-sm text-text-faint">Carregando…</span>
      ) : error || !url ? (
        <span className="text-sm text-text-faint">Não foi possível carregar o áudio</span>
      ) : (
        <>
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-signal/10">
            <span className="text-3xl text-signal">♪</span>
          </div>
          <audio src={url} controls className="w-full max-w-md" />
        </>
      )}
    </div>
  );
}

function FullscreenPdf({ element }: { element: NexusElement<"pdf"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId, element.data.publicUrl);
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-surface p-8" style={{ minHeight: "40vh" }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-error/10">
        <FileText className="h-10 w-10 text-error" />
      </div>
      <p className="text-sm font-medium text-text">{element.data.fileName}</p>
      {element.data.pageCount && (
        <p className="text-xs text-text-faint">{element.data.pageCount} páginas</p>
      )}
      {loading ? (
        <span className="text-xs text-text-faint">Carregando…</span>
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-signal/90"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Abrir PDF
        </a>
      ) : (
        <span className="text-xs text-text-faint">Indisponível</span>
      )}
    </div>
  );
}

function FullscreenFile({ element }: { element: NexusElement<"file"> }) {
  const { url, loading, error } = useAssetUrl(element.data.assetId, element.data.publicUrl);
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-surface p-8" style={{ minHeight: "40vh" }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-elevated">
        <FileText className="h-10 w-10 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text">{element.data.fileName}</p>
      <p className="text-xs text-text-faint">{formatBytes(element.data.fileSize)}</p>
      {loading ? (
        <span className="text-xs text-text-faint">Carregando…</span>
      ) : url ? (
        <a
          href={url}
          download={element.data.fileName}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-signal/90"
        >
          <Download className="h-3.5 w-3.5" /> Baixar
        </a>
      ) : (
        <span className="text-xs text-text-faint">Indisponível</span>
      )}
    </div>
  );
}

function FullscreenCode({ element }: { element: NexusElement<"code"> }) {
  const [lang, setLang] = useState(element.data.language);
  const [code, setCode] = useState(element.data.content);

  const handleChange = (patch: { language?: string; content?: string }) => {
    if (patch.language !== undefined) setLang(patch.language);
    if (patch.content !== undefined) setCode(patch.content);
  };

  return (
    <div className="h-[60vh] w-[80vw] max-w-4xl p-4">
      <CodeEditor
        language={lang}
        content={code}
        onLanguageChange={(l) => handleChange({ language: l })}
        onContentChange={(c) => handleChange({ content: c })}
      />
    </div>
  );
}

function FullscreenText({ element }: { element: NexusElement<"text"> }) {
  return (
    <div className="p-8" style={{ minWidth: "50vw", minHeight: "40vh" }}>
      <p className="whitespace-pre-wrap font-display text-lg leading-relaxed text-text">
        {element.data.content || <span className="text-text-faint">Texto vazio</span>}
      </p>
    </div>
  );
}

function FullscreenNote({ element }: { element: NexusElement<"note"> }) {
  return (
    <div className="p-8" style={{ minWidth: "50vw", minHeight: "40vh" }}>
      {element.data.title && (
        <h2 className="mb-4 font-display text-xl font-bold text-text">
          {element.data.title}
        </h2>
      )}
      <p className="whitespace-pre-wrap text-base leading-relaxed text-text">
        {element.data.content || <span className="text-text-faint">Nota vazia</span>}
      </p>
    </div>
  );
}

function FullscreenTask({ element }: { element: NexusElement<"task"> }) {
  const priorityColors = {
    low: "bg-success/15 text-success",
    medium: "bg-signal/15 text-signal",
    high: "bg-ember/15 text-ember",
    urgent: "bg-error/15 text-error",
  };
  const statusLabels: Record<string, string> = { todo: "A fazer", "in-progress": "Em andamento", done: "Concluído" };
  return (
    <div className="p-8" style={{ minWidth: "50vw", minHeight: "40vh" }}>
      <div className="flex items-start gap-4">
        <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          element.data.status === "done" ? "border-success bg-success" : "border-border"
        }`}>
          {element.data.status === "done" && <CheckSquare className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1">
          <h2 className={`font-display text-xl font-bold ${
            element.data.status === "done" ? "text-text-faint line-through" : "text-text"
          }`}>
            {element.data.title || "Tarefa sem título"}
          </h2>
          {element.data.description && (
            <p className="mt-2 text-sm text-text-muted">{element.data.description}</p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-text-muted">
              {statusLabels[element.data.status]}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs ${priorityColors[element.data.priority]}`}>
              {element.data.priority}
            </span>
            {element.data.dueDate && (
              <span className="text-xs text-text-faint">
                {new Date(element.data.dueDate).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullscreenChecklist({ element }: { element: NexusElement<"checklist"> }) {
  return (
    <div className="p-8" style={{ minWidth: "50vw", minHeight: "40vh" }}>
      {element.data.title && (
        <h2 className="mb-4 font-display text-xl font-bold text-text">
          {element.data.title}
        </h2>
      )}
      <ul className="space-y-2">
        {element.data.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <div className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
              item.done ? "border-success bg-success" : "border-border"
            }`}>
              {item.done && <CheckSquare className="h-3 w-3 text-white" />}
            </div>
            <span className={`text-sm ${item.done ? "text-text-faint line-through" : "text-text"}`}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FullscreenList({ element }: { element: NexusElement<"list"> }) {
  return (
    <div className="p-8" style={{ minWidth: "50vw", minHeight: "40vh" }}>
      {element.data.title && (
        <h2 className="mb-4 font-display text-xl font-bold text-text">
          {element.data.title}
        </h2>
      )}
      <ul className="space-y-1.5">
        {element.data.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-text">
            <span className="mt-0.5 text-xs text-text-faint">{i + 1}.</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FullscreenLink({ element }: { element: NexusElement<"link"> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-surface p-8" style={{ minHeight: "40vh" }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-signal/10">
        <LinkIcon className="h-8 w-8 text-signal" />
      </div>
      <h2 className="font-display text-lg font-bold text-text">
        {element.data.title || element.data.url}
      </h2>
      <a
        href={element.data.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm text-signal hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Abrir link
      </a>
    </div>
  );
}

function FullscreenBookmark({ element }: { element: NexusElement<"bookmark"> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-surface p-8" style={{ minHeight: "40vh" }}>
      {element.data.imageUrl && (
        <img
          src={element.data.imageUrl}
          alt=""
          className="h-40 w-full max-w-md rounded-lg object-cover"
        />
      )}
      <div className="text-center">
        <h2 className="font-display text-lg font-bold text-text">{element.data.title}</h2>
        {element.data.description && (
          <p className="mt-1 max-w-md text-sm text-text-muted">{element.data.description}</p>
        )}
        <p className="mt-1 text-xs text-text-faint">{element.data.domain}</p>
      </div>
      <a
        href={element.data.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm text-signal hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Abrir site
      </a>
    </div>
  );
}

function FullscreenLocation({ element }: { element: NexusElement<"location"> }) {
  const mapsUrl = element.data.lat && element.data.lng
    ? `https://www.google.com/maps?q=${element.data.lat},${element.data.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(element.data.address)}`;
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-surface p-8" style={{ minHeight: "40vh" }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-signal/10">
        <MapPin className="h-8 w-8 text-signal" />
      </div>
      <h2 className="font-display text-lg font-bold text-text">
        {element.data.address || "Sem endereço"}
      </h2>
      {element.data.lat && element.data.lng && (
        <p className="text-xs text-text-faint">
          {element.data.lat.toFixed(6)}, {element.data.lng.toFixed(6)}
        </p>
      )}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-signal/90"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Abrir no Google Maps
      </a>
    </div>
  );
}
