"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Settings2,
  Star,
  ThumbsUp,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { GuideReasonDialog } from "@/components/guides/GuideReasonDialog";
import { GuideStatusBadge } from "@/components/guides/GuideStatusBadge";
import { useToast } from "@/hooks/useToast";
import { useAdminGuides, useAdminRole, usePublicGuideCategories } from "@/hooks/useGuides";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { bulkPublishGuides, bulkRejectGuides, editGuide } from "@/lib/api/guides";
import { REJECT_TEMPLATES, waitingFor } from "@/lib/guideReview";
import { cn } from "@/lib/utils";
import type { AdminGuideListItem, GuideStatus } from "@/types/guide";

const PAGE_SIZE = 20;
const EMPTY_SELECTION = new Set<string>();

const TABS: { value: GuideStatus | ""; label: string }[] = [
  { value: "pending", label: "Waiting for review" },
  { value: "published", label: "Live" },
  { value: "rejected", label: "Sent back" },
  { value: "taken_down", label: "Taken down" },
  { value: "draft", label: "Drafts" },
  { value: "", label: "All" },
];

/** The review queue is first come, first served; everything else shows the latest first. */
function orderingFor(status: GuideStatus | ""): string {
  if (status === "pending") return "submitted_at";
  if (status === "published") return "-published_at";
  return "-updated_at";
}

