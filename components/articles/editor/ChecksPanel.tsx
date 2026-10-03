import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ArticleCheck } from "@/lib/articleChecks";
import type { BodyStats } from "@/lib/articleBody";

type ChecksPanelProps = {
  checks: ArticleCheck[];
  stats: BodyStats;
};

const ORDER = { error: 0, warn: 1, ok: 2 } as const;

export function ChecksPanel({ checks, stats }: ChecksPanelProps) {
  const sorted = [...checks].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  const open = checks.filter((c) => c.level !== "ok").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Words", value: stats.words },
          { label: "Min read", value: stats.readMinutes },
          { label: "H2 / H3", value: `${stats.h2} / ${stats.h3}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-zinc-800/70 px-3 py-2">
            <p className="text-lg font-semibold tabular-nums text-white">{s.value}</p>
            <p className="text-[11px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        {open === 0 ? "Everything looks ready." : `${open} thing${open === 1 ? "" : "s"} to look at. These are suggestions and don't block saving.`}
      </p>

      <ul className="space-y-2">
        {sorted.map((c) => (
          <li key={c.id} className="flex gap-2.5 text-sm">
            {c.level === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Passed" />
            ) : c.level === "warn" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-label="Warning" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-label="Needs fixing" />
            )}
            <span className={c.level === "ok" ? "text-zinc-400" : "text-zinc-200"}>{c.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
