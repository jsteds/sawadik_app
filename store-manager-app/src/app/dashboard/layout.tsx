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
  ChevronDown,
  Shield,
  MessageSquareText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UnifiedOnboarding from "@/components/UnifiedOnboarding";
import BottomNav from "@/components/BottomNav";
import ProfileModal from "@/components/dashboard/ProfileModal";
import Sidebar from "@/components/dashboard/Sidebar";


// ─── Header (needs auth context) ──────────────────────────────────────────────
function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, isSuperAdmin, isAreaManager, activeStoreId, setActiveStore, allStores } = useAuth();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Team", href: "/dashboard/team" },
    { name: "Jadwal", href: "/dashboard/schedule" },
    { name: "Dokumen", href: "/dashboard/documents" },
    { name: "Daily Cleaning", href: "/dashboard/daily-cleaning" },
    { name: "General Cleaning", href: "/dashboard/cleaning" },
    { name: "Ulasan", href: "/dashboard/reviews" },
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

  const activeStore = allStores.find((s) => s.id === activeStoreId);

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3 md:hidden">
        {/* Logo & Title for Mobile */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold mr-2">
          <img src="/logo_sawadik.jpeg" alt="SawadikApp Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">
          {isAreaManager ? "Area Manager" : currentPage}
        </h1>
      </div>
      
      {/* Desktop spacer */}
      <div className="hidden md:block flex-1" />
      <div className="flex items-center gap-3">
        {/* Store Selector for Super Admin & Area Manager */}
        {(isSuperAdmin || isAreaManager) && allStores.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-button text-sm font-semibold text-slate-700"
            >
              <Store className="w-4 h-4 text-blue-600" />
              <span className="max-w-[120px] truncate">{activeStore?.name ?? "Pilih Toko"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${storeDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {storeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStoreDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-xl shadow-2xl z-50 py-2 max-h-64 overflow-y-auto border-white/60">
                  {allStores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => {
                        setActiveStore(store.id);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/50 transition-colors flex items-center gap-2 ${
                        store.id === activeStoreId
                          ? "text-blue-700 font-bold bg-white/60"
                          : "text-slate-700 font-medium"
                      }`}
                    >
                      <Store className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{store.name}</span>
                      {store.code && (
                        <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">({store.code})</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Store name for non-super-admin */}
        {!isSuperAdmin && !isAreaManager && profile?.stores && (
          <span className="hidden sm:block text-sm font-medium text-slate-600 bg-white/40 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/50">
            {profile.stores.name}
          </span>
        )}

        {/* Super Admin Badge */}
        {isSuperAdmin && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100/50 backdrop-blur-md text-violet-800 text-[10px] font-bold uppercase tracking-wider border border-violet-200/50 shadow-sm">
            <Shield className="w-3 h-3" />
            Super Admin
          </div>
        )}

        {/* Area Manager Badge */}
        {isAreaManager && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/50 backdrop-blur-md text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200/50 shadow-sm">
            <Shield className="w-3 h-3" />
            Area Manager
          </div>
        )}

        {/* Mobile menu - logout button for users without sidebar */}
        <div className="md:hidden">
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
        </div>
        <button
          onClick={() => setShowProfileModal(true)}
          className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
          title="Pengaturan Profil Saya"
        >
          {initials}
        </button>
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  );
}

// ─── Inner Layout (handles auth & onboarding check) ──────────────────────────
function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, signOut, isSuperAdmin, isAreaManager, refreshProfile } = useAuth();
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

  // Check if profile is incomplete based on role requirements
  const isProfileIncomplete = !profile || 
    !profile.role ||
    ((profile.role === 'staff' || profile.role === 'manager') && !profile.store_id) ||
    (profile.role === 'area_manager' && (!Array.isArray(profile.managed_store_ids) || profile.managed_store_ids.length === 0));

  if (isProfileIncomplete && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-400">
            <img src="/logo_sawadik.jpeg" alt="SawadikApp Logo" className="w-8 h-8 rounded-lg object-cover" />
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
          <UnifiedOnboarding profile={profile} refreshProfile={refreshProfile} />
        </main>
      </div>
    );
  }

  // Normal flow
  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full h-full overflow-hidden relative z-0">
        <Header />
        
        {/* Glassmorphic Container for Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-28 md:pb-8">
          <div className="glass-panel w-full min-h-full rounded-2xl p-6">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
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
