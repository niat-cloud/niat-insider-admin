"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import {
  createGuidePrompt,
  getGuideCategories,
  updateGuideCategory,
  updateGuidePrompt,
} from "@/lib/api/guides";
import type { EditCategoryPayload, PromptPayload } from "@/lib/api/guides";
import { cn } from "@/lib/utils";
import type { AdminGuideCategory, AdminGuidePrompt } from "@/types/guide";

const CATEGORIES_KEY = ["guide-categories", "admin"];

function PromptRow({ prompt, onSave }: { prompt: AdminGuidePrompt; onSave: (p: PromptPayload) => Promise<void> }) {
  const [question, setQuestion] = useState(prompt.question);
  const [helpText, setHelpText] = useState(prompt.help_text);
  const [saving, setSaving] = useState(false);
  const dirty = question !== prompt.question || helpText !== prompt.help_text;

  const save = async (payload: PromptPayload) => {
    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={cn("space-y-2 rounded-lg border border-white/10 p-3", !prompt.is_active && "opacity-60")}>
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="h-9 border-zinc-700 bg-zinc-800 text-sm"
        aria-label="Question"
      />
      <Input
        value={helpText}
        onChange={(e) => setHelpText(e.target.value)}
        placeholder="Hint shown under the question (optional)"
        className="h-8 border-zinc-800 bg-zinc-900 text-xs"
        aria-label="Hint"
      />
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
        <label className="flex items-center gap-2">
          <Switch checked={prompt.is_required} disabled={saving} onCheckedChange={(v) => save({ is_required: v })} />
          Required
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={prompt.is_active} disabled={saving} onCheckedChange={(v) => save({ is_active: v })} />
          Shown to writers
        </label>
        {dirty && (
          <Button
            size="sm"
            className="ml-auto h-7"
            disabled={saving || question.trim().length === 0}
            onClick={() => save({ question: question.trim(), help_text: helpText.trim() })}
          >
            Save question
          </Button>
        )}
      </div>
    </li>
  );
}

function CategoryCard({ category }: { category: AdminGuideCategory }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tagline: category.tagline,
    description: category.description,
    wish_i_knew_hint: category.wish_i_knew_hint,
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== category[k]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });

  const saveCategory = async (payload: EditCategoryPayload, done: string) => {
    setBusy(true);
    try {
      await updateGuideCategory(category.slug, payload);
      toast({ title: done });
      refresh();
    } catch (err) {
      toast({ title: "Couldn't save", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const savePrompt = async (id: string, payload: PromptPayload) => {
    try {
      await updateGuidePrompt(id, payload);
      toast({ title: "Question saved", description: "Writers see it the next time they open the editor." });
      refresh();
    } catch (err) {
      toast({ title: "Couldn't save", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    }
  };

  const addPrompt = async () => {
    setBusy(true);
    try {
      const order = Math.max(0, ...category.prompts.map((p) => p.order)) + 1;
      await createGuidePrompt({ category: category.slug, question: newQuestion.trim(), order, is_required: false });
      setNewQuestion("");
      toast({ title: "Question added" });
      refresh();
    } catch (err) {
      toast({ title: "Couldn't add", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={cn("rounded-xl border border-white/10 bg-zinc-900/50", !category.is_active && "opacity-70")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">
            {category.name}
            {category.group && <span className="ml-2 text-xs font-normal text-zinc-500">{category.group}</span>}
          </p>
          <p className="truncate text-xs text-zinc-400">{category.tagline}</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
          {category.published_count} live of {category.guide_count}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-white/10 px-4 py-4">
          <label className="flex items-center justify-between gap-3 text-sm text-zinc-200">
            <span>
              Accepting new guides
              <span className="block text-xs text-zinc-500">
                Turning this off hides it from the editor. Guides already written stay live.
              </span>
            </span>
            <Switch
              checked={category.is_active}
              disabled={busy}
              onCheckedChange={(v) => saveCategory({ is_active: v }, v ? "Category opened" : "Category closed")}
            />
          </label>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Tagline</Label>
              <Input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="h-9 border-zinc-700 bg-zinc-800 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Description</Label>
              <Textarea
                value={form.description}
                rows={2}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border-zinc-700 bg-zinc-800 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">“What I wish I knew” hint</Label>
              <Textarea
                value={form.wish_i_knew_hint}
                rows={2}
                onChange={(e) => setForm({ ...form, wish_i_knew_hint: e.target.value })}
                className="border-zinc-700 bg-zinc-800 text-sm"
              />
            </div>
            {dirty && (
              <Button size="sm" className="w-fit" disabled={busy} onClick={() => saveCategory(form, "Category saved")}>
                Save category
              </Button>
            )}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-white">Questions writers answer</h3>
            <p className="mb-3 text-xs text-zinc-500">
              Required questions need 150+ characters before a guide can be submitted. Hide a question instead of
              deleting it: guides that already answered it keep the answer.
            </p>
            <ul className="space-y-2">
              {category.prompts.map((p) => (
                <PromptRow key={p.id} prompt={p} onSave={(payload) => savePrompt(p.id, payload)} />
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add a question, e.g. How did you prepare for the interview?"
                className="h-9 border-zinc-700 bg-zinc-800 text-sm"
              />
              <Button size="sm" disabled={busy || newQuestion.trim().length < 5} onClick={addPrompt}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function GuideCategoriesClient() {
  const { data, isLoading, error } = useQuery({ queryKey: CATEGORIES_KEY, queryFn: getGuideCategories });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <Link href="/guides" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Guides
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-white">Categories and questions</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-400">
        What writers pick from and the questions each guide answers. Changes show on the site&apos;s guides pages and
        in the writing flow.
      </p>
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : error ? (
        <p className="text-sm text-red-300" role="alert">
          {apiErrorMessage(error, "Couldn't load categories.")} Only admins can edit categories.
        </p>
      ) : (
        <ul className="space-y-3">
          {data?.map((c) => <CategoryCard key={c.id} category={c} />)}
        </ul>
      )}
    </main>
  );
}
