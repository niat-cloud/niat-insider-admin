import { Badge } from "@/components/ui/badge";
import { GUIDE_STATUS_LABEL } from "@/lib/guideReview";
import type { GuideStatus } from "@/types/guide";

const STATUS_CLASS: Record<GuideStatus, string> = {
  draft: "border-zinc-600/40 bg-zinc-700/30 text-zinc-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
  taken_down: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

export function GuideStatusBadge({ status }: { status: GuideStatus }) {
  return <Badge className={STATUS_CLASS[status]}>{GUIDE_STATUS_LABEL[status]}</Badge>;
}
