"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArticleEditFormValues } from "@/lib/schemas/article";

type StoredDraft = {
  values: ArticleEditFormValues;
  savedAt: string;
  /** The article's `updated_at` when the draft was written. */
  baseUpdatedAt: string;
};

const keyFor = (articleId: string) => `niat-admin:article-draft:${articleId}`;

function read(articleId: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(articleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    return parsed && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Keeps a copy of unsaved edits in this browser so a closed tab, crash or
 * expired session doesn't lose them. The draft is offered back when the
 * article is opened again, and cleared on save or discard.
 */
export function useArticleDraft(articleId: string) {
  const [pending, setPending] = useState<StoredDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Call once the server article has loaded; offers the stored draft if it differs from the server copy. */
  const check = useCallback(
    (server: ArticleEditFormValues) => {
      const draft = read(articleId);
      if (!draft) return;
      if (JSON.stringify(draft.values) === JSON.stringify(server)) {
        try {
          localStorage.removeItem(keyFor(articleId));
        } catch {
          /* storage unavailable */
        }
        return;
      }
      setPending(draft);
    },
    [articleId]
  );

  const save = useCallback(
    (values: ArticleEditFormValues, baseUpdatedAt: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          const draft: StoredDraft = { values, savedAt: new Date().toISOString(), baseUpdatedAt };
          localStorage.setItem(keyFor(articleId), JSON.stringify(draft));
        } catch {
          /* storage full or unavailable: drafts are a convenience only */
        }
      }, 800);
    },
    [articleId]
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPending(null);
    try {
      localStorage.removeItem(keyFor(articleId));
    } catch {
      /* storage unavailable */
    }
  }, [articleId]);

  const dismiss = useCallback(() => setPending(null), []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { pending, check, save, clear, dismiss };
}
