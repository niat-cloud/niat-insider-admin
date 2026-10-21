/**
 * How-To Guides moderation types. Field names follow the backend's
 * guides/admin_serializers.py (GET /api/admin/guides/...).
 */

export type GuideStatus = "draft" | "pending" | "published" | "rejected" | "taken_down";

export type GuideStatusCounts = { total: number } & Record<GuideStatus, number>;

export type GuideUser = {
  id: string;
  username: string;
  profile_slug: string | null;
  role: string;
};

export type GuideAuthorContact = GuideUser & {
  email: string | null;
  phone_number: string | null;
};

export type GuideCategoryRef = { slug: string; name: string };

export type AdminGuideListItem = {
  id: string;
  slug: string;
  title: string;
  achievement: string;
  summary: string;
  cover_image: string;
  category: GuideCategoryRef;
  author: GuideUser;
  campus_name: string;
  status: GuideStatus;
  rejection_reason: string;
  takedown_reason: string;
  featured: boolean;
  reviewed_by: GuideUser | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  published_at: string | null;
  upvote_count: number;
  view_count: number;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
};

export type GuideSectionKind = "prompt" | "wish_i_knew" | "custom";

export type AdminGuideSection = {
  kind: GuideSectionKind;
  prompt_id: string | null;
  heading: string;
  body: string;
  order: number;
};

export type GuideResource = {
  kind: string;
  label: string;
  url: string;
  note: string;
  order: number;
};

export type GuideStatusLogEntry = {
  from_status: GuideStatus | "";
  to_status: GuideStatus;
  actor: GuideUser | null;
  reason: string;
  created_at: string;
};

export type AdminGuideDetail = Omit<AdminGuideListItem, "author"> & {
  author: GuideAuthorContact;
  meta_title: string;
  meta_description: string;
  sections: AdminGuideSection[];
  resources: GuideResource[];
  history: GuideStatusLogEntry[];
};

export type AdminGuidesResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminGuideListItem[];
  status_counts: GuideStatusCounts;
};

export type GuideBulkResult = {
  published?: string[];
  rejected?: string[];
  errors: { id: string; error: string }[];
};

export type AdminGuidePrompt = {
  id: string;
  category: string;
  question: string;
  help_text: string;
  order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminGuideCategory = {
  id: string;
  name: string;
  slug: string;
  group: string;
  tagline: string;
  description: string;
  icon: string;
  wish_i_knew_hint: string;
  order: number;
  is_active: boolean;
  guide_count: number;
  published_count: number;
  prompts: AdminGuidePrompt[];
  created_at: string;
  updated_at: string;
};
