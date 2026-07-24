"use client";

import { useQuery } from "@tanstack/react-query";
import { getArticles } from "@/lib/api/articles";
import { FileText, CheckCircle, Clock, XCircle, BarChart3 } from "lucide-react";
import Link from "next/link";

export function DashboardClient() {
  // Fetch stats concurrently
  const { data: totalData, isLoading: isLoadingTotal } = useQuery({
    queryKey: ["articles", "total"],
    queryFn: () => getArticles({ page_size: 1 }),
  });

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ["articles", "pending"],
    queryFn: () => getArticles({ status: "pending_review", page_size: 1 }),
  });

  const { data: publishedData, isLoading: isLoadingPublished } = useQuery({
    queryKey: ["articles", "published"],
    queryFn: () => getArticles({ status: "published", page_size: 1 }),
  });

  const { data: rejectedData, isLoading: isLoadingRejected } = useQuery({
    queryKey: ["articles", "rejected"],
    queryFn: () => getArticles({ status: "rejected", page_size: 1 }),
  });

  const { data: recentData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["articles", "recent"],
    queryFn: () => getArticles({ page_size: 6, ordering: "-created_at" }),
  });

  const recentArticles = recentData?.results || [];
  const displayArticles = [...recentArticles];
  if (!isLoadingRecent && displayArticles.length < 6) {
    const dummyCount = 6 - displayArticles.length;
    for (let i = 0; i < dummyCount; i++) {
      displayArticles.push({
        id: `dummy-${i}`,
        title: "No Article Available",
        slug: `placeholder-${i}`,
        status: "draft",
        author: { id: "dummy", username: "System", email: "" },
        campus_name: "N/A",
        created_at: new Date().toISOString(),
        category: "General",
        upvote_count: 0,
        view_count: 0,
        meta_title: "",
        meta_description: "",
        meta_keywords: [],
        campus_slug: "",
        ai_generated: false,
        featured: false,
        updated_at: new Date().toISOString(),
        ai_feedback: null,
      });
    }
  }

  const stats = [
    {
      name: "Total Submissions",
      value: totalData?.count ?? 0,
      isLoading: isLoadingTotal,
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      href: "/articles",
    },
    {
      name: "Pending Review",
      value: pendingData?.count ?? 0,
      isLoading: isLoadingPending,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
      href: "/articles?status=pending_review",
    },
    {
      name: "Published",
      value: publishedData?.count ?? 0,
      isLoading: isLoadingPublished,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-400/10",
      href: "/articles?status=published",
    },
    {
      name: "Rejected",
      value: rejectedData?.count ?? 0,
      isLoading: isLoadingRejected,
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-400/10",
      href: "/articles?status=rejected",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
            <p className="text-sm text-zinc-400">Track article submissions and platform activity</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.name}
              href={stat.href}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">{stat.name}</p>
                  <p className="text-3xl font-bold tracking-tight text-white">
                    {stat.isLoading ? "..." : stat.value}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="mb-6 text-xl font-semibold text-white">Recent Articles</h2>
          {isLoadingRecent ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-900/50" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        article.status === "published" ? "bg-green-500/10 text-green-400" :
                        article.status === "pending_review" ? "bg-yellow-500/10 text-yellow-400" :
                        article.status === "rejected" ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-800 text-zinc-400"
                      }`}>
                        {article.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-medium text-white group-hover:text-rose-400">
                      {article.title}
                    </h3>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>By {article.author?.username ?? article.author_username ?? "Unknown"}</span>
                    <span>{article.campus_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
