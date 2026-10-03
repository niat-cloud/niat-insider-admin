import { cn } from "@/lib/utils";

type LengthMeterProps = {
  length: number;
  min: number;
  max: number;
};

/** Character counter with a bar: amber when short, green in range, red when Google would truncate. */
export function LengthMeter({ length, min, max }: LengthMeterProps) {
  const state = length === 0 ? "empty" : length > max ? "over" : length < min ? "short" : "good";
  const color =
    state === "over" ? "bg-red-400" : state === "short" ? "bg-amber-400" : state === "good" ? "bg-emerald-400" : "bg-zinc-600";
  const text =
    state === "over" ? "text-red-300" : state === "short" ? "text-amber-300" : state === "good" ? "text-emerald-300" : "text-zinc-500";
  return (
    <div className="space-y-1">
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={cn("h-full rounded-full transition-[width]", color)} style={{ width: `${Math.min(100, (length / max) * 100)}%` }} />
      </div>
      <p className={cn("text-right font-mono text-[11px] tabular-nums", text)}>
        {length} / {max}
        {state === "short" && ` · aim for ${min}+`}
        {state === "over" && " · will be cut off"}
      </p>
    </div>
  );
}