export function GuidesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const role = useAdminRole();

  // No ?status= is the review queue; "all" is every status.
  const statusParam = searchParams.get("status") ?? "pending";
  const status = (statusParam === "all" ? "" : statusParam) as GuideStatus | "";
  const category = searchParams.get("category") ?? "";
  const featuredOnly = searchParams.get("featured") === "true";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (!("page" in changes)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if ((searchParams.get("search") ?? "") !== debouncedSearch) setParams({ search: debouncedSearch });
  }, [debouncedSearch, searchParams, setParams]);

  // A selection only makes sense within one page of one filter.
  const selectionKey = [status, category, featuredOnly, page, debouncedSearch].join("|");
  const selected = selection.key === selectionKey ? selection.ids : EMPTY_SELECTION;
  const setSelected = (ids: Set<string> | ((prev: Set<string>) => Set<string>)) =>
    setSelection({ key: selectionKey, ids: typeof ids === "function" ? ids(selected) : ids });

  const { data, isLoading, isFetching, error } = useAdminGuides({
    status: status || undefined,
    category: category || undefined,
    featured: featuredOnly || undefined,
    search: debouncedSearch || undefined,
    ordering: orderingFor(status),
    page,
    page_size: PAGE_SIZE,
  });
  const { data: categories } = usePublicGuideCategories();

  const guides = useMemo(() => data?.results ?? [], [data]);
  const counts = data?.status_counts;
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const pendingOnPage = guides.filter((g) => g.status === "pending");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["guides"] });

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reportBulk = (done: number, verb: string, errors: { error: string }[]) => {
    toast({
      title: `${done} ${done === 1 ? "guide" : "guides"} ${verb}`,
      description: errors.length ? `${errors.length} failed: ${errors[0].error}` : undefined,
      variant: errors.length ? "destructive" : undefined,
    });
  };

  const handleBulkPublish = async () => {
    setBulkBusy(true);
    try {
      const res = await bulkPublishGuides([...selected]);
      reportBulk(res.published?.length ?? 0, "published", res.errors);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast({ title: "Couldn't publish", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    setBulkBusy(true);
    try {
      const res = await bulkRejectGuides([...selected], reason);
      reportBulk(res.rejected?.length ?? 0, "sent back", res.errors);
      setSelected(new Set());
      setRejectOpen(false);
      refresh();
    } catch (err) {
      toast({ title: "Couldn't send back", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleFeatured = async (guide: AdminGuideListItem) => {
    try {
      await editGuide(guide.slug, { featured: !guide.featured });
      toast({
        title: guide.featured ? "Removed from featured" : "Featured",
        description: guide.featured ? undefined : "It shows in “Stories worth starting with” on the guides page.",
      });
      refresh();
    } catch (err) {
      toast({ title: "Couldn't change featured", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">How-To Guides</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Students&apos; success stories, written as how they did it. Read each one before it goes live: the
            achievement is self-reported, so you are the only check.
          </p>
        </div>
        {role === "admin" && (
          <Link
            href="/guides/categories"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <Settings2 className="h-4 w-4" />
            Categories and questions
          </Link>
        )}
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Guides by status">
        {TABS.map((tab) => {
          const count = counts ? (tab.value ? counts[tab.value] : counts.total) : null;
          const active = status === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ status: tab.value === "pending" ? null : tab.value || "all" })}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              {tab.label}
              {count != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    tab.value === "pending" && count > 0 ? "bg-amber-500/20 text-amber-300" : "bg-white/10"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, achievement or username"
          className="h-9 w-full max-w-xs border-zinc-800 bg-zinc-900 text-sm"
          aria-label="Search guides"
        />
        <select
          value={category}
          onChange={(e) => setParams({ category: e.target.value })}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-200"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <Checkbox
            checked={featuredOnly}
            onCheckedChange={(v) => setParams({ featured: v ? "true" : null })}
          />
          Featured only
        </label>
        {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" aria-label="Updating" />}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-20 z-40 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 backdrop-blur">
          <span className="text-sm text-zinc-200">
            {selected.size} selected. Read each one first: publishing puts them on the site straight away.
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={bulkBusy}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              disabled={bulkBusy}
              onClick={() => setRejectOpen(true)}
            >
              <Undo2 className="mr-1.5 h-4 w-4" />
              Send back
            </Button>
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={bulkBusy} onClick={handleBulkPublish}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300" role="alert">
          {apiErrorMessage(error, "Couldn't load guides.")} Only moderators and admins can review guides.
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading guides…
        </div>
      ) : guides.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-10 text-center">
          <BookOpenCheck className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-300">
            {status === "pending" && !debouncedSearch && !category
              ? "No guides are waiting. New submissions show up here first."
              : "No guides match these filters."}
          </p>
        </div>
      ) : (
        <>
          {pendingOnPage.length > 1 && (
            <label className="mb-2 flex w-fit items-center gap-2 px-1 text-xs text-zinc-400">
              <Checkbox
                checked={pendingOnPage.every((g) => selected.has(g.id))}
                onCheckedChange={(v) =>
                  setSelected(v ? new Set(pendingOnPage.map((g) => g.id)) : new Set())
                }
              />
              Select all waiting on this page
            </label>
          )}
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
            {guides.map((guide) => {
              const waited = guide.status === "pending" ? waitingFor(guide.submitted_at) : null;
              return (
                <li key={guide.id} className="flex gap-3 bg-zinc-950 px-4 py-4 hover:bg-white/[0.02]">
                  <div className="w-4 pt-1">
                    {guide.status === "pending" && (
                      <Checkbox
                        checked={selected.has(guide.id)}
                        onCheckedChange={() => toggleSelect(guide.id)}
                        aria-label={`Select ${guide.title || "guide"}`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <GuideStatusBadge status={guide.status} />
                      <span>{guide.category.name}</span>
                      {waited && (
                        <span className={cn("flex items-center gap-1", waited.includes("day") && "text-amber-400")}>
                          <Clock className="h-3 w-3" /> Waiting {waited}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/guides/${encodeURIComponent(guide.slug)}`}
                      className="block font-semibold text-white hover:text-rose-300"
                    >
                      {guide.title || "Untitled guide"}
                    </Link>
                    {guide.achievement && <p className="mt-0.5 text-sm text-zinc-300">{guide.achievement}</p>}
                    <p className="mt-1 text-xs text-zinc-500">
                      By {guide.author.username}
                      {guide.campus_name ? `, ${guide.campus_name}` : ""}
                      {guide.reading_time_minutes ? `. ${guide.reading_time_minutes} min read` : ""}
                    </p>
                    {guide.status === "rejected" && guide.rejection_reason && (
                      <p className="mt-2 line-clamp-2 text-xs text-red-300/80">Sent back: {guide.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {guide.status === "published" && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleFeatured(guide)}
                          aria-pressed={guide.featured}
                          aria-label={guide.featured ? "Remove from featured" : "Feature this guide"}
                          title={guide.featured ? "Featured" : "Feature this guide"}
                          className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-amber-300"
                        >
                          <Star className={cn("h-4 w-4", guide.featured && "fill-amber-400 text-amber-400")} />
                        </button>
                        <span className="flex items-center gap-3 text-xs tabular-nums text-zinc-500">
                          <span className="flex items-center gap-1" title="Reads">
                            <Eye className="h-3 w-3" /> {guide.view_count}
                          </span>
                          <span className="flex items-center gap-1" title="Found it helpful">
                            <ThumbsUp className="h-3 w-3" /> {guide.upvote_count}
                          </span>
                        </span>
                      </>
                    )}
                    <Link
                      href={`/guides/${encodeURIComponent(guide.slug)}`}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                    >
                      {guide.status === "pending" ? "Review" : "Open"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm text-zinc-400" aria-label="Pages">
              <span>
                Page {page} of {totalPages} ({data?.count} guides)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-800"
                  disabled={page <= 1}
                  onClick={() => setParams({ page: String(page - 1) })}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-800"
                  disabled={page >= totalPages}
                  onClick={() => setParams({ page: String(page + 1) })}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <GuideReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Send back ${selected.size} ${selected.size === 1 ? "guide" : "guides"}`}
        description="Every selected author gets this same message. For guide-specific feedback, open each guide instead."
        confirmLabel="Send back"
        templates={REJECT_TEMPLATES}
        busy={bulkBusy}
        onConfirm={handleBulkReject}
      />
    </main>
  );
}
