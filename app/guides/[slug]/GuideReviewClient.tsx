"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  ShieldAlert,
  Undo2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GuideReasonDialog } from "@/components/guides/GuideReasonDialog";
import { GuideStatusBadge } from "@/components/guides/GuideStatusBadge";
import styles from "@/components/articles/ArticlePreview.module.css";
import { useToast } from "@/hooks/useToast";
import { useAdminGuide, useAdminRole, usePublicGuideCategories } from "@/hooks/useGuides";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { PUBLIC_SITE_URL } from "@/lib/articleBody";
import { editGuide, getAdminGuides, publishGuide, rejectGuide, takedownGuide } from "@/lib/api/guides";
import type { EditGuidePayload } from "@/lib/api/guides";
import {
  GUIDE_STATUS_LABEL,
  REJECT_TEMPLATES,
  REVIEW_CHECKLIST,
  TAKEDOWN_TEMPLATES,
  formatGuideDate,
  guideChecks,
  guidePreviewUrl,
  guidePublicUrl,
  waitingFor,
} from "@/lib/guideReview";
import { cn } from "@/lib/utils";
import type { AdminGuideDetail } from "@/types/guide";

type Dialog = "reject" | "takedown" | null;

function GuideBody({ guide }: { guide: AdminGuideDetail }) {
  const sections = guide.sections.filter((s) => s.body.trim());
  return (
    <article className={cn(styles.page, "overflow-hidden rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]")}>
      <div className="px-6 py-8 sm:px-10">
        <p className="mb-3 text-sm font-medium text-[#991b1b]">{guide.category.name}</p>
        <h1 className={cn(styles.display, "text-3xl font-bold leading-tight text-black")}>{guide.title || "Untitled guide"}</h1>
        {guide.achievement && (
          <p className="mt-4 rounded-lg bg-[#991b1b]/[0.06] px-4 py-3 text-lg font-semibold text-[#7f1d1d]">
            {guide.achievement}
          </p>
        )}
        {guide.summary && <p className="mt-4 text-base leading-relaxed text-[#334155]">{guide.summary}</p>}
        {guide.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={guide.cover_image} alt="" className="mt-6 w-full rounded-lg object-cover" />
        )}
        <div className={cn(styles.body, "mt-8")}>
          {sections.length === 0 && <p>No answers written yet.</p>}
          {sections.map((s, i) => (
            <section
              key={`${s.kind}-${s.prompt_id ?? i}`}
              className={cn(s.kind === "wish_i_knew" && "my-6 rounded-lg border-l-4 border-[#991b1b] bg-[#fef2f2] px-5 py-1")}
            >
              <h2>{s.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: s.body }} />
            </section>
          ))}
          {guide.resources.length > 0 && (
            <section>
              <h2>Resources</h2>
              <ul>
                {guide.resources.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer nofollow">
                      {r.label}
                    </a>
                    {r.note ? ` (${r.note})` : ""} <span className="text-xs text-[#64748b]">{r.url}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-white/10 bg-zinc-900/60 p-4", className)}>
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function EditDetails({ guide, onSaved }: { guide: AdminGuideDetail; onSaved: (g: AdminGuideDetail) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: guide.title,
    achievement: guide.achievement,
    summary: guide.summary,
    meta_title: guide.meta_title,
    meta_description: guide.meta_description,
  });
  const [saving, setSaving] = useState(false);
  const changed = (Object.keys(form) as (keyof typeof form)[]).filter((k) => form[k] !== guide[k]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: EditGuidePayload = Object.fromEntries(changed.map((k) => [k, form[k].trim()]));
      const updated = await editGuide(guide.slug, payload);
      onSaved(updated);
      toast({
        title: "Changes saved",
        description: guide.status === "published" ? "The live page updates within a few minutes." : undefined,
      });
    } catch (err) {
      toast({ title: "Couldn't save", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, max: number, multiline = false) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label htmlFor={`edit-${key}`} className="text-xs text-zinc-300">
          {label}
        </Label>
        <span className={cn("text-xs tabular-nums", form[key].length > max ? "text-red-400" : "text-zinc-500")}>
          {form[key].length}/{max}
        </span>
      </div>
      {multiline ? (
        <Textarea
          id={`edit-${key}`}
          value={form[key]}
          rows={3}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="border-zinc-700 bg-zinc-800 text-sm"
        />
      ) : (
        <Input
          id={`edit-${key}`}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="h-9 border-zinc-700 bg-zinc-800 text-sm"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Fix typos or a vague line without sending it back. Keep the student&apos;s words; this never changes the
        status.
      </p>
      {field("title", "Title", 200)}
      {field("achievement", "Achievement", 160)}
      {field("summary", "Summary", 300, true)}
      {field("meta_title", "Search title (blank uses the title)", 60)}
      {field("meta_description", "Search description (blank uses the summary)", 160, true)}
      <Button size="sm" disabled={saving || changed.length === 0} onClick={save} className="w-full">
        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Save changes
      </Button>
    </div>
  );
}

export function GuideReviewClient({ slug }: { slug: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const role = useAdminRole();
  const { data: guide, isLoading, error } = useAdminGuide(slug);
  const { data: categories } = usePublicGuideCategories();
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const categorySlug = guide?.category.slug;
  const requiredPromptIds = useMemo(() => {
    const category = categories?.find((c) => c.slug === categorySlug);
    return category ? new Set(category.prompts.filter((p) => p.is_required).map((p) => p.id)) : undefined;
  }, [categories, categorySlug]);
  const checks = useMemo(() => (guide ? guideChecks(guide, requiredPromptIds) : []), [guide, requiredPromptIds]);

  const setGuide = (updated: AdminGuideDetail) => {
    queryClient.setQueryData(["guide", slug], updated);
    queryClient.invalidateQueries({ queryKey: ["guides"] });
  };

  /** After a decision on a pending guide, go straight to the next one waiting. */
  const openNext = async (doneTitle: string) => {
    try {
      const next = await getAdminGuides({ status: "pending", ordering: "submitted_at", page_size: 2 });
      const candidate = next.results.find((g) => g.slug !== slug);
      if (candidate) {
        toast({ title: doneTitle, description: "Opening the next guide waiting for review." });
        router.push(`/guides/${encodeURIComponent(candidate.slug)}`);
        return;
      }
    } catch {
      // Fall through to the queue.
    }
    toast({ title: doneTitle, description: "That was the last one waiting." });
    router.push("/guides");
  };

  const run = async (action: () => Promise<AdminGuideDetail>, doneTitle: string, goNext: boolean) => {
    setBusy(true);
    try {
      const updated = await action();
      setGuide(updated);
      setDialog(null);
      if (goNext) await openNext(doneTitle);
      else toast({ title: doneTitle });
    } catch (err) {
      toast({ title: "That didn't work", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex items-center gap-2 p-10 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading guide…
      </main>
    );
  }
  if (error || !guide) {
    return (
      <main className="mx-auto max-w-3xl p-10">
        <p className="text-sm text-red-300" role="alert">
          {apiErrorMessage(error, "Couldn't load this guide.")}
        </p>
        <Link href="/guides" className="mt-4 inline-block text-sm text-rose-300 hover:underline">
          Back to guides
        </Link>
      </main>
    );
  }

  const isPending = guide.status === "pending";
  const rulesOk = checks.every((c) => c.ok);
  const allTicked = ticked.size === REVIEW_CHECKLIST.length;
  const waited = isPending ? waitingFor(guide.submitted_at) : null;
  const siteUrl = guide.status === "published" ? guidePublicUrl(guide) : guidePreviewUrl(guide.slug);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Guides
        </Link>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          {guide.status === "published" ? "View on the site" : "Preview on the site"}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <GuideBody guide={guide} />

        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4">
          <Panel title="Decision">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <GuideStatusBadge status={guide.status} />
              {waited && <span>Waiting {waited}</span>}
              {guide.status === "published" && (
                <span>
                  {guide.view_count} reads, {guide.upvote_count} found it helpful
                </span>
              )}
            </div>

            {guide.status === "rejected" && guide.rejection_reason && (
              <p className="mb-3 rounded-md bg-red-500/5 p-2 text-xs text-red-300">Sent back: {guide.rejection_reason}</p>
            )}
            {guide.status === "taken_down" && guide.takedown_reason && (
              <p className="mb-3 rounded-md bg-white/5 p-2 text-xs text-zinc-300">Taken down: {guide.takedown_reason}</p>
            )}

            {isPending && (
              <div className="space-y-2">
                {!rulesOk && (
                  <p className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-300">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    Some writing rules aren&apos;t met (see below). The site checked them on submit, so this usually
                    means the rules changed since.
                  </p>
                )}
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={busy || !allTicked}
                  onClick={() => run(() => publishGuide(guide.slug), "Guide published", true)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {allTicked ? "Publish" : `Tick the checklist to publish (${ticked.size}/${REVIEW_CHECKLIST.length})`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-300 hover:bg-red-500/10"
                  disabled={busy}
                  onClick={() => setDialog("reject")}
                >
                  <Undo2 className="mr-1.5 h-4 w-4" />
                  Send back with feedback
                </Button>
              </div>
            )}
            {guide.status === "published" && (
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                  <span>
                    Featured
                    <span className="block text-xs text-zinc-500">Top of the guides page, “Stories worth starting with”.</span>
                  </span>
                  <Switch
                    checked={guide.featured}
                    disabled={busy}
                    onCheckedChange={(v) =>
                      run(() => editGuide(guide.slug, { featured: v }), v ? "Featured" : "Removed from featured", false)
                    }
                  />
                </label>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-300 hover:bg-red-500/10"
                  disabled={busy}
                  onClick={() => setDialog("takedown")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Take down
                </Button>
              </div>
            )}
            {guide.status === "taken_down" &&
              (role === "admin" ? (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() => run(() => publishGuide(guide.slug), "Guide restored", false)}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Restore to the site
                </Button>
              ) : (
                <p className="text-xs text-zinc-500">Only admins can restore a taken-down guide.</p>
              ))}
            {(guide.status === "draft" || guide.status === "rejected") && (
              <p className="text-xs text-zinc-500">
                Nothing to decide yet. It comes back to the review queue when the author submits it.
              </p>
            )}
          </Panel>

          {isPending && (
            <Panel title="Before you publish">
              <ul className="space-y-3">
                {REVIEW_CHECKLIST.map((item, i) => (
                  <li key={item.title}>
                    <label className="flex cursor-pointer gap-2.5">
                      <Checkbox
                        className="mt-0.5"
                        checked={ticked.has(i)}
                        onCheckedChange={(v) =>
                          setTicked((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(i);
                            else next.delete(i);
                            return next;
                          })
                        }
                      />
                      <span>
                        <span className="block text-sm text-zinc-200">{item.title}</span>
                        <span className="block text-xs text-zinc-500">{item.hint}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-zinc-500">
                Not sure about the achievement? Contact the author below before publishing.
              </p>
            </Panel>
          )}

          <Panel title="Writing rules">
            <ul className="space-y-1.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <span className="text-zinc-300">
                    {c.label} <span className="text-xs text-zinc-500">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Author">
            <p className="text-sm text-white">{guide.author.username}</p>
            <p className="text-xs text-zinc-500">
              {guide.author.role.replace(/_/g, " ")}
              {guide.campus_name ? `, ${guide.campus_name}` : ""}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              {guide.author.email && (
                <a href={`mailto:${guide.author.email}`} className="flex items-center gap-1.5 text-zinc-300 hover:text-white">
                  <Mail className="h-3.5 w-3.5" /> {guide.author.email}
                </a>
              )}
              {guide.author.phone_number && (
                <a href={`tel:${guide.author.phone_number}`} className="flex items-center gap-1.5 text-zinc-300 hover:text-white">
                  <Phone className="h-3.5 w-3.5" /> {guide.author.phone_number}
                </a>
              )}
              {guide.author.profile_slug && (
                <a
                  href={`${PUBLIC_SITE_URL}/author/${guide.author.profile_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Profile on the site
                </a>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-600">Contact details are for verifying the guide only.</p>
          </Panel>

          <Panel title="Edit details">
            {editing ? (
              <EditDetails guide={guide} onSaved={(g) => { setGuide(g); setEditing(false); }} />
            ) : (
              <Button size="sm" variant="outline" className="w-full border-zinc-700" onClick={() => setEditing(true)}>
                Edit title, achievement, summary or search text
              </Button>
            )}
          </Panel>

          <Panel title="History">
            {guide.history.length === 0 ? (
              <p className="text-xs text-zinc-500">No status changes yet.</p>
            ) : (
              <ol className="space-y-2.5 border-l border-white/10 pl-3">
                {[...guide.history].reverse().map((h, i) => (
                  <li key={`${h.created_at}-${i}`} className="text-xs">
                    <p className="text-zinc-200">
                      {h.from_status ? `${GUIDE_STATUS_LABEL[h.from_status]} → ` : ""}
                      {GUIDE_STATUS_LABEL[h.to_status]}
                    </p>
                    <p className="text-zinc-500">
                      {formatGuideDate(h.created_at)}
                      {h.actor ? ` by ${h.actor.username}` : ""}
                    </p>
                    {h.reason && <p className="mt-0.5 text-zinc-400">“{h.reason}”</p>}
                  </li>
                ))}
              </ol>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-zinc-500">
              <dt>Created</dt>
              <dd className="text-zinc-400">{formatGuideDate(guide.created_at)}</dd>
              <dt>Submitted</dt>
              <dd className="text-zinc-400">{formatGuideDate(guide.submitted_at)}</dd>
              <dt>Published</dt>
              <dd className="text-zinc-400">{formatGuideDate(guide.published_at)}</dd>
              {guide.reviewed_by && (
                <>
                  <dt>Last reviewed by</dt>
                  <dd className="text-zinc-400">{guide.reviewed_by.username}</dd>
                </>
              )}
            </dl>
          </Panel>
        </aside>
      </div>

      <GuideReasonDialog
        open={dialog === "reject"}
        onOpenChange={(o) => setDialog(o ? "reject" : null)}
        title="Send back with feedback"
        description="The author sees this on their My guides page, edits the guide and submits it again."
        confirmLabel="Send back"
        templates={REJECT_TEMPLATES}
        busy={busy}
        onConfirm={(reason) => run(() => rejectGuide(guide.slug, reason), "Sent back to the author", true)}
      />
      <GuideReasonDialog
        open={dialog === "takedown"}
        onOpenChange={(o) => setDialog(o ? "takedown" : null)}
        title="Take down this guide"
        description="It leaves the site straight away. Only an admin can restore it."
        confirmLabel="Take down"
        templates={TAKEDOWN_TEMPLATES}
        busy={busy}
        onConfirm={(reason) => run(() => takedownGuide(guide.slug, reason), "Guide taken down", false)}
      />
    </main>
  );
}
