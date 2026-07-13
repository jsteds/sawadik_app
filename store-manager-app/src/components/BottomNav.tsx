"use client";

import React, { useEffect, useRef } from "react";
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
  IdCard,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();
  const { isAreaManager } = useAuth();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const standardNavItems = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Team", href: "/dashboard/team", icon: Users },
    { name: "Jadwal", href: "/dashboard/schedule", icon: CalendarDays },
    { name: "Dokumen", href: "/dashboard/documents", icon: FileText },
    { name: "Daily", href: "/dashboard/daily-cleaning", icon: CheckSquare },
    { name: "General", href: "/dashboard/cleaning", icon: Sparkles },
    { name: "Ulasan", href: "/dashboard/reviews", icon: MessageSquareText },
    { name: "Name Tag", href: "/dashboard/name-tag", icon: IdCard },
    { name: "Stock Opname", href: "/dashboard/stock-opname", icon: Package },
  ];

  const areaManagerNavItems = [
    { name: "Overview Area", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jadwal Area", href: "/dashboard/schedule", icon: CalendarDays },
    { name: "Dokumen", href: "/dashboard/documents", icon: FileText },
    { name: "Daily Cleaning", href: "/dashboard/daily-cleaning", icon: CheckSquare },
    { name: "General Cleaning", href: "/dashboard/cleaning", icon: Sparkles },
    { name: "Ulasan", href: "/dashboard/reviews", icon: MessageSquareText },
    { name: "Name Tag", href: "/dashboard/name-tag", icon: IdCard },
    { name: "Stock Opname", href: "/dashboard/stock-opname", icon: Package },
  ];

  const navItems = isAreaManager ? areaManagerNavItems : standardNavItems;

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [pathname]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50 pb-safe pointer-events-none">
      {/* Container for the navbar */}
      <div className="relative mx-auto w-full glass-panel border-b-0 border-l-0 border-r-0 rounded-t-3xl px-4 h-[74px] flex items-center justify-start overflow-x-auto no-scrollbar gap-2 pointer-events-auto scroll-smooth">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/dashboard");

          return (
            <Link
              key={item.name}
              href={item.href}
              ref={isActive ? activeRef : null}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl flex-shrink-0 transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25 font-bold"
                  : "text-slate-600 hover:bg-slate-100/60 font-medium"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-slate-500"
                )}
              />
              <span
                className={cn(
                  "text-xs whitespace-nowrap transition-colors",
                  isActive ? "text-white font-bold" : "text-slate-600"
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
