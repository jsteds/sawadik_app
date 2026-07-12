"use client";

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
  CalendarDays,
  MessageSquareText,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Daftar Tim", href: "/dashboard/team", icon: Users },
  { name: "Jadwal", href: "/dashboard/schedule", icon: CalendarDays },
  { name: "Dokumen", href: "/dashboard/documents", icon: FileText },
  { name: "Daily Cleaning", href: "/dashboard/daily-cleaning", icon: CheckSquare },
  { name: "General Cleaning", href: "/dashboard/cleaning", icon: Sparkles },
  { name: "Ulasan Google", href: "/dashboard/reviews", icon: MessageSquareText },
  // Placeholder icons based on reference image
  { name: "Name Tag Generator", href: "/dashboard/name-tag", icon: FileText },
  { name: "Stock Opname", href: "/dashboard/stock-opname", icon: Package },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-full py-6 px-4 glass-panel border-l-0 border-t-0 border-b-0 rounded-r-3xl z-10 sticky top-0">
      <div className="flex items-center gap-3 px-2 mb-10">
        <img src="/logo_sawadik.jpeg" alt="SawadikApp Logo" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-bold text-xl text-blue-900">SAWADIK-APP</span>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === pathname ||
            (pathname.startsWith(item.href) && item.href !== "/dashboard");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium",
                isActive
                  ? "glass-active"
                  : "text-slate-600 hover:bg-white/40 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-700" : "text-slate-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 space-y-2 border-t border-white/40">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium text-slate-600 hover:bg-white/40 hover:text-slate-900"
        >
          <Settings className="w-5 h-5 text-slate-500" />
          Pengaturan
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium text-slate-600 hover:bg-white/40 hover:text-slate-900 text-left"
        >
          <LogOut className="w-5 h-5 text-slate-500" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
