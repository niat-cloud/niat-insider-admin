"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GUIDE_RULES } from "@/lib/guideReview";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  templates: { label: string; text: string }[];
  busy?: boolean;
  onConfirm: (reason: string) => void;
};

/** Asks for the reason the author will see (reject, take down). */
export function GuideReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  templates,
  busy,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setError("");
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < GUIDE_RULES.reasonMinChars) {
      setError(`Write at least ${GUIDE_RULES.reasonMinChars} characters so the author knows what to change.`);
      return;
    }
    setError("");
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showClose={true} className="border-zinc-800 bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setReason(t.text)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-rose-500/40 hover:text-white"
              >
                {t.label}
              </button>
            ))}
          </div>
          <label htmlFor="guide-reason" className="text-sm text-zinc-300">
            Message to the author
          </label>
          <Textarea
            id="guide-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Say what to change. The author sees this on their My guides page."
            className="min-h-[120px] border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            rows={5}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={busy}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
