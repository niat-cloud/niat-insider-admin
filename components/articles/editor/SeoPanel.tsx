"use client";

import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PUBLIC_SITE_URL } from "@/lib/articleBody";
import { META_DESCRIPTION_RANGE, META_TITLE_RANGE } from "@/lib/articleChecks";
import type { ArticleEditFormValues } from "@/lib/schemas/article";
import { KeywordsInput } from "./KeywordsInput";
import { LengthMeter } from "./LengthMeter";

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

type SeoPanelProps = {
  form: UseFormReturn<ArticleEditFormValues>;
};

export function SeoPanel({ form }: SeoPanelProps) {
  const title = form.watch("title") ?? "";
  const slug = form.watch("slug") ?? "";
  const excerpt = form.watch("excerpt") ?? "";
  const metaTitle = form.watch("meta_title") ?? "";
  const metaDescription = form.watch("meta_description") ?? "";
  const keywords = form.watch("meta_keywords") ?? [];

  const shownTitle = metaTitle.trim() || title.trim() || "Untitled article";
  const shownDescription = metaDescription.trim() || excerpt.trim() || "No description. Google will pick text from the page.";
  const host = PUBLIC_SITE_URL.replace(/^https?:\/\//, "");
  const set = (name: "meta_title" | "meta_description", v: string) =>
    form.setValue(name, v, { shouldDirty: true, shouldValidate: true });

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Google result preview</p>
        <div className="rounded-lg bg-white px-4 py-3 font-[arial,sans-serif]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f3f4] text-[10px] font-bold text-[#991b1b]">N</span>
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] text-[#202124]">NIAT Insider</p>
              <p className="truncate text-[12px] text-[#4d5156]">
                {host} › article › {slug || "slug"}
              </p>
            </div>
          </div>
          <p className="mt-1.5 text-[18px] leading-snug text-[#1a0dab]">{truncate(shownTitle, 62)}</p>
          <p className="mt-0.5 text-[13px] leading-[1.45] text-[#4d5156]">{truncate(shownDescription, 160)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="meta_title" className="text-zinc-200">Meta title</Label>
          {title && metaTitle !== title && (
            <button type="button" onClick={() => set("meta_title", title)} className="text-xs text-zinc-400 hover:text-white">
              Use article title
            </button>
          )}
        </div>
        <Input
          id="meta_title"
          {...form.register("meta_title")}
          placeholder="Shown as the blue link in Google"
          className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
        />
        <LengthMeter length={metaTitle.trim().length} min={META_TITLE_RANGE.min} max={META_TITLE_RANGE.max} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="meta_description" className="text-zinc-200">Meta description</Label>
          {excerpt && metaDescription !== excerpt && (
            <button type="button" onClick={() => set("meta_description", excerpt)} className="text-xs text-zinc-400 hover:text-white">
              Use excerpt
            </button>
          )}
        </div>
        <Textarea
          id="meta_description"
          {...form.register("meta_description")}
          rows={4}
          placeholder="One or two sentences that make someone want to click"
          className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
        />
        <LengthMeter length={metaDescription.trim().length} min={META_DESCRIPTION_RANGE.min} max={META_DESCRIPTION_RANGE.max} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta_keywords" className="text-zinc-200">Meta keywords</Label>
        <KeywordsInput
          id="meta_keywords"
          value={keywords}
          onChange={(next) => form.setValue("meta_keywords", next, { shouldDirty: true })}
        />
        <p className="text-[11px] text-zinc-500">{keywords.length} keyword{keywords.length === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}
