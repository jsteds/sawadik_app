"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  Sparkles,
  Settings,
  LogOut,
  Store,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Onboarding from "@/components/Onboarding";
import BottomNav from "@/components/BottomNav";


// ─── Header (needs auth context) ──────────────────────────────────────────────
function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Team", href: "/dashboard/team" },
    { name: "Jadwal", href: "/dashboard/schedule" },
    { name: "Dokumen", href: "/dashboard/documents" },
    { name: "Daily Cleaning", href: "/dashboard/daily-cleaning" },
    { name: "General Cleaning", href: "/dashboard/cleaning" },
  ];

  const currentPage =
    navItems.find(
      (n) =>
        n.href === pathname ||
        (pathname.startsWith(n.href) && n.href !== "/dashboard")
    )?.name ?? "Dashboard";

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        {/* We can reintroduce the logo here since the sidebar logo is gone */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold mr-2">
          <img src="/logo.png" alt="SawadikApp Logo" className="w-8 h-8 rounded-lg object-cover" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {currentPage}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {profile?.stores && (
          <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">
            {profile.stores.name}
          </span>
        )}
        <Link href="/dashboard/settings" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
          <Settings className="w-5 h-5" />
        </Link>
        <button 
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Keluar"
        >
          <LogOut className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Inner Layout (handles auth & onboarding check) ──────────────────────────
function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();

  // Redirect if user is not logged in
  useEffect(() => {
    if (!loading && !session) {
      router.push("/login");
    }
  }, [loading, session, router]);

  // Loading state (screen-wide skeleton or spinner)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400 font-medium">Memuat profil...</p>
        </div>
      </div>
    );
  }

  // Not logged in (redirecting)
  if (!session) {
    return null;
  }

  // Logged in but profile is null (or store_id is null) => show onboarding
  if (!profile || !profile.store_id) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        {/* Simple header with logout for onboarding users */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-400">
            <img src="/logo.png" alt="SawadikApp Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span>SawadikApp</span>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </header>
        <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          <Onboarding />
        </main>
      </div>
    );
  }

  // Normal flow
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 overflow-hidden">
      <main className="flex-1 flex flex-col w-full overflow-hidden relative">
        <Header />
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-28 md:pb-36">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}

// ─── Root Layout ───────────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardInnerLayout>{children}</DashboardInnerLayout>
    </AuthProvider>
  );
}
