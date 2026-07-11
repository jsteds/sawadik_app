"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import type { Store, Profile, DailyCleaningTask, GeneralCleaningTask, Schedule, ShiftCode } from "@/lib/types";
import {
  Store as StoreIcon,
  Users,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckSquare,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreOverviewData {
  store: Store;
  staffCount: number;
  inChargeToday: Profile[];
  dailyTasks: DailyCleaningTask[];
  gcTasks: GeneralCleaningTask[];
  dailyCompletedCount: number;
  dailyTotalCount: number;
  gcCompletedCount: number;
  gcTotalCount: number;
}

export default function AreaOverviewDashboard() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [storesData, setStoresData] = useState<StoreOverviewData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "jadwal" | "daily" | "gc">("overview");
  const [greeting, setGreeting] = useState<string>("Selamat datang");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setGreeting("Selamat pagi");
    else if (hour >= 11 && hour < 15) setGreeting("Selamat siang");
    else if (hour >= 15 && hour < 18.5) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
  }, []);

  const loadAreaOverview = async () => {
    setLoading(true);
    try {
      // 1. Fetch all stores
      const { data: storesList } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (!storesList || storesList.length === 0) {
        setStoresData([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all profiles (staff across all stores)
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, role, position, status, store_id, avatar_url");

      // 3. Fetch daily cleaning tasks for selectedDate
      const { data: allDaily } = await supabase
        .from("daily_cleaning")
        .select("*, assignee:profiles(full_name)")
        .eq("date", selectedDate);

      // 4. Fetch general cleaning tasks for selectedDate
      const { data: allGc } = await supabase
        .from("general_cleaning")
        .select("*, assignee:profiles(full_name)")
        .eq("date", selectedDate);

      // 5. Fetch shift codes and schedules for selectedDate
      const { data: shiftCodes } = await supabase
        .from("shift_codes")
        .select("*");

      const { data: allSchedules } = await supabase
        .from("schedules")
        .select("*")
        .eq("date", selectedDate);

      // Assemble StoreOverviewData
      const assembled: StoreOverviewData[] = (storesList as Store[]).map((st) => {
        const storeProfiles = (allProfiles || []).filter(
          (p) => p.store_id === st.id
        ) as Profile[];

        // Check who is in charge today (active schedule with valid shift code)
        const inChargeToday = storeProfiles.filter((p) => {
          if (p.status !== "aktif") return false;
          const sched = (allSchedules || []).find(
            (sc) => sc.profile_id === p.id && sc.store_id === st.id
          );
          if (!sched || !sched.shift_code_id) return true; // Default consider active if no explicit OFF schedule
          const scCode = (shiftCodes || []).find(
            (c) => c.id === sched.shift_code_id
          );
          if (!scCode) return true;
          return (
            scCode.code.toUpperCase() !== "OFF" &&
            scCode.code.toUpperCase() !== "SHOFF"
          );
        });

        const storeDaily = (allDaily || []).filter(
          (t) => t.store_id === st.id
        ) as DailyCleaningTask[];

        const storeGc = (allGc || []).filter(
          (t) => t.store_id === st.id
        ) as GeneralCleaningTask[];

        const dailyCompleted = storeDaily.filter(
          (t) => t.status === "completed"
        ).length;

        const gcCompleted = storeGc.filter(
          (t) => t.status === "completed" || t.status === "verified"
        ).length;

        return {
          store: st,
          staffCount: storeProfiles.length,
          inChargeToday,
          dailyTasks: storeDaily,
          gcTasks: storeGc,
          dailyCompletedCount: dailyCompleted,
          dailyTotalCount: storeDaily.length,
          gcCompletedCount: gcCompleted,
          gcTotalCount: storeGc.length,
        };
      });

      setStoresData(assembled);
    } catch (err) {
      console.error("Error loading area overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreaOverview();
  }, [selectedDate]);

  // Global totals calculation
  const totalSummary = useMemo(() => {
    let totalStores = storesData.length;
    let totalStaff = 0;
    let totalInCharge = 0;
    let totalDailyCompleted = 0;
    let totalDailyTasks = 0;
    let totalGcCompleted = 0;
    let totalGcTasks = 0;

    storesData.forEach((sd) => {
      totalStaff += sd.staffCount;
      totalInCharge += sd.inChargeToday.length;
      totalDailyCompleted += sd.dailyCompletedCount;
      totalDailyTasks += sd.dailyTotalCount;
      totalGcCompleted += sd.gcCompletedCount;
      totalGcTasks += sd.gcTotalCount;
    });

    const dailyPercentage =
      totalDailyTasks > 0
        ? Math.round((totalDailyCompleted / totalDailyTasks) * 100)
        : 0;

    const gcPercentage =
      totalGcTasks > 0
        ? Math.round((totalGcCompleted / totalGcTasks) * 100)
        : 0;

    return {
      totalStores,
      totalStaff,
      totalInCharge,
      totalDailyCompleted,
      totalDailyTasks,
      dailyPercentage,
      totalGcCompleted,
      totalGcTasks,
      gcPercentage,
    };
  }, [storesData]);

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return storesData;
    const q = searchQuery.toLowerCase();
    return storesData.filter(
      (sd) =>
        sd.store.name.toLowerCase().includes(q) ||
        (sd.store.code && sd.store.code.toLowerCase().includes(q))
    );
  }, [storesData, searchQuery]);

  return (
    <div className="space-y-8 pb-12">
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
          {/* Avatar Profile */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg bg-white/10 flex items-center justify-center">
              <img
                src={
                  profile?.avatar_url ||
                  `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
                    profile?.full_name || "?"
                  )}`
                }
                alt={profile?.full_name || "Profile"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Active" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
                Area Manager Multi-Store Dashboard
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/15 text-xs font-medium">
                NIK: {profile?.nik || "-"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, <span className="text-blue-300">{profile?.full_name?.split(" ")[0] || profile?.full_name || "Manager"}</span>!
            </h1>
            <p className="text-slate-300 text-sm mt-1 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-white">{profile?.full_name || "Area Manager"}</span>
              <span className="text-white/40">•</span>
              <span>Pantau Jadwal, Daily Cleaning, & General Cleaning dari setiap Store secara realtime.</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full lg:w-auto self-stretch sm:self-auto justify-end">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-sm">
            <CalendarDays className="w-4 h-4 text-blue-300 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white border-0 focus:outline-none cursor-pointer text-sm font-medium"
            />
          </div>

          <button
            onClick={loadAreaOverview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md disabled:opacity-50"
            title="Perbarui Data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* ─── Global KPI Cards across All Stores ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
              Total Toko Aktif
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {totalSummary.totalStores} Toko
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Dalam pantauan wilayah Anda
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <StoreIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
              Staf In-Charge Hari Ini
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {totalSummary.totalInCharge} / {totalSummary.totalStaff}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Personil aktif bertugas
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
              Penyelesaian Daily Cleaning
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {totalSummary.dailyPercentage}%
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {totalSummary.totalDailyCompleted} dari {totalSummary.totalDailyTasks} tugas selesai
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
              Penyelesaian General Cleaning
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
              {totalSummary.gcPercentage}%
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {totalSummary.totalGcCompleted} dari {totalSummary.totalGcTasks} tugas selesai
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs & Search bar ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "overview"
                ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Overview Semua Toko</span>
          </button>
          <button
            onClick={() => setActiveTab("jadwal")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "jadwal"
                ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Jadwal Toko</span>
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "daily"
                ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Daily Cleaning</span>
          </button>
          <button
            onClick={() => setActiveTab("gc")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "gc"
                ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>General Cleaning</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama toko / kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ─── Loading State ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">
            Memuat data seluruh toko untuk wilayah Anda...
          </p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            Toko Tidak Ditemukan
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Tidak ada toko yang cocok dengan pencarian Anda.
          </p>
        </div>
      ) : (
        <>
          {/* ════════ TAB 1: OVERVIEW SEMUA TOKO ════════ */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredStores.map((sd) => {
                const dailyPct =
                  sd.dailyTotalCount > 0
                    ? Math.round((sd.dailyCompletedCount / sd.dailyTotalCount) * 100)
                    : 0;
                const gcPct =
                  sd.gcTotalCount > 0
                    ? Math.round((sd.gcCompletedCount / sd.gcTotalCount) * 100)
                    : 0;

                return (
                  <div
                    key={sd.store.id}
                    className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                  >
                    {/* Store Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {sd.store.code || sd.store.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white text-base">
                            {sd.store.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Kode: {sd.store.code || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/60 dark:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {sd.inChargeToday.length} / {sd.staffCount}
                        </span>
                      </div>
                    </div>

                    {/* Content Metrics */}
                    <div className="p-5 space-y-5 flex-1">
                      {/* Jadwal / Staf In-Charge */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                            MOD & Staf Bertugas
                          </span>
                          <span>{sd.inChargeToday.length} Personil</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sd.inChargeToday.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">
                              Belum ada staf tercatat bertugas hari ini
                            </span>
                          ) : (
                            sd.inChargeToday.slice(0, 4).map((p) => (
                              <span
                                key={p.id}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {p.full_name?.split(" ")[0]}
                              </span>
                            ))
                          )}
                          {sd.inChargeToday.length > 4 && (
                            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs text-slate-500 font-semibold">
                              +{sd.inChargeToday.length - 4} lainnya
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Daily Cleaning Progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                            Daily Cleaning
                          </span>
                          <span className="text-slate-700 dark:text-slate-200 font-bold">
                            {sd.dailyCompletedCount} / {sd.dailyTotalCount} ({dailyPct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              dailyPct === 100 ? "bg-emerald-500" : "bg-blue-500"
                            )}
                            style={{ width: `${dailyPct}%` }}
                          />
                        </div>
                      </div>

                      {/* General Cleaning Progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            General Cleaning
                          </span>
                          <span className="text-slate-700 dark:text-slate-200 font-bold">
                            {sd.gcCompletedCount} / {sd.gcTotalCount} ({gcPct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              gcPct === 100 ? "bg-purple-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${gcPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Store Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase",
                          dailyPct === 100 && gcPct === 100
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        )}
                      >
                        {dailyPct === 100 && gcPct === 100
                          ? "Selesai Sempurna"
                          : "Dalam Proses"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ════════ TAB 2: JADWAL OPERASIONAL SEMUA TOKO ════════ */}
          {activeTab === "jadwal" && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Komparasi Jadwal & Personil Toko ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar staf dan manajer yang bertugas di masing-masing toko pada tanggal terpilih.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Toko</th>
                      <th className="px-6 py-4">Total Staf</th>
                      <th className="px-6 py-4">Staf Bertugas (In-Charge)</th>
                      <th className="px-6 py-4">Daftar Nama Staf Bertugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredStores.map((sd) => (
                      <tr key={sd.store.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                          <div>{sd.store.name}</div>
                          <div className="text-xs font-normal text-slate-400">{sd.store.code || "-"}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-300">
                          {sd.staffCount} Personil
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                            {sd.inChargeToday.length} Aktif
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {sd.inChargeToday.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Belum ada jadwal bertugas</span>
                            ) : (
                              sd.inChargeToday.map((p) => (
                                <span
                                  key={p.id}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300"
                                >
                                  {p.full_name} <span className="text-[10px] text-slate-400">({p.position || "Staff"})</span>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ TAB 3: DAILY CLEANING SEMUA TOKO ════════ */}
          {activeTab === "daily" && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Penyelesaian Daily Cleaning per Toko ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau persentase dan daftar tugas pembersihan harian di seluruh toko.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Toko</th>
                      <th className="px-6 py-4">Status Progress</th>
                      <th className="px-6 py-4">Total Selesai</th>
                      <th className="px-6 py-4">Tugas Menunggu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredStores.map((sd) => {
                      const pct =
                        sd.dailyTotalCount > 0
                          ? Math.round((sd.dailyCompletedCount / sd.dailyTotalCount) * 100)
                          : 0;
                      const pending = sd.dailyTotalCount - sd.dailyCompletedCount;

                      return (
                        <tr key={sd.store.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                            <div>{sd.store.name}</div>
                            <div className="text-xs font-normal text-slate-400">{sd.store.code || "-"}</div>
                          </td>
                          <td className="px-6 py-4 w-48">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    pct === 100 ? "bg-emerald-500" : "bg-blue-500"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                            {sd.dailyCompletedCount} / {sd.dailyTotalCount} Tugas
                          </td>
                          <td className="px-6 py-4">
                            {pending === 0 ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-bold">
                                Tuntas
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-bold">
                                {pending} Tersisa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ TAB 4: GENERAL CLEANING SEMUA TOKO ════════ */}
          {activeTab === "gc" && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Progress General Cleaning per Toko ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau pekerjaan General Cleaning (GC) di setiap toko.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Toko</th>
                      <th className="px-6 py-4">Progress GC</th>
                      <th className="px-6 py-4">Selesai / Terverifikasi</th>
                      <th className="px-6 py-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredStores.map((sd) => {
                      const pct =
                        sd.gcTotalCount > 0
                          ? Math.round((sd.gcCompletedCount / sd.gcTotalCount) * 100)
                          : 0;

                      return (
                        <tr key={sd.store.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                            <div>{sd.store.name}</div>
                            <div className="text-xs font-normal text-slate-400">{sd.store.code || "-"}</div>
                          </td>
                          <td className="px-6 py-4 w-48">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    pct === 100 ? "bg-purple-500" : "bg-indigo-500"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-purple-600 dark:text-purple-400">
                            {sd.gcCompletedCount} / {sd.gcTotalCount} Tugas
                          </td>
                          <td className="px-6 py-4">
                            {sd.gcTotalCount === 0 ? (
                              <span className="text-xs text-slate-400">Belum ada tugas GC</span>
                            ) : pct === 100 ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-bold">
                                Selesai
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold">
                                Berjalan
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
