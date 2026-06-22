"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getSchedules, getShiftCodes, upsertSchedules, upsertShiftCode, deleteShiftCode } from "@/lib/actions/schedule";
import { Profile, Schedule, ShiftCode } from "@/lib/types";
import { Save, Plus, Trash2, ArrowLeft, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ScheduleManagerPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [shiftCodes, setShiftCodes] = useState<ShiftCode[]>([]);
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  
  // Local state for edits
  const [draftSchedules, setDraftSchedules] = useState<Record<string, string | null>>({}); // key: `${profileId}_${dateStr}`, value: shiftCodeId
  const [activeTab, setActiveTab] = useState<"assign" | "codes">("assign");

  // Shift Code Form
  const [newCode, setNewCode] = useState("");
  const [newTimeIn, setNewTimeIn] = useState("");
  const [newTimeOut, setNewTimeOut] = useState("");

  useEffect(() => {
    if (!profile?.store_id) return;
    fetchData();
  }, [profile?.store_id, targetDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const startDate = toInputDate(new Date(year, month, 1));
      const endDate = toInputDate(new Date(year, month + 1, 0));

      const [shiftCodesData, schedData] = await Promise.all([
        getShiftCodes(),
        getSchedules(profile!.store_id!, startDate, endDate),
      ]);

      setShiftCodes(shiftCodesData);
      setProfiles(schedData.profiles);
      
      // Build draft map
      const map: Record<string, string | null> = {};
      schedData.schedules.forEach(s => {
        map[`${s.profile_id}_${s.date}`] = s.shift_code_id;
      });
      setDraftSchedules(map);

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveSchedules = async () => {
    if (!profile?.store_id) return;
    setSaving(true);
    try {
      const payloads = Object.keys(draftSchedules).map(key => {
        const [profile_id, date] = key.split("_");
        return {
          profile_id,
          date,
          shift_code_id: draftSchedules[key]
        };
      });

      await upsertSchedules(profile.store_id, payloads);
      alert("Jadwal berhasil disimpan!");
    } catch (err: any) {
      alert("Gagal menyimpan jadwal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddShiftCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setSaving(true);
    try {
      await upsertShiftCode({
        code: newCode.trim().toUpperCase(),
        time_in: newTimeIn || undefined,
        time_out: newTimeOut || undefined
      });
      setNewCode("");
      setNewTimeIn("");
      setNewTimeOut("");
      const updatedCodes = await getShiftCodes();
      setShiftCodes(updatedCodes);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShiftCode = async (id: string) => {
    if (!confirm("Hapus kode shift ini?")) return;
    try {
      await deleteShiftCode(id);
      setShiftCodes(shiftCodes.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

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

  const updateDraft = (profileId: string, dateStr: string, codeId: string | null) => {
    setDraftSchedules(prev => ({
      ...prev,
      [`${profileId}_${dateStr}`]: codeId
    }));
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/schedule" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mb-2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Jadwal
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola Jadwal</h1>
          <p className="text-sm text-gray-500 mt-1">Assign shift karyawan dan kelola Master Shift Code</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("assign")}
          className={cn(
            "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
            activeTab === "assign" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Assign Jadwal (Roster)
        </button>
        <button
          onClick={() => setActiveTab("codes")}
          className={cn(
            "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
            activeTab === "codes" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Master Shift Codes
        </button>
      </div>

      {activeTab === "assign" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="month"
                value={`${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  if (y && m) setTargetDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                }}
                className="border px-3 py-1.5 rounded-md shadow-sm dark:bg-zinc-800 dark:border-zinc-700"
              />
            </div>
            <button
              onClick={handleSaveSchedules}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Jadwal
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 dark:bg-zinc-900/50 border-b uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium sticky left-0 bg-gray-50/90 dark:bg-zinc-900/90 z-10">Karyawan</th>
                  {monthDates.map((d) => (
                    <th key={d.toISOString()} className="px-2 py-3 font-medium text-center min-w-[70px]">
                      {d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 font-medium border-r dark:border-zinc-800">
                      {p.full_name}
                    </td>
                    {monthDates.map((d) => {
                      const dateStr = toInputDate(d);
                      const key = `${p.id}_${dateStr}`;
                      const currentCodeId = draftSchedules[key] || "";
                      
                      return (
                        <td key={dateStr} className="px-1 py-2 text-center">
                          <select
                            value={currentCodeId}
                            onChange={(e) => updateDraft(p.id, dateStr, e.target.value || null)}
                            className="w-full text-xs p-1 border rounded dark:bg-zinc-800 dark:border-zinc-700 cursor-pointer focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            {shiftCodes.map(code => (
                              <option key={code.id} value={code.id}>{code.code}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={100} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada karyawan di toko ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "codes" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <form onSubmit={handleAddShiftCode} className="bg-white dark:bg-zinc-900 border rounded-xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Tambah Shift Code</h2>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kode (misal: P01, OFF)</label>
                <input required value={newCode} onChange={e=>setNewCode(e.target.value)} type="text" className="w-full border rounded-md px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Jam Masuk</label>
                  <input value={newTimeIn} onChange={e=>setNewTimeIn(e.target.value)} type="time" className="w-full border rounded-md px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Jam Keluar</label>
                  <input value={newTimeOut} onChange={e=>setNewTimeOut(e.target.value)} type="time" className="w-full border rounded-md px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700" />
                </div>
              </div>
              <button disabled={saving} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white flex justify-center items-center gap-2 py-2 rounded-md font-medium text-sm transition-colors">
                <Plus className="w-4 h-4" /> Tambah Kode
              </button>
            </form>
          </div>
          
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 dark:bg-zinc-900/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kode</th>
                    <th className="px-4 py-3 font-medium">Jam Kerja</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {shiftCodes.map(code => (
                    <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-bold">{code.code}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {code.time_in ? `${code.time_in} - ${code.time_out}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteShiftCode(code.id)} className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shiftCodes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-gray-500">Belum ada master kode shift.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
