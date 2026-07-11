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
  ];

  const navItems = isAreaManager ? areaManagerNavItems : standardNavItems;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 pb-safe pointer-events-none">
      {/* Container for the navbar */}
      <div className="relative mx-auto md:max-w-md w-full bg-white dark:bg-zinc-900 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] md:shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-t-2xl md:rounded-2xl md:mb-6 px-2 h-[72px] flex items-center justify-around pointer-events-auto border-t md:border border-gray-100 dark:border-zinc-800">
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
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-[6px] border-gray-50 dark:border-zinc-950 bg-white dark:bg-zinc-900 flex items-center justify-center transition-all duration-300">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              )}

              {/* Inactive Icon */}
              {!isActive && (
                <Icon className="w-6 h-6 mb-1 text-gray-400 dark:text-gray-500 transition-colors duration-300" />
              )}

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive
                    ? "opacity-100 translate-y-4 text-blue-600 dark:text-blue-400 font-semibold"
                    : "opacity-100 text-gray-500 dark:text-gray-400"
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
