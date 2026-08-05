"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileX } from "lucide-react";
import {
  useInfiniteArticles,
  useUpdateArticle,
  useDeleteArticle,
  useBulkUpdateArticles,
  useAuthorLeaderboard,
} from "@/hooks/useArticles";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { AdminArticleCard } from "@/components/articles/AdminArticleCard";
import { BulkActionBar } from "@/components/articles/BulkActionBar";
import { Input } from "@/components/ui/input";
import type { ArticleStatus } from "@/types/article";
import { getCampusOptions } from "@/lib/api/articles";
import type { AdminCampusOption } from "@/lib/api/articles";

const PAGE_SIZE = 20;
const SCROLL_STORAGE_KEY = "articles:scroll";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
] as const;

const STATUS_TOAST: Record<string, string> = {
  published: "Article published",
  pending_review: "Article sent to review",
  rejected: "Article rejected",
  draft: "Article set to draft",
};

export function ArticlesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Seed every filter from the URL so a fresh mount (e.g. returning via
  // Back navigation) restores exactly what the user had applied before.
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "");
  const [campusFilter, setCampusFilter] = useState(() => searchParams.get("campus_id") ?? "");
  const [authorFilter] = useState(() => searchParams.get("author_id") ?? "");
  const [aiGeneratedFilter, setAiGeneratedFilter] = useState(() => searchParams.get("ai_generated") ?? "");
  const [campuses, setCampuses] = useState<AdminCampusOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Mirror the active filters into the URL (replace, not push, so filter
  // tweaks don't spam browser history) so Back navigation can restore them.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (statusFilter) qs.set("status", statusFilter);
    if (campusFilter) qs.set("campus_id", campusFilter);
    if (authorFilter) qs.set("author_id", authorFilter);
    if (aiGeneratedFilter) qs.set("ai_generated", aiGeneratedFilter);
    const query = qs.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, statusFilter, campusFilter, authorFilter, aiGeneratedFilter, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    getCampusOptions()
      .then((list) => {
        if (!cancelled) setCampuses(list);
      })
      .catch(() => {
        if (!cancelled) setCampuses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const params = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(campusFilter ? { campus_id: campusFilter } : {}),
    ...(authorFilter ? { author_id: authorFilter } : {}),
    ...(aiGeneratedFilter ? { ai_generated: aiGeneratedFilter } : {}),
    ordering: "-created_at",
    page_size: PAGE_SIZE,
  };
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteArticles(params);
  const { data: authorLeaderboardData } = useAuthorLeaderboard();
  const authorLeaderboard = authorLeaderboardData?.authors ?? [];
  const selectedAuthorName =
    authorFilter
      ? authorLeaderboard.find((a) => a.id === authorFilter)?.username ?? "Author"
      : null;

  // Load next page when sentinel scrolls into view
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Restore scroll position once the (cache-hydrated) results for this exact
  // filter combination are back on screen, e.g. after Back navigation.
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || isLoading) return;
    scrollRestored.current = true;
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) return;
    try {
      const { search: savedQuery, y } = JSON.parse(raw) as { search: string; y: number };
      if (savedQuery === window.location.search) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    } catch {
      // Malformed sessionStorage entry — ignore and skip restoring.
    }
  }, [isLoading]);

  useEffect(() => {
    return () => {
      sessionStorage.setItem(
        SCROLL_STORAGE_KEY,
        JSON.stringify({ search: window.location.search, y: window.scrollY })
      );
    };
  }, []);

  const updateMutation = useUpdateArticle();
  const deleteMutation = useDeleteArticle();
  const bulkUpdate = useBulkUpdateArticles();
  const { toast } = useToast();

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const results =
    data?.pages.flatMap((p) => p.results) ?? [];
  const displayedArticles = results;

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(displayedArticles.map((a) => a.id)));
  }, [displayedArticles]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((on) => {
      if (on) setSelectedIds(new Set());
      return !on;
    });
  }, []);

  const handleBulkPublish = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    try {
      await bulkUpdate.mutateAsync(ids.map((id) => ({ id, status: "published" })));
      toast({ title: `${count} articles published` });
      clearSelection();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      toast({
        title: "Error",
        description: ax.response?.data?.detail ?? "Failed to publish articles",
        variant: "destructive",
      });
    }
  }, [selectedIds, bulkUpdate, toast, clearSelection]);

  const handleBulkReject = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    try {
      await bulkUpdate.mutateAsync(ids.map((id) => ({ id, status: "rejected" })));
      toast({ title: `${count} articles rejected` });
      clearSelection();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      toast({
        title: "Error",
        description: ax.response?.data?.detail ?? "Failed to reject articles",
        variant: "destructive",
      });
    }
  }, [selectedIds, bulkUpdate, toast, clearSelection]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: ArticleStatus, rejectionReason?: string) => {
      const payload: { status: ArticleStatus; rejection_reason?: string } = {
        status: newStatus,
      };
      if (rejectionReason) payload.rejection_reason = rejectionReason;
      try {
        await updateMutation.mutateAsync({ id, data: payload });
        toast({
          title: STATUS_TOAST[newStatus] ?? "Article updated",
        });
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { detail?: string } } };
        const msg =
          ax.response?.data?.detail ?? "Failed to update article";
        toast({
          title: "Error",
          description: typeof msg === "string" ? msg : "Failed to update article",
          variant: "destructive",
        });
      }
    },
    [updateMutation, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Article deleted" });
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { detail?: string } } };
        const msg = ax.response?.data?.detail ?? "Failed to delete article";
        toast({
          title: "Error",
          description: typeof msg === "string" ? msg : "Failed to delete article",
          variant: "destructive",
        });
      }
    },
    [deleteMutation, toast]
  );

  const count = data?.pages[0]?.count ?? 0;
  const loadedCount = results.length;
  const start = loadedCount > 0 ? 1 : 0;
  const end = loadedCount;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Filter bar */}
      <div className="sticky top-[64px] z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectionMode}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                selectionMode
                  ? "bg-[#e11d48] text-white"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {selectionMode ? "✓ Selecting" : "Select Multiple"}
            </button>
            {selectionMode && (
              <button
                type="button"
                onClick={selectAll}
                className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-white hover:underline"
              >
                Select All
              </button>
            )}
            <span className="hidden rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 sm:inline-block">
              {isLoading ? "Loading..." : `${count} total`}
            </span>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              type="search"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 sm:w-64"
            />
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white sm:w-56"
            >
              <option value="">All campuses</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white sm:w-44"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value || "all"} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={aiGeneratedFilter}
              onChange={(e) => setAiGeneratedFilter(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white sm:w-56"
            >
              <option value="">All content types</option>
              <option value="false">User-generated only</option>
              <option value="true">AI-generated only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6 lg:px-6">
        <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          {authorFilter ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-300">
                {selectedAuthorName}&apos;s Articles
              </p>
              <Link
                href="/authors"
                className="inline-flex w-fit rounded-md bg-[#991b1b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7f1d1d]"
              >
                Go to Leaderboard
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                Top Authors by Article Count
              </h2>
              {authorLeaderboard.length === 0 ? (
                <p className="text-sm text-zinc-500">No author data available yet.</p>
              ) : (
                <div className="grid gap-2 lg:grid-cols-3">
                  {authorLeaderboard.slice(0, 3).map((author, idx) => (
                    <div
                      key={author.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {idx + 1}. {author.username}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{author.email}</p>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-[#991b1b]/20 px-2 py-0.5 text-xs font-semibold text-[#fca5a5]">
                        {author.article_count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Link
                  href="/authors"
                  className="inline-flex rounded-md bg-[#991b1b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7f1d1d]"
                >
                  View more
                </Link>
              </div>
            </>
          )}
        </section>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl bg-zinc-900 p-5"
              >
                <div className="h-5 w-20 rounded-full bg-zinc-800" />
                <div className="mt-3 h-4 w-3/4 rounded bg-zinc-800" />
                <div className="mt-2 flex gap-2">
                  <div className="h-5 w-24 rounded bg-zinc-800" />
                  <div className="h-5 w-28 rounded bg-zinc-800" />
                </div>
                <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 flex-1 rounded-lg bg-zinc-800" />
                  <div className="h-8 w-20 rounded-lg bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-white">Failed to load articles</p>
            <p className="mt-1 text-sm text-zinc-500">
              {(error as Error)?.message ?? "Unknown error"}
            </p>
          </div>
        ) : displayedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileX className="h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-lg text-white">No articles found</p>
            <p className="mt-1 text-sm text-zinc-500">
              Try changing the filter or search term
            </p>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-4 sm:grid-cols-1 lg:grid-cols-2 ${
                selectionMode ? "pb-20" : ""
              }`}
            >
              {displayedArticles.map((article) => (
                <AdminArticleCard
                  key={article.id}
                  article={article}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  isSelected={selectedIds.has(article.id)}
                  onSelect={toggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
            <BulkActionBar
              selectedCount={selectedIds.size}
              onPublish={handleBulkPublish}
              onReject={handleBulkReject}
              onClear={clearSelection}
              isLoading={bulkUpdate.isPending}
            />

            {/* Pagination / infinite scroll */}
            {count > 0 && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <p className="text-sm text-zinc-500">
                  Showing {start}–{end} of {count} articles
                  {hasNextPage && " — scroll for more"}
                </p>
                <div ref={loadMoreRef} className="min-h-[40px] flex items-center justify-center">
                  {isFetchingNextPage && (
                    <span className="text-sm text-zinc-500">Loading more…</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
