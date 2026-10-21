import api from "@/lib/axios";
import type {
  AdminGuideCategory,
  AdminGuideDetail,
  AdminGuidePrompt,
  AdminGuidesResponse,
  GuideBulkResult,
  GuideStatus,
} from "@/types/guide";

// Moderators and admins; categories and prompts are admin only (backend guides/admin_views.py).
const ADMIN_GUIDES_BASE = "/api/admin/guides";

export type GetGuidesParams = {
  status?: GuideStatus;
  category?: string;
  featured?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
};

export async function getAdminGuides(params?: GetGuidesParams): Promise<AdminGuidesResponse> {
  const { data } = await api.get<AdminGuidesResponse>(`${ADMIN_GUIDES_BASE}/`, { params });
  return data;
}

export async function getAdminGuide(slug: string): Promise<AdminGuideDetail> {
  const { data } = await api.get<AdminGuideDetail>(`${ADMIN_GUIDES_BASE}/${encodeURIComponent(slug)}/`);
  return data;
}

/** pending -> published. Also restores a taken-down guide (admins only). */
export async function publishGuide(slug: string): Promise<AdminGuideDetail> {
  const { data } = await api.post<AdminGuideDetail>(`${ADMIN_GUIDES_BASE}/${encodeURIComponent(slug)}/publish/`);
  return data;
}

/** pending -> rejected. The author sees the reason on their My guides page. */
export async function rejectGuide(slug: string, reason: string): Promise<AdminGuideDetail> {
  const { data } = await api.post<AdminGuideDetail>(`${ADMIN_GUIDES_BASE}/${encodeURIComponent(slug)}/reject/`, {
    reason,
  });
  return data;
}

/** published -> taken_down. Off the site straight away. */
export async function takedownGuide(slug: string, reason: string): Promise<AdminGuideDetail> {
  const { data } = await api.post<AdminGuideDetail>(`${ADMIN_GUIDES_BASE}/${encodeURIComponent(slug)}/takedown/`, {
    reason,
  });
  return data;
}

export type EditGuidePayload = Partial<{
  title: string;
  achievement: string;
  summary: string;
  featured: boolean;
  meta_title: string;
  meta_description: string;
}>;

/** Editorial correction; never changes the status. */
export async function editGuide(slug: string, payload: EditGuidePayload): Promise<AdminGuideDetail> {
  const { data } = await api.patch<AdminGuideDetail>(
    `${ADMIN_GUIDES_BASE}/${encodeURIComponent(slug)}/edit/`,
    payload
  );
  return data;
}

/** Pending guides only; others come back in `errors`. */
export async function bulkPublishGuides(ids: string[]): Promise<GuideBulkResult> {
  const { data } = await api.post<GuideBulkResult>(`${ADMIN_GUIDES_BASE}/bulk-publish/`, { ids });
  return data;
}

export async function bulkRejectGuides(ids: string[], reason: string): Promise<GuideBulkResult> {
  const { data } = await api.post<GuideBulkResult>(`${ADMIN_GUIDES_BASE}/bulk-reject/`, { ids, reason });
  return data;
}

export type PublicGuideCategory = {
  slug: string;
  name: string;
  prompts: { id: string; question: string; is_required: boolean }[];
};

/** Active categories with their active prompts. Open to moderators too, unlike the admin list. */
export async function getPublicGuideCategories(): Promise<PublicGuideCategory[]> {
  const { data } = await api.get<PublicGuideCategory[]>("/api/guides/categories/");
  return data;
}

/** Admin only. */
export async function getGuideCategories(): Promise<AdminGuideCategory[]> {
  const { data } = await api.get<AdminGuideCategory[]>(`${ADMIN_GUIDES_BASE}/categories/`);
  return data;
}

export type EditCategoryPayload = Partial<
  Pick<AdminGuideCategory, "name" | "tagline" | "description" | "wish_i_knew_hint" | "order" | "is_active">
>;

export async function updateGuideCategory(slug: string, payload: EditCategoryPayload): Promise<AdminGuideCategory> {
  const { data } = await api.patch<AdminGuideCategory>(
    `${ADMIN_GUIDES_BASE}/categories/${encodeURIComponent(slug)}/`,
    payload
  );
  return data;
}

export type PromptPayload = Partial<
  Pick<AdminGuidePrompt, "question" | "help_text" | "order" | "is_required" | "is_active">
>;

export async function createGuidePrompt(
  payload: PromptPayload & { category: string; question: string }
): Promise<AdminGuidePrompt> {
  const { data } = await api.post<AdminGuidePrompt>(`${ADMIN_GUIDES_BASE}/prompts/`, payload);
  return data;
}

export async function updateGuidePrompt(id: string, payload: PromptPayload): Promise<AdminGuidePrompt> {
  const { data } = await api.patch<AdminGuidePrompt>(`${ADMIN_GUIDES_BASE}/prompts/${id}/`, payload);
  return data;
}
