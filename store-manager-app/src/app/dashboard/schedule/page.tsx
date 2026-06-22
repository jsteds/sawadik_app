"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getSchedules, getShiftCodes } from "@/lib/actions/schedule";
import { Profile, Schedule, ShiftCode } from "@/lib/types";
import { CalendarDays, AlertTriangle, Users, Store, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- Utils ---
function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 45%)`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SchedulePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shiftCodes, setShiftCodes] = useState<ShiftCode[]>([]);

  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"mingguan" | "bulanan">("mingguan");

  const [contractWarningDays, setContractWarningDays] = useState(30);

  useEffect(() => {
    if (!profile?.store_id) return;
    fetchData();
  }, [profile?.store_id, targetDate]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      if (!profile?.store_id) throw new Error("Store ID tidak ditemukan");

      // Menentukan range tanggal (misalnya awal bulan sampai akhir bulan dari targetDate)
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const startDate = toInputDate(new Date(year, month, 1));
      const endDate = toInputDate(new Date(year, month + 1, 0)); // Hari terakhir bulan ini

      const [shiftCodesData, schedData] = await Promise.all([
        getShiftCodes(),
        getSchedules(profile.store_id, startDate, endDate),
      ]);

      setShiftCodes(shiftCodesData);
      setProfiles(schedData.profiles);
      setSchedules(schedData.schedules);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Derived State & Calculations ---
  const targetIso = toInputDate(targetDate);

  const inchargeTodayProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const sched = schedules.find((s) => s.profile_id === p.id && s.date === targetIso);
      const code = shiftCodes.find(c => c.id === sched?.shift_code_id)?.code;
      return code && code.toUpperCase() !== "OFF" && code.toUpperCase() !== "SHOFF";
    });
  }, [profiles, schedules, shiftCodes, targetIso]);

  const contractWarnings = useMemo(() => {
    return profiles.map(p => {
      if (!p.contract_end_date) return null;
      const endDate = new Date(p.contract_end_date);
      const diff = Math.ceil((endDate.getTime() - targetDate.getTime()) / 86400000);
      return { profile: p, sisaHari: diff };
    }).filter(item => item !== null && item.sisaHari <= contractWarningDays)
      .sort((a, b) => a!.sisaHari - b!.sisaHari);
  }, [profiles, targetDate, contractWarningDays]);

  const weekDates = useMemo(() => {
    const day = targetDate.getDay();
    const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), diffToMonday);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(monday, i));
    }
    return dates;
  }, [targetDate]);

  const monthDates = useMemo(() => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const dates = [];
    const numDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= numDays; i++) {
      dates.push(new Date(year, month, i));
    }
    return dates;
  }, [targetDate]);

  if (loading && profiles.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3">Memuat Jadwal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal & Roster</h1>
          <p className="text-sm text-gray-500 mt-1">Review jadwal kerja dan karyawan incharge</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={targetIso}
            onChange={(e) => setTargetDate(new Date(e.target.value))}
            className="border px-3 py-2 rounded-md shadow-sm dark:bg-zinc-800 dark:border-zinc-700 w-full sm:w-auto"
          />
          {["admin", "manager"].includes(profile?.role || "") && (
            <Link
              href="/dashboard/schedule/manager"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Kelola
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          <p>{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Karyawan</p>
              <p className="text-2xl font-bold">{profiles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Incharge Hari Ini</p>
              <p className="text-2xl font-bold">{inchargeTodayProfiles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border shadow-sm sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kontrak Hampir Habis</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{contractWarnings.length}</p>
                  <span className="text-xs text-gray-400">({"<="} {contractWarningDays} hari)</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <label className="text-xs text-gray-500 block mb-1">Batas Hari Peringatan</label>
              <input 
                type="range" min="1" max="90" value={contractWarningDays}
                onChange={(e) => setContractWarningDays(parseInt(e.target.value))}
                className="w-24 accent-red-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left: Roster Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Roster {targetDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex bg-white dark:bg-zinc-800 rounded-md border p-1">
                <button
                  onClick={() => setActiveTab("mingguan")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded",
                    activeTab === "mingguan" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Mingguan
                </button>
                <button
                  onClick={() => setActiveTab("bulanan")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded",
                    activeTab === "bulanan" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Bulanan
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 dark:bg-zinc-900/50 border-b uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    {activeTab === "mingguan" && (
                      <th className="px-4 py-3 font-medium">Posisi</th>
                    )}
                    {(activeTab === "mingguan" ? weekDates : monthDates).map((d) => (
                      <th key={d.toISOString()} className="px-2 py-3 font-medium text-center min-w-[40px]">
                        {activeTab === "mingguan" ? (
                          <>
                            <div>{d.toLocaleDateString("id-ID", { weekday: "short" })}</div>
                            <div className="text-base text-gray-900 dark:text-gray-100 mt-1">{d.getDate()}</div>
                          </>
                        ) : (
                          d.getDate()
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {activeTab === "mingguan" && (
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0"
                              style={{ backgroundColor: stringToColor(p.full_name || p.email) }}
                            >
                              {getInitials(p.full_name || p.email)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{p.full_name}</p>
                            {activeTab === "bulanan" && <p className="text-xs text-gray-500">{p.position}</p>}
                          </div>
                        </div>
                      </td>
                      {activeTab === "mingguan" && (
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.position}</td>
                      )}
                      {(activeTab === "mingguan" ? weekDates : monthDates).map((d) => {
                        const dateStr = toInputDate(d);
                        const sched = schedules.find(s => s.profile_id === p.id && s.date === dateStr);
                        const codeObj = shiftCodes.find(c => c.id === sched?.shift_code_id);
                        const isOff = codeObj?.code.toUpperCase() === "OFF" || codeObj?.code.toUpperCase() === "SHOFF";
                        
                        return (
                          <td key={dateStr} className="px-1 py-3 text-center">
                            {codeObj ? (
                              <span className={cn(
                                "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold min-w-[32px]",
                                isOff 
                                  ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              )} title={codeObj.time_in ? `${codeObj.time_in} - ${codeObj.time_out}` : codeObj.code}>
                                {codeObj.code}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={100} className="px-4 py-8 text-center text-gray-500">
                        Tidak ada data karyawan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Incharge & Contract Warnings */}
        <div className="space-y-6">
          
          {/* Incharge Today */}
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-500" />
                Incharge Hari Ini
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {inchargeTodayProfiles.map(p => {
                const sched = schedules.find((s) => s.profile_id === p.id && s.date === targetIso);
                const codeObj = shiftCodes.find(c => c.id === sched?.shift_code_id);
                
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: stringToColor(p.full_name || p.email) }}
                    >
                      {getInitials(p.full_name || p.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{p.position}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs px-2 py-1 rounded font-semibold">
                        {codeObj?.code || "IN"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {inchargeTodayProfiles.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Tidak ada karyawan incharge hari ini.</p>
              )}
            </div>
          </div>

          {/* Expiring Contracts */}
          <div className="bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 rounded-xl shadow-sm">
            <div className="p-4 border-b bg-red-50/50 dark:bg-red-900/10">
              <h2 className="font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Peringatan Kontrak
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {contractWarnings.map(item => (
                <div key={item!.profile.id} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item!.profile.full_name}</p>
                    <p className="text-xs text-gray-500">{new Date(item!.profile.contract_end_date!).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="text-right pl-2 flex-shrink-0">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{item!.sisaHari}</p>
                    <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold">Hari Lagi</p>
                  </div>
                </div>
              ))}
              {contractWarnings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Semua kontrak terpantau aman.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
