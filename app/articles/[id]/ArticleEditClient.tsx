"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Upload, X, Star } from "lucide-react";
import { useArticle, useUpdateArticle } from "@/hooks/useArticles";
import { useGoBack } from "@/hooks/useGoBack";
import { useToast } from "@/hooks/useToast";
import { uploadArticleImage, getSubcategories } from "@/lib/api/articles";
import type { SubcategoryOption } from "@/lib/api/articles";
import { articleEditSchema, type ArticleEditFormValues } from "@/lib/schemas/article";
import { RichTextEditor } from "@/components/articles/RichTextEditor";
import { AdminProfileSection } from "@/components/layout/AdminProfileSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORY_OPTIONS = [
  { value: "onboarding-kit", label: "Onboarding Kit" },
  { value: "survival-food", label: "Survival & Food" },
  { value: "club-directory", label: "Club Directory" },
  { value: "career-wins", label: "Career & Wins" },
  { value: "local-travel", label: "Local Travel" },
  { value: "amenities", label: "Amenities" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
] as const;

type ArticleEditClientProps = {
  articleId: string;
};

export function ArticleEditClient({ articleId }: ArticleEditClientProps) {
  const goBack = useGoBack("/articles");
  const { data: article, isLoading, isError, error } = useArticle(articleId);
  const updateMutation = useUpdateArticle();
  const { toast } = useToast();
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      category: "onboarding-kit",
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

  const category = form.watch("category");
  const status = form.watch("status");
  const metaKeywords = form.watch("meta_keywords") ?? [];
  const images = form.watch("images") ?? [];
  const cover_image = form.watch("cover_image") ?? "";

  // Sync form when article loads
  useEffect(() => {
    if (!article) return;
    form.reset({
      slug: article.slug || "",
      title: article.title,
      body: article.body || "",
      excerpt: article.excerpt || "",
      status: article.status,
      rejection_reason: article.rejection_reason || "",
      featured: article.featured ?? false,
      category: article.category as ArticleEditFormValues["category"],
      subcategory: article.subcategory || "",
      subcategory_other: article.subcategory_other || "",
      meta_title: article.meta_title || "",
      meta_description: article.meta_description || "",
      meta_keywords: article.meta_keywords ?? [],
      topic: article.topic || "",
      cover_image: article.cover_image || "",
      images: article.images ?? [],
    });
  }, [article, form]);

  // Fetch subcategories when category changes
  useEffect(() => {
    let cancelled = false;
    getSubcategories(category).then((list) => {
      if (!cancelled) setSubcategories(list);
    });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const onSubmit = async (values: ArticleEditFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id: articleId,
        data: {
          slug: values.slug,
          title: values.title,
          body: values.body,
          excerpt: values.excerpt ?? "",
          status: values.status,
          rejection_reason: values.rejection_reason ?? "",
          featured: values.featured,
          category: values.category,
          subcategory: values.subcategory ?? "",
          subcategory_other: values.subcategory_other ?? "",
          meta_title: values.meta_title ?? "",
          meta_description: values.meta_description ?? "",
          meta_keywords: values.meta_keywords ?? [],
          topic: values.topic ?? "",
          cover_image: values.cover_image ?? "",
          images: values.images ?? [],
        },
      });
      toast({ title: "Article saved" });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      const msg = ax.response?.data?.detail ?? "Failed to save article";
      toast({
        title: "Error",
        description: typeof msg === "string" ? msg : "Failed to save article",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    e.target.value = "";
    try {
      const { url } = await uploadArticleImage(file);
      const current = form.getValues("images") ?? [];
      const next = [...current, url];
      form.setValue("images", next);
      if (!form.getValues("cover_image")) form.setValue("cover_image", url);
      toast({ title: "Image uploaded" });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        title: "Upload failed",
        description: ax.response?.data?.error ?? "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    const current = form.getValues("images") ?? [];
    const next = current.filter((u) => u !== url);
    form.setValue("images", next);
    if (cover_image === url)
      form.setValue("cover_image", next[0] ?? "");
  };

  const setCover = (url: string) => {
    form.setValue("cover_image", url);
  };

  if (isLoading || !article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
        <p className="text-white">Failed to load article</p>
        <p className="text-sm text-zinc-500">{(error as Error)?.message}</p>
        <Button variant="outline" onClick={goBack}>Back to Articles</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Articles
          </button>
          <AdminProfileSection />
        </div>

        {article && (
          <Card className="mb-6 border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-base text-white">Reviewer Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-zinc-300">
                <span className="text-zinc-400">Current reviewer:</span>{" "}
                {article.reviewed_by?.username
                  ? `${article.reviewed_by.username}${article.reviewed_by.email ? ` (${article.reviewed_by.email})` : ""}`
                  : "Not reviewed yet"}
              </p>
              <p className="text-zinc-300">
                <span className="text-zinc-400">Reviewed at:</span>{" "}
                {article.reviewed_at
                  ? new Date(article.reviewed_at).toLocaleString()
                  : "—"}
              </p>
              <p className="text-zinc-500">
                When status is set to <strong>Published</strong> or <strong>Rejected</strong>, reviewer is auto-assigned to the currently logged-in admin.
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white">Edit Article</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-zinc-200">
                  Slug
                </Label>
                <Input
                  id="slug"
                  {...form.register("slug")}
                  className="border-zinc-700 bg-zinc-800 text-white"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-200">
                  Title
                </Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  className="border-zinc-700 bg-zinc-800 text-white"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label className="text-zinc-200">Body</Label>
                <RichTextEditor
                  value={form.watch("body")}
                  onChange={(html) => form.setValue("body", html)}
                  className="border-zinc-700"
                />
                {form.formState.errors.body && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.body.message}
                  </p>
                )}
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt" className="text-zinc-200">
                  Excerpt
                </Label>
                <Textarea
                  id="excerpt"
                  {...form.register("excerpt")}
                  rows={3}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* SEO metadata */}
              <div className="space-y-2">
                <Label htmlFor="meta_title" className="text-zinc-200">
                  Meta title
                </Label>
                <Input
                  id="meta_title"
                  {...form.register("meta_title")}
                  className="border-zinc-700 bg-zinc-800 text-white"
                  placeholder="SEO title for search engines"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description" className="text-zinc-200">
                  Meta description
                </Label>
                <Textarea
                  id="meta_description"
                  {...form.register("meta_description")}
                  rows={3}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  placeholder="SEO description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_keywords" className="text-zinc-200">
                  Meta keywords
                </Label>
                <Input
                  id="meta_keywords"
                  value={metaKeywords.join(", ")}
                  onChange={(e) => {
                    const keywords = e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean);
                    form.setValue("meta_keywords", keywords);
                  }}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-zinc-200">
                  Status
                </Label>
                <select
                  id="status"
                  {...form.register("status")}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rejection reason (when rejected) */}
              {status === "rejected" && (
                <div className="space-y-2">
                  <Label htmlFor="rejection_reason" className="text-zinc-200">
                    Rejection reason
                  </Label>
                  <Textarea
                    id="rejection_reason"
                    {...form.register("rejection_reason")}
                    rows={2}
                    placeholder="Explain why this article was rejected…"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  />
                </div>
              )}

              {/* Featured */}
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#991b1b]" />
                  <Label htmlFor="featured" className="text-zinc-200">
                    Featured
                  </Label>
                </div>
                <Switch
                  id="featured"
                  checked={form.watch("featured")}
                  onCheckedChange={(v) => form.setValue("featured", v)}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-zinc-200">
                  Category
                </Label>
                <select
                  id="category"
                  {...form.register("category")}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              {subcategories.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory" className="text-zinc-200">
                      Subcategory
                    </Label>
                    <select
                      id="subcategory"
                      {...form.register("subcategory")}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                    >
                      <option value="">— None —</option>
                      {subcategories.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {subcategories.find(
                    (s) => s.slug === form.watch("subcategory") && s.requires_other
                  ) && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory_other" className="text-zinc-200">
                        Subcategory (other)
                      </Label>
                      <Input
                        id="subcategory_other"
                        {...form.register("subcategory_other")}
                        className="border-zinc-700 bg-zinc-800 text-white"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Topic (optional, for guides) */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-zinc-200">
                  Topic (optional)
                </Label>
                <Input
                  id="topic"
                  {...form.register("topic")}
                  placeholder="e.g. Placements, Internships"
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-200">Images</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload image
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {images.map((url) => (
                    <div
                      key={url}
                      className="relative rounded-lg border border-zinc-700 bg-zinc-800 overflow-hidden"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-24 w-24 object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={() => setCover(url)}
                          title="Set as cover"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              cover_image === url ? "fill-[#991b1b] text-[#991b1b]" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-red-500/80"
                          onClick={() => removeImage(url)}
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {cover_image === url && (
                        <span className="absolute bottom-1 left-1 rounded bg-[#991b1b] px-1.5 py-0.5 text-xs text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-[#991b1b] text-white hover:bg-[#7f1d1d]"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 text-zinc-300"
              onClick={goBack}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
