import api from "@/lib/axios";
import type {
  AdminQuestionsResponse,
  AdminAnswersResponse,
  AdminQuestionDetail,
  AdminAnswer,
  BulkActionResult,
} from "@/types/qa";

const ADMIN_QUESTIONS_BASE = "/api/admin/qa/questions";
const ADMIN_ANSWERS_BASE = "/api/admin/qa/answers";

export type GetQuestionsParams = {
  status?: "pending" | "approved" | "rejected";
  category?: string;
  is_faq?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
};

export async function getAdminQuestions(
  params?: GetQuestionsParams
): Promise<AdminQuestionsResponse> {
  const { data } = await api.get<AdminQuestionsResponse>(
    `${ADMIN_QUESTIONS_BASE}/`,
    { params }
  );
  return data;
}

export async function getAdminQuestion(slug: string): Promise<AdminQuestionDetail> {
  const { data } = await api.get<AdminQuestionDetail>(
    `${ADMIN_QUESTIONS_BASE}/${slug}/`
  );
  return data;
}

export async function approveQuestion(slug: string): Promise<AdminQuestionDetail> {
  const { data } = await api.post<AdminQuestionDetail>(
    `${ADMIN_QUESTIONS_BASE}/${slug}/approve/`
  );
  return data;
}

export async function rejectQuestion(
  slug: string,
  reason?: string
): Promise<AdminQuestionDetail> {
  const { data } = await api.post<AdminQuestionDetail>(
    `${ADMIN_QUESTIONS_BASE}/${slug}/reject/`,
    reason ? { reason } : {}
  );
  return data;
}

export async function takedownQuestion(
  slug: string,
  reason?: string
): Promise<AdminQuestionDetail> {
  const { data } = await api.post<AdminQuestionDetail>(
    `${ADMIN_QUESTIONS_BASE}/${slug}/takedown/`,
    reason ? { reason } : {}
  );
  return data;
}

export type EditQuestionPayload = Partial<{
  title: string;
  body: string;
  is_faq: boolean;
  faq_order: number;
  category: string;
}>;

export async function editQuestion(
  slug: string,
  payload: EditQuestionPayload
): Promise<AdminQuestionDetail> {
  const { data } = await api.patch<AdminQuestionDetail>(
    `${ADMIN_QUESTIONS_BASE}/${slug}/edit/`,
    payload
  );
  return data;
}

export type CreateQuestionPayload = {
  title: string;
  body?: string;
  is_faq?: boolean;
  faq_order?: number;
  category?: string;
};

export async function createQuestionDirect(
  payload: CreateQuestionPayload
): Promise<AdminQuestionDetail> {
  const { data } = await api.post<AdminQuestionDetail>(
    `${ADMIN_QUESTIONS_BASE}/`,
    payload
  );
  return data;
}

export async function bulkApproveQuestions(ids: string[]): Promise<BulkActionResult> {
  const { data } = await api.post<BulkActionResult>(
    `${ADMIN_QUESTIONS_BASE}/bulk-approve/`,
    { ids }
  );
  return data;
}

export async function bulkRejectQuestions(
  ids: string[],
  reason?: string
): Promise<BulkActionResult> {
  const { data } = await api.post<BulkActionResult>(
    `${ADMIN_QUESTIONS_BASE}/bulk-reject/`,
    reason ? { ids, reason } : { ids }
  );
  return data;
}

// ---------------- Answers ----------------

export type GetAnswersParams = {
  status?: "pending" | "approved" | "rejected";
  question?: string;
  search?: string;
  page?: number;
};

export async function getAdminAnswers(
  params?: GetAnswersParams
): Promise<AdminAnswersResponse> {
  const { data } = await api.get<AdminAnswersResponse>(`${ADMIN_ANSWERS_BASE}/`, {
    params,
  });
  return data;
}

export async function approveAnswer(id: string): Promise<AdminAnswer> {
  const { data } = await api.post<AdminAnswer>(`${ADMIN_ANSWERS_BASE}/${id}/approve/`);
  return data;
}

export async function rejectAnswer(id: string, reason?: string): Promise<AdminAnswer> {
  const { data } = await api.post<AdminAnswer>(
    `${ADMIN_ANSWERS_BASE}/${id}/reject/`,
    reason ? { reason } : {}
  );
  return data;
}

export async function takedownAnswer(id: string, reason?: string): Promise<AdminAnswer> {
  const { data } = await api.post<AdminAnswer>(
    `${ADMIN_ANSWERS_BASE}/${id}/takedown/`,
    reason ? { reason } : {}
  );
  return data;
}

export async function editAnswer(id: string, body: string): Promise<AdminAnswer> {
  const { data } = await api.patch<AdminAnswer>(`${ADMIN_ANSWERS_BASE}/${id}/edit/`, {
    body,
  });
  return data;
}

export async function createAnswerDirect(
  question: string,
  body: string
): Promise<AdminAnswer> {
  const { data } = await api.post<AdminAnswer>(`${ADMIN_ANSWERS_BASE}/`, {
    question,
    body,
  });
  return data;
}

export async function bulkApproveAnswers(ids: string[]): Promise<BulkActionResult> {
  const { data } = await api.post<BulkActionResult>(
    `${ADMIN_ANSWERS_BASE}/bulk-approve/`,
    { ids }
  );
  return data;
}

export async function bulkRejectAnswers(
  ids: string[],
  reason?: string
): Promise<BulkActionResult> {
  const { data } = await api.post<BulkActionResult>(
    `${ADMIN_ANSWERS_BASE}/bulk-reject/`,
    reason ? { ids, reason } : { ids }
  );
  return data;
}

/** DRF error shapes this API returns: {"detail": "..."} or {"field": ["msg", ...]}. */
export function qaErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data.detail === "string") return data.detail;
  const firstField = Object.keys(data)[0];
  if (firstField && Array.isArray(data[firstField])) {
    return data[firstField][0] || fallback;
  }
  return fallback;
}
