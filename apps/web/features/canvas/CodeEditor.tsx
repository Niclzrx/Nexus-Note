"use client";

import { useRef, useCallback } from "react";
import { Highlight, themes } from "prism-react-renderer";

const draculaTheme = themes.dracula;

const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "html",
  "css",
  "json",
  "bash",
  "sql",
  "markdown",
  "jsx",
  "tsx",
  "c",
  "cpp",
  "java",
  "ruby",
  "php",
  "swift",
  "kotlin",
] as const;

type Language = (typeof LANGUAGES)[number];

interface CodeEditorProps {
  language: string;
  content: string;
  onLanguageChange: (language: string) => void;
  onContentChange: (content: string) => void;
}

export function CodeEditor({
  language,
  content,
  onLanguageChange,
  onContentChange,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces instead of moving focus
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = content.substring(0, start) + "  " + content.substring(end);
        onContentChange(newValue);
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [content, onContentChange],
  );

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const pre = preRef.current;
    if (textarea && pre) {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  // Normalize language for Prism — fallback to "javascript" if not in list
  const normalizedLang: Language = LANGUAGES.includes(language.toLowerCase().trim() as Language)
    ? (language.toLowerCase().trim() as Language)
    : "javascript";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center gap-1">
        <select
          value={normalizedLang}
          onChange={(e) => onLanguageChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-faint outline-none ring-1 ring-border hover:ring-border-strong"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-md bg-[#282a36]">
        <Highlight theme={draculaTheme} code={content || " "} language={normalizedLang}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre
              ref={preRef}
              className="nx-scroll absolute inset-0 m-0 overflow-auto p-2.5 font-mono text-xs leading-relaxed"
              style={{ background: "transparent" }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          onScroll={handleScroll}
          spellCheck={false}
          className="nx-scroll absolute inset-0 resize-none bg-transparent p-2.5 font-mono text-xs leading-relaxed text-transparent caret-white outline-none"
          style={{ caretColor: "white" }}
          placeholder="// código"
        />
      </div>
    </div>
  );
}
