"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  Sparkles,
  CalendarDays,
  MessageSquareText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();
  const { isAreaManager } = useAuth();

  const standardNavItems = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Team", href: "/dashboard/team", icon: Users },
    { name: "Jadwal", href: "/dashboard/schedule", icon: CalendarDays },
    { name: "Dokumen", href: "/dashboard/documents", icon: FileText },
    { name: "Daily", href: "/dashboard/daily-cleaning", icon: CheckSquare },
    { name: "General", href: "/dashboard/cleaning", icon: Sparkles },
    { name: "Ulasan", href: "/dashboard/reviews", icon: MessageSquareText },
  ];

  const areaManagerNavItems = [
    { name: "Overview Area", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jadwal Area", href: "/dashboard/schedule", icon: CalendarDays },
    { name: "Dokumen", href: "/dashboard/documents", icon: FileText },
    { name: "Daily Cleaning", href: "/dashboard/daily-cleaning", icon: CheckSquare },
    { name: "General Cleaning", href: "/dashboard/cleaning", icon: Sparkles },
    { name: "Ulasan", href: "/dashboard/reviews", icon: MessageSquareText },
  ];

  const navItems = isAreaManager ? areaManagerNavItems : standardNavItems;

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50 pb-safe pointer-events-none">
      {/* Container for the navbar */}
      <div className="relative mx-auto w-full glass-panel border-b-0 border-l-0 border-r-0 rounded-t-3xl px-2 h-[72px] flex items-center justify-around pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/dashboard");

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              {/* Active Indicator / Floating Circle */}
              {isActive && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-[4px] border-white/20 glass-active flex items-center justify-center transition-all duration-300 shadow-xl">
                  <Icon className="w-6 h-6 text-blue-700" />
                </div>
              )}

              {/* Inactive Icon */}
              {!isActive && (
                <Icon className="w-6 h-6 mb-1 text-slate-500 transition-colors duration-300" />
              )}

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive
                    ? "opacity-100 translate-y-4 text-blue-800 font-bold"
                    : "opacity-100 text-slate-600 font-semibold"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
