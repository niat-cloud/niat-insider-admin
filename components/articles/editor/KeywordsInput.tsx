"use client";

import { useState } from "react";
import { X } from "lucide-react";

type KeywordsInputProps = {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
};

/** Keyword chips: Enter or comma adds, Backspace on an empty input removes the last one. Pasting a comma list adds them all. */
export function KeywordsInput({ id, value, onChange }: KeywordsInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const incoming = raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const seen = new Set(value.map((k) => k.toLowerCase()));
    const next = [...value];
    for (const k of incoming) {
      if (!seen.has(k.toLowerCase())) {
        seen.add(k.toLowerCase());
        next.push(k);
      }
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 focus-within:ring-2 focus-within:ring-[#991b1b]">
      {value.map((k) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-700/60 py-0.5 pl-2.5 pr-1 text-xs text-zinc-100">
          {k}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== k))}
            className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-600 hover:text-white"
            aria-label={`Remove keyword ${k}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) add(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? "Add keyword" : "Type a keyword and press Enter"}
        className="min-w-[8rem] flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
      />
    </div>
  );
}
