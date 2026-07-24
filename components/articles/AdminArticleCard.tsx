"use client";

import Link from "next/link";
import { ThumbsUp, Eye, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "./StatusBadge";
import { QuickStatusMenu } from "./QuickStatusMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { ArticleListItem } from "@/types/article";
import type { ArticleStatus } from "@/types/article";

const CATEGORY_LABELS: Record<string, string> = {
  "onboarding-kit": "Onboarding Kit",
  "survival-food": "Survival & Food",
  "club-directory": "Club Directory",
  "career-wins": "Career & Wins",
  "local-travel": "Local Travel",
  amenities: "Amenities",
};

type AdminArticleCardProps = {
  article: ArticleListItem;
  onStatusChange: (
    id: string,
    status: ArticleStatus,
    rejectionReason?: string
  ) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  selectionMode?: boolean;
};

export function AdminArticleCard({
  article,
  onStatusChange,
  onDelete,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: AdminArticleCardProps) {
  const categoryLabel =
    CATEGORY_LABELS[article.category] ?? article.category;
  const relativeDate = formatDistanceToNow(new Date(article.updated_at), {
    addSuffix: true,
  });

  return (
    <article
      className={`group relative rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600 ${
        selectionMode && isSelected ? "ring-2 ring-[#991b1b]" : ""
      }`}
    >
      {onSelect && (
        <div
          className={`absolute left-3 top-3 z-10 transition-opacity ${
            selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(article.id)}
            className="border-zinc-600 bg-zinc-800 data-[state=checked]:bg-[#991b1b] data-[state=checked]:border-[#991b1b]"
          />
        </div>
      )}
      {/* Row 1: Status + Quick menu */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={article.status} />
        </div>
        <div className="flex items-center gap-1">
          <QuickStatusMenu article={article} onStatusChange={onStatusChange} />
        </div>
      </div>

      {/* Row 2: Title */}
      <h2 className="mt-2 mb-1 line-clamp-2 text-base font-semibold leading-snug text-white">
        <Link href={`/articles/${article.id}/preview`} className="hover:text-zinc-100 hover:underline">
          {article.title}
        </Link>
      </h2>

      {/* SEO fields */}
      <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
        <p className="text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Slug:</span> {article.slug}
        </p>
        <p className="line-clamp-1 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Meta title:</span>{" "}
          {article.meta_title?.trim() ? article.meta_title : "—"}
        </p>
        <p className="line-clamp-2 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Meta description:</span>{" "}
          {article.meta_description?.trim() ? article.meta_description : "—"}
        </p>
        <p className="line-clamp-2 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Meta keywords:</span>{" "}
          {Array.isArray(article.meta_keywords) && article.meta_keywords.length > 0
            ? article.meta_keywords.join(", ")
            : "—"}
        </p>
      </div>

      {/* Row 3: Category + campus pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#991b1b]/20 px-2.5 py-0.5 text-xs font-medium text-[#991b1b]">
          {categoryLabel}
        </span>
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
          {article.campus_name}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            article.ai_generated
              ? "bg-purple-900/30 text-purple-300"
              : "bg-emerald-900/30 text-emerald-300"
          }`}
        >
          {article.ai_generated ? "AI-generated" : "User-generated"}
        </span>
      </div>

      {/* Row 4: Author + date */}
      <div className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-zinc-400">
        <span>By {article.author?.username?? article.author_username ?? "Unknown"}</span>
        <span>·</span>
        <span>{article.campus_name}</span>
        <span>·</span>
        <span>{relativeDate}</span>
      </div>

      {/* Row 5: Stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" />
          {article.upvote_count}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {article.view_count}
        </span>
        {article.featured && (
          <span className="flex items-center gap-1 text-[#991b1b]">
            <Star className="h-3.5 w-3.5 fill-current" />
            Featured
          </span>
        )}
      </div>

      {/* Bottom action row */}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/articles/${article.id}/preview`}
          className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          View
        </Link>
        <Link
          href={`/articles/${article.id}`}
          className="flex-1 rounded-lg bg-zinc-800 py-2 text-center text-sm text-white transition-colors hover:bg-zinc-700"
        >
          Edit
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-red-500 hover:text-red-400"
            >
              Delete
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-zinc-800 bg-zinc-900">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Delete this article?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                This cannot be undone. The article will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => onDelete(article.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}
