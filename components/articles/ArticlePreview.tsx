"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronRight as Crumb, Clock, Eye, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoteH1, stripScripts } from "@/lib/articleBody";
import { getCategoryConfig } from "@/lib/articleCategories";
import { parseArticleFaq } from "@/lib/articleFaq";
import type { ArticleStatus } from "@/types/article";
import styles from "./ArticlePreview.module.css";

export type ArticlePreviewData = {
  title: string;
  body: string;
  excerpt?: string;
  category: string;
  campusName?: string;
  isGlobalGuide?: boolean;
  authorUsername?: string;
  status?: ArticleStatus;
  rejectionReason?: string;
  coverImage?: string;
  images?: string[];
  faq?: unknown;
  updatedAt?: string;
  upvoteCount?: number;
  viewCount?: number;
};

type ArticlePreviewProps = {
  article: ArticlePreviewData;
  device?: "desktop" | "mobile";
  className?: string;
};

function daysSince(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/**
 * Renders an article the way niatinsider.com's article page does (breadcrumbs,
 * category and campus chips, title, image carousel, body, FAQ block and
 * footer), from any data, including unsaved form values.
 */
export function ArticlePreview({ article, device = "desktop", className }: ArticlePreviewProps) {
  const [index, setIndex] = useState(0);
  const mobile = device === "mobile";

  const images = useMemo(() => {
    const list = (article.images ?? []).filter(Boolean);
    if (list.length > 0) return list;
    return article.coverImage ? [article.coverImage] : [];
  }, [article.images, article.coverImage]);

  // Images can be removed while previewing; fall back to the first one.
  const current = index < images.length ? index : 0;

  const body = useMemo(() => demoteH1(stripScripts(article.body || "")), [article.body]);
  const faq = useMemo(() => parseArticleFaq(article.faq), [article.faq]);
  const category = getCategoryConfig(article.category);
  const campus = article.campusName || "Global";
  const isGlobal = campus === "Global";
  const updatedDays = daysSince(article.updatedAt);
  const crumbs = article.isGlobalGuide || isGlobal ? ["Home", "Articles"] : ["Home", campus, "Articles"];

  return (
    <div
      className={cn(
        styles.page,
        mobile ? styles.mobile : styles.desktop,
        "mx-auto w-full overflow-hidden rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-[max-width] duration-300 motion-reduce:transition-none",
        mobile ? "max-w-[390px]" : "max-w-[860px]",
        className
      )}
    >
      {/* Site chrome stand-in */}
      <div className="flex h-12 items-center justify-between border-b border-[rgba(30,41,59,0.1)] px-4">
        <span className={cn(styles.display, "text-[15px] font-bold text-black")}>
          NIAT <span className="text-[#991b1b]">Insider</span>
        </span>
        <span className="text-[11px] text-[#64748b]">Preview</span>
      </div>

      <div className={cn("mx-auto w-full min-w-0 max-w-3xl", mobile ? "px-4 py-6" : "px-8 py-8")}>
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-black">
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((c) => (
              <li key={c} className="flex items-center">
                <span className="underline-offset-2 hover:underline">{c}</span>
                <Crumb className="mx-1 h-4 w-4 shrink-0" />
              </li>
            ))}
            <li className="min-w-0">
              <span aria-current="page" className="block max-w-xs truncate">
                {article.title || "Untitled article"}
              </span>
            </li>
          </ol>
        </nav>

        <div className="mb-4 flex gap-2">
          <span
            className="rounded-full px-2 py-1 text-xs font-medium"
            style={{ backgroundColor: category.bg, color: category.text, border: `1px solid ${category.border}` }}
          >
            {category.label}
          </span>
          <span
            className="rounded-full px-2 py-1 text-xs font-medium"
            style={
              isGlobal
                ? { backgroundColor: "#f8fafc", color: "#64748b", border: "1px solid #94a3b8" }
                : { backgroundColor: "#991b1b", color: "white", border: "1px solid #991b1b" }
            }
          >
            {campus}
          </span>
        </div>

        {article.status && article.status !== "published" && (
          <div
            className={cn(
              "mb-4 rounded-xl border p-4",
              article.status === "rejected"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            )}
          >
            <p className="font-medium">{article.status === "rejected" ? "Rejected" : "Under Review"}</p>
            {article.rejectionReason && <p className="mt-1 text-sm">{article.rejectionReason}</p>}
          </div>
        )}

        <h1
          className={cn(
            styles.display,
            "mb-4 min-w-0 font-bold text-black",
            mobile ? "text-2xl" : "text-4xl"
          )}
          style={{ fontWeight: 700 }}
        >
          {article.title || "Untitled article"}
        </h1>

        {images.length > 0 && (
          <div className="relative mb-6 w-full overflow-hidden rounded-xl bg-[rgba(30,41,59,0.06)]">
            <div className={cn("flex items-center justify-center", mobile ? "min-h-[200px]" : "min-h-[320px]", "max-h-[70vh]")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={images[current]}
                src={images[current]}
                alt={`${article.title} image ${current + 1}`}
                className="h-auto max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIndex(current === 0 ? images.length - 1 : current - 1)}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex(current === images.length - 1 ? 0 : current + 1)}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={cn("h-2 w-2 rounded-full", i === current ? "bg-white" : "bg-white/50 hover:bg-white/70")}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {body ? (
          <div className={cn(styles.body, "mb-8 max-w-none")} dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <div className={cn(styles.body, "mb-8 max-w-none")}>
            <p className="leading-relaxed text-black">{article.excerpt || ""}</p>
          </div>
        )}

        {faq.length > 0 && (
          <section className={cn(styles.faq, "mb-8")} aria-label="Frequently asked questions">
            <h2 className={cn(styles.display, "mb-4 font-bold text-[#1e293b]", mobile ? "text-xl" : "text-2xl")} style={{ fontWeight: 700 }}>
              Frequently asked questions
            </h2>
            <div>
              {faq.map((item, i) => (
                <div key={i}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-2 space-y-3 border-t border-[rgba(30,41,59,0.1)] pt-6 text-sm text-black">
          <div>Written by {article.authorUsername || "author"}</div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              Last updated {updatedDays} days ago
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {article.upvoteCount ?? 0} upvote{article.upvoteCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.viewCount ?? 0} view{article.viewCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
