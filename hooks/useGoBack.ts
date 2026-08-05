"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Returns to the previous history entry (preserving its query string, e.g.
 * listing filters) when one exists in this session, falling back to a plain
 * navigation for direct/deep links that have no in-app history to pop.
 */
export function useGoBack(fallbackHref: string) {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }, [router, fallbackHref]);
}
