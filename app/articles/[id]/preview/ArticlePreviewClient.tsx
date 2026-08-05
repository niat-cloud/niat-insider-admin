"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Eye, ThumbsUp, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useArticle } from "@/hooks/useArticles";
import { useGoBack } from "@/hooks/useGoBack";
import { AdminProfileSection } from "@/components/layout/AdminProfileSection";

type ArticlePreviewClientProps = {
  articleId: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  "onboarding-kit": "Onboarding Kit",
  "survival-food": "Survival & Food",
  "club-directory": "Club Directory",
  "career-wins": "Career & Wins",
  "local-travel": "Local Travel",
  amenities: "Amenities",
};

function cleanHtml(html: string) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

/** Remove editor-inserted image-card blocks to avoid duplicate display with carousel. */
function stripImageCardsFromHtml(html: string) {
  if (!html || typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  const cards = div.querySelectorAll(".article-image-card");
  cards.forEach((el) => el.remove());
  return div.innerHTML.trim();
}

export function ArticlePreviewClient({ articleId }: ArticlePreviewClientProps) {
  const goBack = useGoBack("/articles");
  const { data: article, isLoading, isError, error } = useArticle(articleId);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    setCarouselIndex(0);
  }, [articleId]);

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

  const categoryLabel = CATEGORY_LABELS[article.category] ?? article.category;
  const relativeUpdated = formatDistanceToNow(new Date(article.updated_at), {
    addSuffix: true,
  });
  const cleanedBody = stripImageCardsFromHtml(cleanHtml(article.body || ""));
  const articleImages =
    article.images && article.images.length > 0
      ? article.images
      : article.cover_image
        ? [article.cover_image]
        : [];
  const hasMultipleImages = articleImages.length > 1;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
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
          </div>
          <AdminProfileSection />
        </div>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="p-6 md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#991b1b]/20 px-2.5 py-1 text-xs font-medium text-[#fca5a5]">
                {categoryLabel}
              </span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {article.campus_name || "Global"}
              </span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {article.status.replace("_", " ")}
              </span>
            </div>

            <h1 className="mb-3 text-3xl font-semibold leading-tight text-white">{article.title}</h1>
            {article.excerpt ? <p className="mb-5 text-zinc-300">{article.excerpt}</p> : null}

            <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author_username}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                Updated {relativeUpdated}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4" />
                {article.upvote_count}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {article.view_count}
              </span>
            </div>

            {article.status === "rejected" && article.rejection_reason ? (
              <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
                <p className="font-medium">Rejection Reason</p>
                <p className="mt-1">{article.rejection_reason}</p>
              </div>
            ) : null}

            {articleImages.length > 0 ? (
              <div className="mb-8 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
                {hasMultipleImages ? (
                  <div className="relative">
                    <div className="flex items-center justify-center min-h-[220px] max-h-[60vh]">
                      <img
                        src={articleImages[carouselIndex]}
                        alt={`${article.title} — image ${carouselIndex + 1}`}
                        className="max-w-full max-h-[60vh] w-auto h-auto object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCarouselIndex((i) => (i === 0 ? articleImages.length - 1 : i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarouselIndex((i) => (i === articleImages.length - 1 ? 0 : i + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                      {articleImages.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCarouselIndex(i)}
                          className={`h-2 w-2 rounded-full transition-colors ${i === carouselIndex ? "bg-white" : "bg-white/50 hover:bg-white/70"
                            }`}
                          aria-label={`Go to image ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[220px] max-h-[60vh]">
                    <img
                      src={articleImages[0]}
                      alt={article.title}
                      className="max-w-full max-h-[60vh] w-auto h-auto object-contain"
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* Article Content Area */}
            <div
              className={`transition-all duration-300 ${cleanedBody.includes('ni-article')
                ? 'bg-white rounded-xl p-8 shadow-lg border border-zinc-200'
                : 'text-zinc-100'
                }`}
              dangerouslySetInnerHTML={{ __html: cleanedBody }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

