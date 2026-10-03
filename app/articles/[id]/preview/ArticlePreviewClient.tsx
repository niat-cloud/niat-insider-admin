"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { useArticle } from "@/hooks/useArticles";
import { useGoBack } from "@/hooks/useGoBack";
import { AdminProfileSection } from "@/components/layout/AdminProfileSection";
import { ArticlePreview } from "@/components/articles/ArticlePreview";
import { PUBLIC_SITE_URL } from "@/lib/articleBody";
import { cn } from "@/lib/utils";

type ArticlePreviewClientProps = {
  articleId: string;
};

/** Full-page preview of the saved article, rendered the way niatinsider.com shows it. */
export function ArticlePreviewClient({ articleId }: ArticlePreviewClientProps) {
  const goBack = useGoBack("/articles");
  const { data: article, isLoading, isError, error } = useArticle(articleId);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center">
        <p className="text-lg text-white">Unable to load article</p>
        <p className="text-sm text-zinc-400">{(error as Error)?.message ?? "Unknown error"}</p>
        <button
          type="button"
          onClick={goBack}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Back to Articles
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Articles
            </button>
            <Link
              href={`/articles/${article.id}`}
              className="rounded-lg bg-[#991b1b] px-3 py-2 text-sm font-medium text-white hover:bg-[#7f1d1d]"
            >
              Open Edit Mode
            </Link>
            {article.status === "published" && (
              <a
                href={`${PUBLIC_SITE_URL}/article/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white"
              >
                View live
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div role="group" aria-label="Preview width" className="flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
              {([
                { d: "desktop", label: "Desktop", icon: Monitor },
                { d: "mobile", label: "Mobile", icon: Smartphone },
              ] as const).map(({ d, label, icon: Icon }) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={device === d}
                  onClick={() => setDevice(d)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs",
                    device === d ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <AdminProfileSection />
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-200 p-3 sm:p-6">
          <ArticlePreview
            device={device}
            article={{
              title: article.title,
              body: article.body,
              excerpt: article.excerpt,
              category: article.category,
              campusName: article.campus_name,
              isGlobalGuide: article.is_global_guide,
              authorUsername: article.author_username || article.author?.username,
              status: article.status,
              rejectionReason: article.rejection_reason,
              coverImage: article.cover_image,
              images: article.images,
              faq: article.faq_schema,
              updatedAt: article.updated_at,
              upvoteCount: article.upvote_count,
              viewCount: article.view_count,
            }}
          />
        </div>
      </div>
    </div>
  );
}
