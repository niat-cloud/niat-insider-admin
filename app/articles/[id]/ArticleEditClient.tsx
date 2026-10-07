"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Check,
  Columns2,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  RotateCcw,
  Smartphone,
  Star,
  Wand2,
} from "lucide-react";
import { useArticle, useUpdateArticle } from "@/hooks/useArticles";
import { useGoBack } from "@/hooks/useGoBack";
import { useToast } from "@/hooks/useToast";
import { useArticleDraft } from "@/hooks/useArticleDraft";
import { uploadArticleImage, getSubcategories } from "@/lib/api/articles";
import type { SubcategoryOption } from "@/lib/api/articles";
import { articleEditSchema, type ArticleEditFormValues } from "@/lib/schemas/article";
import { categoryOptionsFor } from "@/lib/articleCategories";
import { getBodyStats, PUBLIC_SITE_URL, slugify, MIN_RECOMMENDED_WORDS } from "@/lib/articleBody";
import { getArticleChecks, SLUG_PATTERN } from "@/lib/articleChecks";
import { cn } from "@/lib/utils";
import type { Article, ArticleStatus } from "@/types/article";
import { RichTextEditor } from "@/components/articles/RichTextEditor";
import { ArticlePreview } from "@/components/articles/ArticlePreview";
import { AIReviewPanel } from "@/components/articles/AIReviewPanel";
import { SeoPanel } from "@/components/articles/editor/SeoPanel";
import { ChecksPanel } from "@/components/articles/editor/ChecksPanel";
import { MediaStrip } from "@/components/articles/editor/MediaStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_OPTIONS: { value: ArticleStatus; label: string; active: string }[] = [
  { value: "draft", label: "Draft", active: "bg-zinc-600 text-white" },
  { value: "pending_review", label: "Pending", active: "bg-amber-600 text-white" },
  { value: "published", label: "Published", active: "bg-emerald-700 text-white" },
  { value: "rejected", label: "Rejected", active: "bg-red-700 text-white" },
];

const STATUS_PILL: Record<ArticleStatus, string> = {
  draft: "bg-zinc-700/60 text-zinc-200",
  pending_review: "bg-amber-500/15 text-amber-300",
  published: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
};

type ViewMode = "write" | "split" | "preview";
type SideTab = "settings" | "seo" | "checks" | "ai";

const VIEW_KEY = "niat-admin:editor-view";
const SIDEBAR_KEY = "niat-admin:editor-sidebar";

const SELECT_CLASS =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#991b1b]";

function toFormValues(article: Article): ArticleEditFormValues {
  return {
    slug: article.slug || "",
    title: article.title || "",
    body: article.body || "",
    excerpt: article.excerpt || "",
    status: article.status,
    rejection_reason: article.rejection_reason || "",
    featured: article.featured ?? false,
    category: article.category || "",
    subcategory: article.subcategory || "",
    subcategory_other: article.subcategory_other || "",
    meta_title: article.meta_title || "",
    meta_description: article.meta_description || "",
    meta_keywords: article.meta_keywords ?? [],
    topic: article.topic || "",
    cover_image: article.cover_image || "",
    images: article.images ?? [],
  };
}

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type ArticleEditClientProps = {
  articleId: string;
};

