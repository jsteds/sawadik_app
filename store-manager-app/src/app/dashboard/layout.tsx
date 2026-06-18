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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { Menu, X } from "lucide-react";
import Onboarding from "@/components/Onboarding";

// ─── Sidebar content (needs auth context) ─────────────────────────────────────
function SidebarContent({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Team", href: "/dashboard/team", icon: Users },
    { name: "Dokumen", href: "/dashboard/documents", icon: FileText },
    { name: "Tugas", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "General Cleaning", href: "/dashboard/cleaning", icon: Sparkles },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Inisial dari nama lengkap
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close button for mobile */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 md:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400">
          <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center">
            S
          </div>
          <span>StoreApp</span>
        </div>
      </div>

      {/* Store info badge */}
      {profile?.stores && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
                {profile.stores.name}
              </p>
              {profile.stores.location && (
                <p className="text-[10px] text-blue-500/70 truncate">
                  {profile.stores.location}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <div className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/dashboard");

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)} // Close menu on click
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Bottom: user + logout */}
      <div className="p-4 border-t space-y-3">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {profile?.full_name ?? "—"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {profile?.position ?? profile?.role ?? ""}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </aside>
    </>
  );
}

// ─── Header (needs auth context) ──────────────────────────────────────────────
function Header({ setIsOpen }: { setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Team", href: "/dashboard/team" },
    { name: "Dokumen", href: "/dashboard/documents" },
    { name: "Tugas", href: "/dashboard/tasks" },
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
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-extrabold">
              S
            </div>
            <span>StoreApp</span>
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
      <SidebarContent isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <main className="flex-1 flex flex-col w-full overflow-hidden relative">
        <Header setIsOpen={setIsMobileMenuOpen} />
        <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </main>
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
