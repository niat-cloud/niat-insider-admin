"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AdminProfileSection } from "./AdminProfileSection";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Trophy, CheckCircle, MessageCircleQuestion } from "lucide-react";

const NAV_LINKS = [
  { name: "Admin", href: "/", icon: LayoutDashboard },
  { name: "Articles", href: "/articles", icon: FileText },
  { name: "Leaderboard", href: "/authors", icon: Trophy },
  { name: "Approve", href: "/approve", icon: CheckCircle },
  { name: "Q&A", href: "/qa", icon: MessageCircleQuestion },
];

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Hide navbar on login page
  if (pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 lg:px-6">
        <div className="flex items-center gap-6 md:gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">
              NIAT <span className="text-[#e11d48]">Admin</span>
            </span>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 md:overflow-visible no-scrollbar mr-2">
            {NAV_LINKS.map((link) => {
              const statusParam = searchParams.get("status");
              
              let isActive = false;
              if (link.name === "Approve") {
                isActive = pathname.startsWith("/approve");
              } else if (link.name === "Articles") {
                isActive = pathname === "/articles" && statusParam !== "pending_review";
              } else if (link.href === "/") {
                isActive = pathname === "/";
              } else {
                isActive = pathname.startsWith(link.href);
              }

              const Icon = link.icon;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]"
                      : "border border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-rose-400" : "text-zinc-500")} />
                  {link.name}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center pl-2 border-l border-zinc-800">
            <AdminProfileSection />
          </div>
        </div>
      </div>
    </nav>
  );
}