export function ArticleEditClient({ articleId }: ArticleEditClientProps) {
  const goBack = useGoBack("/articles");
  const { data: article, isLoading, isError, error } = useArticle(articleId);
  const updateMutation = useUpdateArticle();
  const { toast } = useToast();
  const draft = useArticleDraft(articleId);

  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [view, setView] = useState<ViewMode>("split");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<SideTab>("settings");
  const [editingSlug, setEditingSlug] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const form = useForm<ArticleEditFormValues>({
    resolver: zodResolver(articleEditSchema),
    defaultValues: {
      slug: "",
      title: "",
      body: "",
      excerpt: "",
      status: "draft",
      rejection_reason: "",
      featured: false,
      category: "",
      subcategory: "",
      subcategory_other: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: [],
      topic: "",
      cover_image: "",
      images: [],
    },
  });

  const { isDirty, errors } = form.formState;
  const values = form.watch();
  const deferredValues = useDeferredValue(values);
  const category = values.category;
  const status = values.status;

  // Restore per-browser layout preferences.
  useEffect(() => {
    setView(readPref(VIEW_KEY, ["write", "split", "preview"] as const, "split"));
    setSidebarOpen(readPref(SIDEBAR_KEY, ["open", "closed"] as const, "open") === "open");
  }, []);

  // Load the article into the form. Later refetches (window focus, after save)
  // only update the form when there are no unsaved edits, so they never wipe work.
  useEffect(() => {
    if (!article) return;
    const firstLoad = loadedFor.current !== article.id;
    if (!firstLoad && form.formState.isDirty) return;
    const serverValues = toFormValues(article);
    form.reset(serverValues);
    if (firstLoad) {
      loadedFor.current = article.id;
      draft.check(serverValues);
    }
  }, [article, form, draft.check]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a local copy of unsaved edits.
  useEffect(() => {
    if (!article || !isDirty) return;
    draft.save(values, article.updated_at);
  }, [values, isDirty, article, draft.save]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch subcategories when category changes.
  useEffect(() => {
    let cancelled = false;
    getSubcategories(category).then((list) => {
      if (!cancelled) setSubcategories(list);
    });
    return () => {
      cancelled = true;
    };
  }, [category]);

  // Warn before closing or reloading the tab with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onSubmit = useCallback(
    async (v: ArticleEditFormValues) => {
      try {
        const saved = await updateMutation.mutateAsync({
          id: articleId,
          data: {
            slug: v.slug,
            title: v.title,
            body: v.body,
            excerpt: v.excerpt ?? "",
            status: v.status,
            rejection_reason: v.rejection_reason ?? "",
            featured: v.featured,
            category: v.category,
            subcategory: v.subcategory ?? "",
            subcategory_other: v.subcategory_other ?? "",
            meta_title: v.meta_title ?? "",
            meta_description: v.meta_description ?? "",
            meta_keywords: v.meta_keywords ?? [],
            topic: v.topic ?? "",
            cover_image: v.cover_image ?? "",
            images: v.images ?? [],
          },
        });
        form.reset(saved ? toFormValues(saved) : v);
        draft.clear();
        setLastSavedAt(new Date().toISOString());
        toast({ title: "Article saved" });
      } catch (err: unknown) {
        const ax = err as { response?: { data?: Record<string, unknown> } };
        const data = ax.response?.data;
        let msg = "Failed to save article";
        if (data && typeof data.detail === "string") msg = data.detail;
        else if (data && typeof data === "object") {
          const first = Object.entries(data)[0];
          if (first) msg = `${first[0]}: ${Array.isArray(first[1]) ? first[1].join(" ") : String(first[1])}`;
        }
        toast({ title: "Couldn't save", description: msg, variant: "destructive" });
      }
    },
    [articleId, updateMutation, form, draft, toast]
  );

  const onInvalid = useCallback(() => {
    toast({
      title: "Fix the highlighted fields",
      description: "Some required fields are empty or invalid.",
      variant: "destructive",
    });
    setTab("settings");
  }, [toast]);

  const submit = useMemo(() => form.handleSubmit(onSubmit, onInvalid), [form, onSubmit, onInvalid]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!updateMutation.isPending) void submit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submit, updateMutation.isPending]);

  const setField = useCallback(
    <K extends keyof ArticleEditFormValues>(name: K, value: ArticleEditFormValues[K]) => {
      form.setValue(name as any, value as any, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    },
    [form]
  );

  const changeView = (next: ViewMode) => {
    setView(next);
    writePref(VIEW_KEY, next);
  };

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      writePref(SIDEBAR_KEY, open ? "closed" : "open");
      return !open;
    });
  };

  const handleBack = () => {
    if (isDirty) setLeaveOpen(true);
    else goBack();
  };

  const uploadImage = async (file: File) => {
    try {
      const { url } = await uploadArticleImage(file);
      const current = form.getValues("images") ?? [];
      setField("images", [...current, url]);
      if (!form.getValues("cover_image")) setField("cover_image", url);
      toast({ title: "Image uploaded" });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        title: "Upload failed",
        description: ax.response?.data?.error ?? `Could not upload ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const removeImage = (url: string) => {
    const next = (form.getValues("images") ?? []).filter((u) => u !== url);
    setField("images", next);
    if (form.getValues("cover_image") === url) setField("cover_image", next[0] ?? "");
  };

  const moveImage = (url: string, direction: -1 | 1) => {
    const list = [...(form.getValues("images") ?? [])];
    const i = list.indexOf(url);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setField("images", list);
  };

  const restoreDraft = () => {
    if (!draft.pending) return;
    const server = article ? toFormValues(article) : undefined;
    if (server) form.reset(server);
    for (const [k, v] of Object.entries(draft.pending.values)) {
      setField(k as keyof ArticleEditFormValues, v as never);
    }
    draft.dismiss();
    toast({ title: "Unsaved changes restored", description: "Review them, then save." });
  };

  const stats = useMemo(() => getBodyStats(deferredValues.body || ""), [deferredValues.body]);
  const checks = useMemo(() => getArticleChecks(deferredValues, stats), [deferredValues, stats]);
  const openChecks = checks.filter((c) => c.level !== "ok").length;
  const categoryOptions = categoryOptionsFor(category);

  if (isError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-zinc-950">
        <p className="text-white">Couldn&apos;t load this article</p>
        <p className="text-sm text-zinc-500">{(error as Error)?.message}</p>
        <Button variant="outline" onClick={goBack}>Back to Articles</Button>
      </div>
    );
  }

  if (isLoading || !article) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const savedStatus = article.status;
  const liveUrl = `${PUBLIC_SITE_URL}/article/${article.slug}`;
  const slugValid = SLUG_PATTERN.test(values.slug || "");
  const showEditor = view !== "preview";
  const showPreview = view !== "write";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-950">
      <form onSubmit={submit} noValidate>
        {/* Top bar */}
        <div className="sticky top-16 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-3 px-4 lg:px-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Articles</span>
            </button>
            <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
              <span className="truncate text-sm font-medium text-zinc-200">{values.title || "Untitled article"}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_PILL[savedStatus])}>
                {savedStatus.replace("_", " ")}
              </span>
            </div>
            <div className="flex-1 md:hidden" />

            <span className="hidden shrink-0 text-xs lg:inline" aria-live="polite">
              {updateMutation.isPending ? (
                <span className="text-zinc-400">Saving…</span>
              ) : isDirty ? (
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-zinc-500">
                  <Check className="h-3.5 w-3.5" />
                  {lastSavedAt ? "Saved" : "Up to date"}
                </span>
              )}
            </span>

            <div role="group" aria-label="View" className="flex shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
              {([
                { mode: "write", label: "Write", icon: PenLine },
                { mode: "split", label: "Split", icon: Columns2 },
                { mode: "preview", label: "Preview", icon: Eye },
              ] as const).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => changeView(mode)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    view === mode ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white",
                    mode === "split" && "hidden lg:inline-flex"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleSidebar}
              aria-pressed={sidebarOpen}
              title={sidebarOpen ? "Hide settings" : "Show settings"}
              className="hidden shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white xl:inline-flex"
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>

            {savedStatus === "published" && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden shrink-0 items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white md:inline-flex"
              >
                View live
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="shrink-0 bg-[#991b1b] text-white hover:bg-[#7f1d1d]"
            >
              {updateMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save
              <kbd className="ml-2 hidden rounded border border-white/25 px-1 font-mono text-[10px] text-white/80 sm:inline">
                Ctrl S
              </kbd>
            </Button>
          </div>
        </div>

        {draft.pending && (
          <div className="border-b border-amber-900/50 bg-amber-950/30">
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-amber-100 lg:px-6">
              <RotateCcw className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="min-w-0 flex-1">
                You have unsaved changes from {formatTime(draft.pending.savedAt)} in this browser.
                {draft.pending.baseUpdatedAt !== article.updated_at && " The article has been updated on the server since then."}
              </span>
              <Button type="button" size="sm" onClick={restoreDraft} className="bg-amber-600 text-white hover:bg-amber-500">
                Restore
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={draft.clear} className="text-amber-200 hover:bg-amber-900/40 hover:text-white">
                Discard
              </Button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "mx-auto grid max-w-[1800px] gap-6 px-4 py-6 lg:px-6",
            sidebarOpen && "xl:grid-cols-[minmax(0,1fr)_360px]"
          )}
        >
          <div className={cn("grid min-w-0 items-start gap-6", view === "split" && "lg:grid-cols-2")}>
            {/* Writing column */}
            {showEditor && (
              <div className={cn("min-w-0 space-y-5", view === "write" && "mx-auto w-full max-w-3xl")}>
                <div className="space-y-2">
                  <Label htmlFor="title" className="sr-only">Title</Label>
                  <Textarea
                    id="title"
                    {...form.register("title")}
                    rows={2}
                    placeholder="Article title"
                    className="min-h-0 resize-none border-0 bg-transparent px-0 text-2xl font-bold leading-tight text-white placeholder:text-zinc-600 focus-visible:ring-0 md:text-3xl"
                  />
                  {errors.title && <p className="text-sm text-red-400">{errors.title.message}</p>}

                  {/* URL / slug */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-zinc-500">
                    <Link2 className="h-3.5 w-3.5 shrink-0" />
                    {editingSlug ? (
                      <>
                        <span>{PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/article/</span>
                        <Input
                          id="slug"
                          {...form.register("slug")}
                          autoFocus
                          onBlur={() => setEditingSlug(false)}
                          className="h-7 min-w-[16rem] flex-1 border-zinc-700 bg-zinc-800 font-mono text-xs text-white"
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setField("slug", slugify(values.title))}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-sans text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          From title
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingSlug(true)}
                        className="min-w-0 break-all text-left hover:text-zinc-300"
                        title="Edit URL slug"
                      >
                        {PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/article/
                        <span className="text-[#fca5a5]">{values.slug || "add-a-slug"}</span>
                        <span className="ml-2 font-sans text-zinc-600 underline">edit</span>
                      </button>
                    )}
                    {values.slug && !slugValid && (
                      <span className="font-sans text-amber-300">Use lowercase letters, numbers and hyphens</span>
                    )}
                    {article.slug && values.slug !== article.slug && savedStatus === "published" && (
                      <span className="font-sans text-amber-300">Changing a published URL breaks existing links to it</span>
                    )}
                  </div>
                  {errors.slug && <p className="text-sm text-red-400">{errors.slug.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="excerpt" className="text-zinc-300">Excerpt</Label>
                    <span className="font-mono text-[11px] tabular-nums text-zinc-500">{(values.excerpt ?? "").length} / 1000</span>
                  </div>
                  <Textarea
                    id="excerpt"
                    {...form.register("excerpt")}
                    rows={2}
                    placeholder="One or two sentences shown on article cards"
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  />
                  {errors.excerpt && <p className="text-sm text-red-400">{errors.excerpt.message}</p>}
                </div>

                <MediaStrip
                  images={values.images ?? []}
                  cover={values.cover_image ?? ""}
                  onUpload={uploadImage}
                  onRemove={removeImage}
                  onSetCover={(url) => setField("cover_image", url)}
                  onMove={moveImage}
                />

                <div className="space-y-2">
                  <RichTextEditor
                    value={values.body}
                    onChange={(html) => setField("body", html)}
                    onCleaned={(removed) =>
                      toast({
                        title: removed > 0 ? `Removed ${removed} empty block${removed === 1 ? "" : "s"}` : "Nothing to clean up",
                      })
                    }
                    minHeight="420px"
                  />
                  {errors.body && <p className="text-sm text-red-400">{errors.body.message}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500">
                    <span className={stats.words < MIN_RECOMMENDED_WORDS ? "text-amber-300" : undefined}>
                      {stats.words} words{stats.words < MIN_RECOMMENDED_WORDS && ` · aim for ${MIN_RECOMMENDED_WORDS}+`}
                    </span>
                    <span>{stats.readMinutes} min read</span>
                    <span>H2 × {stats.h2}</span>
                    <span>H3 × {stats.h3}</span>
                    <span>{stats.links} links</span>
                    {stats.emptyBlocks > 0 && <span className="text-amber-300">{stats.emptyBlocks} empty blocks</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Live preview */}
            {showPreview && (
              <div
                className={cn(
                  "min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60",
                  view === "split" && "lg:sticky lg:top-[8.5rem] lg:max-h-[calc(100vh-9.5rem)] lg:overflow-y-auto"
                )}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/95 px-3 py-2 backdrop-blur">
                  <p className="text-xs text-zinc-400">
                    Live preview <span className="text-zinc-600">· how readers see it on niatinsider.com, including unsaved edits</span>
                  </p>
                  <div role="group" aria-label="Preview width" className="flex shrink-0 rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                    {([
                      { d: "desktop", label: "Desktop", icon: Monitor },
                      { d: "mobile", label: "Mobile", icon: Smartphone },
                    ] as const).map(({ d, label, icon: Icon }) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={device === d}
                        title={label}
                        onClick={() => setDevice(d)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-1 text-xs",
                          device === d ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden 2xl:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-200 p-3 sm:p-5">
                  <ArticlePreview
                    device={device}
                    article={{
                      title: deferredValues.title,
                      body: deferredValues.body,
                      excerpt: deferredValues.excerpt,
                      category: deferredValues.category,
                      campusName: article.campus_name,
                      isGlobalGuide: article.is_global_guide,
                      authorUsername: article.author_username || article.author?.username,
                      status: deferredValues.status,
                      rejectionReason: deferredValues.rejection_reason,
                      coverImage: deferredValues.cover_image,
                      images: deferredValues.images,
                      updatedAt: article.updated_at,
                      upvoteCount: article.upvote_count,
                      viewCount: article.view_count,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Settings sidebar */}
          <aside
            className={cn(
              "min-w-0 space-y-4",
              !sidebarOpen && "xl:hidden",
              "xl:sticky xl:top-[8.5rem] xl:max-h-[calc(100vh-9.5rem)] xl:overflow-y-auto xl:pr-1"
            )}
          >
            <div role="tablist" aria-label="Article settings" className="flex gap-1 border-b border-zinc-800">
              {([
                { id: "settings", label: "Settings" },
                { id: "seo", label: "SEO" },
                { id: "checks", label: "Checks", badge: openChecks },
                { id: "ai", label: "AI review" },
              ] as { id: SideTab; label: string; badge?: number }[]).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                    tab === t.id ? "border-[#991b1b] text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  {t.label}
                  {t.badge ? (
                    <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold tabular-nums text-amber-300">{t.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>

            {tab === "settings" && (
              <div className="space-y-4">
                <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-sm font-semibold text-white">Publishing</h3>
                  <div role="radiogroup" aria-label="Status" className="grid grid-cols-4 gap-1 rounded-lg bg-zinc-800 p-1">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={status === opt.value}
                        onClick={() => setField("status", opt.value)}
                        className={cn(
                          "rounded-md px-1 py-1.5 text-xs font-medium transition-colors",
                          status === opt.value ? opt.active : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {status !== savedStatus && (
                    <p className="text-xs text-zinc-400">
                      Status changes from <span className="capitalize">{savedStatus.replace("_", " ")}</span> to{" "}
                      <span className="capitalize text-white">{status.replace("_", " ")}</span> when you save.
                    </p>
                  )}
                  {status === "rejected" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rejection_reason" className="text-zinc-300">Rejection reason</Label>
                      <Textarea
                        id="rejection_reason"
                        {...form.register("rejection_reason")}
                        rows={3}
                        placeholder="Tell the author what to fix…"
                        className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2.5">
                    <Label htmlFor="featured" className="flex items-center gap-2 text-zinc-200">
                      <Star className="h-4 w-4 text-[#ef4444]" />
                      Featured
                    </Label>
                    <Switch id="featured" checked={values.featured} onCheckedChange={(v) => setField("featured", v)} />
                  </div>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-500">Author</dt>
                      <dd className="truncate text-right text-zinc-300">{article.author_username || article.author?.username || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-500">Campus</dt>
                      <dd className="truncate text-right text-zinc-300">{article.campus_name || "Global"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-500">Reviewed by</dt>
                      <dd className="truncate text-right text-zinc-300">
                        {article.reviewed_by?.username ?? "Not reviewed yet"}
                        {article.reviewed_at ? ` · ${formatTime(article.reviewed_at)}` : ""}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-500">Last updated</dt>
                      <dd className="text-right text-zinc-300">{formatTime(article.updated_at)}</dd>
                    </div>
                  </dl>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Saving as Published or Rejected makes you the reviewer.
                  </p>
                </section>

                <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-sm font-semibold text-white">Organise</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-zinc-300">Category</Label>
                    <select id="category" {...form.register("category")} className={SELECT_CLASS}>
                      {!category && <option value="">Choose a category</option>}
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && <p className="text-sm text-red-400">{errors.category.message}</p>}
                  </div>
                  {subcategories.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="subcategory" className="text-zinc-300">Subcategory</Label>
                      <select id="subcategory" {...form.register("subcategory")} className={SELECT_CLASS}>
                        <option value="">None</option>
                        {subcategories.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {subcategories.find((s) => s.slug === values.subcategory && s.requires_other) && (
                    <div className="space-y-1.5">
                      <Label htmlFor="subcategory_other" className="text-zinc-300">Subcategory (other)</Label>
                      <Input id="subcategory_other" {...form.register("subcategory_other")} className="border-zinc-700 bg-zinc-800 text-white" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="topic" className="text-zinc-300">Topic (optional)</Label>
                    <Input
                      id="topic"
                      {...form.register("topic")}
                      placeholder="e.g. Placements, Internships"
                      className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </section>

                {savedStatus !== "published" && (
                  <Link
                    href={`/articles/${articleId}/preview`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open saved version in full-page preview
                  </Link>
                )}
              </div>
            )}

            {tab === "seo" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <SeoPanel form={form} />
              </div>
            )}

            {tab === "checks" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <ChecksPanel checks={checks} stats={stats} />
              </div>
            )}

            {tab === "ai" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <AIReviewPanel
                  feedback={article.ai_feedback}
                  reviewedAt={article.ai_reviewed_at ?? null}
                  articleId={articleId}
                  currentStatus={status}
                  onStatusChange={(_id, next, reason) => {
                    setField("status", next as ArticleStatus);
                    if (reason) setField("rejection_reason", reason);
                    setTab("settings");
                    toast({ title: "Status changed", description: "Save to apply it." });
                  }}
                />
              </div>
            )}
          </aside>
        </div>
      </form>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your unsaved changes stay in this browser and will be offered back next time you open this article.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={goBack} className="bg-[#991b1b] text-white hover:bg-[#7f1d1d]">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
