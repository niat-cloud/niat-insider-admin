export type QAStatus = "pending" | "approved" | "rejected";

export type QAUser = {
  id: string;
  username: string;
  email?: string;
  role?: string;
};

export type AdminQuestionListItem = {
  id: string;
  slug: string;
  title: string;
  status: QAStatus;
  rejection_reason: string | null;
  category: string;
  is_faq: boolean;
  faq_order: number;
  author: QAUser;
  reviewed_by: QAUser | null;
  reviewed_at: string | null;
  upvote_count: number;
  downvote_count: number;
  view_count: number;
  is_answered: boolean;
  answer_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminAnswer = {
  id: string;
  body: string;
  status: QAStatus;
  rejection_reason: string | null;
  author: QAUser;
  reviewed_by: QAUser | null;
  reviewed_at: string | null;
  upvote_count: number;
  downvote_count: number;
  created_at: string;
  updated_at: string;
  question_id: string;
  question_title: string;
  question_slug: string;
};

export type AdminQuestionDetail = Omit<AdminQuestionListItem, "answer_count"> & {
  body: string;
  category_confidence: number | null;
  category_source: string | null;
  answers: AdminAnswer[];
};

export type QAStatusCounts = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type AdminQuestionsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminQuestionListItem[];
  status_counts: QAStatusCounts;
};

export type AdminAnswersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminAnswer[];
  status_counts: QAStatusCounts;
};

export type BulkActionResult = {
  approved?: string[];
  rejected?: string[];
  errors: { id: string; error: string }[];
};
