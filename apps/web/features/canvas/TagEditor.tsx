"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";

export function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  }

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-text-faint">
        <Tag className="h-3 w-3" /> Tags
      </span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-signal/15 px-2 py-0.5 text-[11px] text-signal"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remover tag ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder="+ tag"
          className="w-16 bg-transparent text-[11px] text-text outline-none placeholder:text-text-faint"
        />
      </div>
    </div>
  );
}
