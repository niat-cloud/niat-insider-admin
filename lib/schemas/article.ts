import { z } from "zod";

// Categories are admin-managed rows in the backend, so any slug is accepted
// (see lib/articleCategories.ts for the known list).
const categorySlug = z.string().min(1, "Category is required");

export const articleEditSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  title: z.string().trim().min(1, "Title is required"),
  body: z
    .string()
    .refine((html) => html.replace(/<[^>]*>/g, "").trim().length > 0 || /<img\b/i.test(html), "Body is required"),
  excerpt: z.string().max(1000).optional(),
  status: z.enum(["draft", "pending_review", "published", "rejected"]),
  rejection_reason: z.string().optional(),
  featured: z.boolean(),
  category: categorySlug,
  subcategory: z.string().optional(),
  subcategory_other: z.string().optional(),
  meta_title: z.string().max(255).optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.array(z.string()).optional(),
  topic: z.string().optional(),
  cover_image: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type ArticleEditFormValues = z.infer<typeof articleEditSchema>;
