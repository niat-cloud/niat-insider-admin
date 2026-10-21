import { GuideReviewClient } from "./GuideReviewClient";

export default async function GuideReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  // Keyed so "open next" starts each guide with an empty checklist.
  return <GuideReviewClient key={decoded} slug={decoded} />;
}
