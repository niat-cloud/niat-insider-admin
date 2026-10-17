"use client";

import { CheckCheck, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BulkActionBarProps = {
  selectedCount: number;
  onPublish: () => void;
  onReject: () => void;
  onFeature?: () => void;
  onUnfeature?: () => void;
  onClear: () => void;
  isLoading: boolean;
};

export function BulkActionBar({
  selectedCount,
  onPublish,
  onReject,
  onFeature,
  onUnfeature,
  onClear,
  isLoading,
}: BulkActionBarProps) {
  const visible = selectedCount > 0;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-zinc-700 bg-zinc-900 px-6 py-4 shadow-2xl transition-transform duration-200",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex items-center">
        <span className="flex items-center gap-2 font-medium text-white">
          <CheckCheck className="h-5 w-5 text-zinc-400" />
          {selectedCount} articles selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="ml-4 text-sm text-zinc-400 hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-3">
        {onFeature && (
          <Button
            type="button"
            className="bg-amber-500 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-400"
            onClick={onFeature}
            disabled={isLoading}
          >
            <Star className="mr-2 h-4 w-4" />
            Feature
          </Button>
        )}
        {onUnfeature && (
          <Button
            type="button"
            className="border border-zinc-600 bg-transparent px-4 py-2 font-medium text-zinc-200 hover:bg-zinc-800"
            onClick={onUnfeature}
            disabled={isLoading}
          >
            Unfeature
          </Button>
        )}
        <Button
          type="button"
          className="bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-500"
          onClick={onPublish}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">Saving…</span>
          ) : (
            <>
              <CheckCheck className="mr-2 h-4 w-4" />
              Publish All
            </>
          )}
        </Button>
        <Button
          type="button"
          className="ml-3 bg-red-700 px-5 py-2 font-medium text-white hover:bg-red-600"
          onClick={onReject}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Reject All
        </Button>
      </div>
    </div>
  );
}
