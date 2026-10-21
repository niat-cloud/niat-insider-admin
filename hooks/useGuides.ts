"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { getAdminGuide, getAdminGuides, getPublicGuideCategories } from "@/lib/api/guides";
import type { GetGuidesParams } from "@/lib/api/guides";

export function useAdminGuides(params: GetGuidesParams) {
  return useQuery({
    queryKey: ["guides", params],
    queryFn: () => getAdminGuides(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminGuide(slug: string) {
  return useQuery({
    queryKey: ["guide", slug],
    queryFn: () => getAdminGuide(slug),
    enabled: !!slug,
  });
}

export function usePublicGuideCategories() {
  return useQuery({
    queryKey: ["guide-categories", "public"],
    queryFn: getPublicGuideCategories,
    staleTime: 5 * 60_000,
  });
}

/** The signed-in reviewer's role: restoring guides and editing categories are admin only. */
export function useAdminRole() {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<{ role?: string }>("/api/auth/me/")).data,
    staleTime: 10 * 60_000,
  });
  return data?.role;
}
