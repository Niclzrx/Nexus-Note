"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { Highlight, themes } from "prism-react-renderer";

const draculaTheme = themes.dracula;

const LANGUAGES = [
  "abap",
  "abnf",
  "actionscript",
  "ada",
  "agda",
  "al",
  "antlr4",
  "apacheconf",
  "apex",
  "apl",
  "applescript",
  "aql",
  "arduino",
  "arff",
  "asciidoc",
  "asm6502",
  "aspnet",
  "autohotkey",
  "autoit",
  "bash",
  "basic",
  "batch",
  "bbcode",
  "birb",
  "bison",
  "bnf",
  "brainfuck",
  "brightscript",
  "bro",
  "c",
  "csharp",
  "cpp",
  "cfscript",
  "chaiscript",
  "cil",
  "clojure",
  "cmake",
  "coffeescript",
  "concurnas",
  "coq",
  "css",
  "css-extras",
  "csv",
  "cypher",
  "d",
  "dart",
  "dataweave",
  "dax",
  "django",
  "docker",
  "dot",
  "ebnf",
  "eiffel",
  "ejs",
  "elixir",
  "elm",
  "erb",
  "erlang",
  "etlua",
  "excel-formula",
  "fsharp",
  "factor",
  "false",
  "firestore-security-rules",
  "flow",
  "fortran",
  "ftl",
  "gcode",
  "gdscript",
  "gedcom",
  "gherkin",
  "glsl",
  "gn",
  "go-module",
  "graphql",
  "groovy",
  "haml",
  "handlebars",
  "haskell",
  "hcl",
  "hlsl",
  "hpkp",
  "hsts",
  "http",
  "ichigojam",
  "icon",
  "iecst",
  "inform7",
  "ini",
  "io",
  "j",
  "java",
  "javadoc",
  "javadoclike",
  "javascript",
  "javastacktrace",
  "jexl",
  "jolie",
  "jq",
  "jsdoc",
  "js-extras",
  "js-templates",
  "json",
  "jsonp",
  "jsstacktrace",
  "jsx",
  "julia",
  "keyman",
  "kotlin",
  "kumir",
  "latex",
  "latte",
  "less",
  "lilypond",
  "liquid",
  "lisp",
  "livescript",
  "llvm",
  "log",
  "lolcode",
  "lua",
  "makefile",
  "markdown",
  "markup",
  "matlab",
  "mel",
  "mizar",
  "mongodb",
  "monkey",
  "moonscript",
  "n1ql",
  "n4js",
  "nand2tetris-hdl",
  "naniscript",
  "nasm",
  "neon",
  "nim",
  "nix",
  "nsis",
  "objectivec",
  "ocaml",
  "opencl",
  "oz",
  "parigp",
  "parser",
  "pascal",
  "pascaligo",
  "pcaxis",
  "perl",
  "php",
  "php-extras",
  "phpdoc",
  "plant-uml",
  "plsql",
  "powershell",
  "processing",
  "prolog",
  "properties",
  "protobuf",
  "pug",
  "puppet",
  "pure",
  "python",
  "q",
  "qore",
  "qml",
  "r",
  "reasonml",
  "regex",
  "rego",
  "renpy",
  "rest",
  "rip",
  "roboconf",
  "robotframework",
  "ruby",
  "rust",
  "sas",
  "sass",
  "scala",
  "scheme",
  "scss",
  "shell-session",
  "smali",
  "smalltalk",
  "smarty",
  "sml",
  "solidity",
  "sol",
  "sparql",
  "sqf",
  "sql",
  "stan",
  "stylus",
  "swift",
  "systemd",
  "t4-cs",
  "t4-templating",
  "t4-vb",
  "tap",
  "tcl",
  "toml",
  "tsx",
  "tt2",
  "turtle",
  "twig",
  "typescript",
  "v",
  "vala",
  "vbnet",
  "velocity",
  "verilog",
  "vhdl",
  "vim",
  "visual-basic",
  "warpscript",
  "wasm",
  "web-idl",
  "wiki",
  "wolfram",
  "wren",
  "xeora",
  "xml-doc",
  "xojo",
  "xquery",
  "yaml",
  "yang",
  "zig",
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const normalizedLang: Language = LANGUAGES.includes(
    language.toLowerCase().trim() as Language
  )
    ? (language.toLowerCase().trim() as Language)
    : "javascript";

  const filtered = useMemo(() => {
    if (!query) return LANGUAGES;
    const q = query.toLowerCase();
    return LANGUAGES.filter((l) => l.includes(q));
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          content.substring(0, start) + "  " + content.substring(end);
        onContentChange(newValue);
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

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [open]);

  const selectLanguage = useCallback(
    (lang: string) => {
      onLanguageChange(lang);
      setOpen(false);
      setQuery("");
    },
    [onLanguageChange],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      } else if (e.key === "Enter") {
        if (filtered.length > 0) {
          selectLanguage(filtered[0]);
        }
      }
    },
    [filtered, selectLanguage],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={open ? query : normalizedLang}
          readOnly={!open}
          placeholder="Search language..."
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={handleInputKeyDown}
          onClick={() => {
            if (!open) {
              setOpen(true);
              setQuery("");
            }
          }}
          className="mb-1 w-28 rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-faint outline-none ring-1 ring-border hover:ring-border-strong"
        />
        {open && (
          <div className="absolute left-0 top-full z-50 mt-0.5 max-h-60 w-40 overflow-y-auto rounded-md border border-border bg-surface-elevated shadow-lg">
            {filtered.length === 0 && (
              <div className="px-2 py-1 text-[10px] text-text-faint">
                No match
              </div>
            )}
            {filtered.map((lang) => (
              <button
                key={lang}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectLanguage(lang);
                }}
                className={`block w-full px-2 py-0.5 text-left font-mono text-[10px] uppercase tracking-wide hover:bg-border/40 ${
                  lang === normalizedLang
                    ? "bg-border/30 text-text"
                    : "text-text-faint"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-[#282a36]">
        <Highlight
          theme={draculaTheme}
          code={content || " "}
          language={normalizedLang}
        >
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
