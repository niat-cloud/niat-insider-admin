export type ArticleStatus = "draft" | "pending_review" | "published" | "rejected"

export type Author = {
  id: string
  username: string
  email: string
}

export type AuthorLeaderboardItem = Author & {
  articles_in_period: number
  total_articles: number
  article_count?: number  // back-compat alias
  campus_name: string
  period?: { from: string; to: string }
}

export type LeaderboardResponse = {
  period: "all_time" | { from: string; to: string }
  authors: AuthorLeaderboardItem[]
}

export type AIFeedback = {
  confidence_score: number
  brand_alignment: number
  content_quality: number
  tone_score: number
  summary: string
  status_recommendation: "published" | "pending_review" | "rejected"
  status_reason: string
  strengths: string[]
  concerns: string[]
  flags: {
    contains_fees: boolean
    off_topic: boolean
    promotional: boolean
    low_quality: boolean
  }
}

export type Article = {
  id: string
  slug: string
  title: string
  body: string
  excerpt: string
  status: ArticleStatus
  rejection_reason: string
  featured: boolean
  category: string
  category_fk: string | null
  subcategory: string
  subcategory_other: string
  meta_title: string
  meta_description: string
  meta_keywords: string[]
  topic: string
  is_global_guide: boolean
  author: Author| null
  reviewed_by?: Author | null
  author_username: string
  campus_name: string
  campus_id: string
  upvote_count: number
  view_count: number
  ai_generated: boolean
  cover_image: string
  images: string[]
  created_at: string
  updated_at: string
  ai_feedback: AIFeedback | null
  ai_reviewed_at?: string | null
  reviewed_at?: string | null
}

export type ArticleListItem = {
  id: string
  slug: string
  title: string
  meta_title: string
  meta_description: string
  meta_keywords: string[]
  status: ArticleStatus
  created_at: string
  updated_at: string
  category: string
  author: Author| null
  author_username?: string
  reviewed_by?: Author | null
  campus_name: string
  campus_slug: string
  upvote_count: number
  view_count: number
  ai_generated: boolean
  featured: boolean
  ai_confident_score?: number | null
  ai_feedback: AIFeedback | null
  ai_reviewed_at?: string | null
  reviewed_at?: string | null
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
