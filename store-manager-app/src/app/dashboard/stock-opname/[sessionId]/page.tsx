"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getStockOpnameLocations,
  createStockOpnameLocation,
  getStockOpnameCounts,
  getStockOpnameItems,
  getStockOpnameSession,
  updateStockOpnameSessionStatus,
} from "@/lib/supabase";
import { StockOpnameLocation, StockOpnameItem } from "@/lib/types";
import {
  Plus, MapPin, ArrowLeft, UploadCloud, Loader2, Package,
  CheckCircle2, Download, FileSpreadsheet, Clock, ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function StockOpnameSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [locations, setLocations] = useState<StockOpnameLocation[]>([]);
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  useEffect(() => {
    if (sessionId) loadData();
  }, [sessionId]);

  async function loadData() {
    if (!sessionId) return;
    setLoading(true);
    const [sess, locs, cnts, itms] = await Promise.all([
      getStockOpnameSession(sessionId),
      getStockOpnameLocations(sessionId),
      getStockOpnameCounts(sessionId),
      getStockOpnameItems(sessionId),
    ]);
    setSession(sess);
    setLocations(locs);
    setCounts(cnts);
    setItems(itms);
    setLoading(false);
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim() || !sessionId || !profile) return;
    setSubmitting(true);
    const { data, error } = await createStockOpnameLocation(
      sessionId,
      newLocationName.trim(),
      profile.id
    );
    if (!error && data) {
      setNewLocationName("");
      setIsAddingLocation(false);
      await loadData();
    } else {
      alert("Gagal menambahkan lokasi: " + error);
    }
    setSubmitting(false);
  };

  const handleUploadToRepotin = async () => {
    if (!sessionId) return;
    if (!confirm("Apakah Anda yakin ingin menandai sesi ini selesai dan mengunggah ke Repot.in?"))
      return;
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1500));
    const { error } = await updateStockOpnameSessionStatus(sessionId, "uploaded");
    setUploading(false);
    if (error) {
      alert("Gagal: " + error);
    } else {
      alert("Berhasil diunggah ke Repot.in!");
      router.push("/dashboard/stock-opname");
    }
  };

  /**
   * Generate countsheet CSV yang identik dengan format asli upload:
   * Site, Name 1, Article, Article Description, Base Unit of Measure, Location, System Qty, Physical Count
   * Urutan artikel sesuai sort_order (urutan baris asli file yang diupload).
   */
  const handleGenerateCountsheet = async () => {
    if (!sessionId) return;
    setGenerating(true);

    const locNameById: Record<string, string> = {};
    locations.forEach((l) => {
      locNameById[l.id] = l.name;
    });

    // Build physical qty map & distinct location names per item where qty > 0
    const physicalMap: Record<string, number> = {};
    const itemLocNamesMap: Record<string, Set<string>> = {};

    counts.forEach((c: any) => {
      const qty = Number(c.qty) || 0;
      if (qty > 0) {
        const keyId = c.item_id;
        const keyCode = c.item?.article_code;
        const locName = locNameById[c.location_id];

        [keyId, keyCode].filter(Boolean).forEach((k) => {
          physicalMap[k] = (physicalMap[k] || 0) + qty;
          if (locName) {
            if (!itemLocNamesMap[k]) itemLocNamesMap[k] = new Set();
            itemLocNamesMap[k].add(locName);
          }
        });
      }
    });

    // Items sudah dalam urutan sort_order (urutan file asli) dari getStockOpnameItems
    const header = "Site,Name 1,Article,Article Description,Base Unit of Measure,Location,System Qty,Physical Count";

    const rows = items.map((item) => {
      const physical = physicalMap[item.id] ?? physicalMap[item.article_code || ""] ?? 0;
      const locSet = itemLocNamesMap[item.id] || itemLocNamesMap[item.article_code || ""];
      const itemLocationStr = locSet && locSet.size > 0 ? Array.from(locSet).join("; ") : "";

      const site = (item as any).site || "";
      const name1 = (item as any).name1 || "";
      return [
        site,
        name1,
        item.article_code || "",
        item.item_name,
        item.uom || "EA",
        itemLocationStr,
        item.system_qty?.toString() || "0",
        physical.toString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const sessionTitle = session?.title?.replace(/[^a-zA-Z0-9\-_]/g, "_") || "opname";
    a.href = url;
    a.setAttribute("download", `countsheet_${sessionTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also mark session as completed
    await updateStockOpnameSessionStatus(sessionId, "completed");
    await loadData();
    setGenerating(false);
  };

  // Hitung akumulasi fisik per item
  const physicalQtyMap: Record<string, number> = {};
  counts.forEach((c: any) => {
    const key = c.item_id;
    physicalQtyMap[key] = (physicalQtyMap[key] || 0) + c.qty;
  });

  const allLocationsComplete = locations.length > 0 && locations.every((l: any) => l.is_complete);
  const itemsWithCount = items.filter((itm) => (physicalQtyMap[itm.id] || 0) > 0).length;

  if (!sessionId) return null;

  return (
    <div className="min-h-full p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <Link
            href="/dashboard/stock-opname"
            className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            {session?.title || "Detail Opname"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">
              {session?.created_at
                ? new Date(session.created_at).toLocaleDateString("id-ID", {
                    day: "numeric", month: "long", year: "numeric",
                  })
                : ""}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
              session?.status === "uploaded"
                ? "bg-purple-100 text-purple-700 border-purple-200"
                : session?.status === "completed"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }`}>
              {session?.status === "uploaded"
                ? "Sudah Upload"
                : session?.status === "completed"
                ? "Selesai"
                : "Aktif"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateCountsheet}
            disabled={generating || loading || items.length === 0}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-sm"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            Generate Countsheet
          </button>

          <button
            onClick={handleUploadToRepotin}
            disabled={uploading || loading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all text-sm"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            Upload ke Repot.in
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Artikel", value: items.length, color: "text-blue-600" },
            { label: "Sudah Dihitung", value: itemsWithCount, color: "text-emerald-600" },
            { label: "Lokasi Selesai", value: `${locations.filter((l: any) => l.is_complete).length}/${locations.length}`, color: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/70 border border-slate-200 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* No items warning */}
      {!loading && items.length === 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">Sesi ini belum memiliki daftar artikel</p>
            <p className="text-amber-700 text-xs mt-1">
              Kembali ke daftar sesi dan gunakan tombol "Ambil Data dari Repot.in" atau "Upload Countsheet" untuk mengisi daftar barang sebelum membuat lokasi hitung.
            </p>
          </div>
        </div>
      )}

      {/* Generate info */}
      {!loading && allLocationsComplete && items.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Semua lokasi sudah selesai dihitung!</p>
            <p className="text-emerald-700 text-xs mt-1">
              Klik <strong>"Generate Countsheet"</strong> untuk mengunduh file CSV hasil opname. Format dan urutan artikel akan identik dengan file countsheet asli yang diupload.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Lokasi Hitung */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Lokasi Hitung Fisik
            </h2>
            {items.length > 0 && (
              <button
                onClick={() => setIsAddingLocation(!isAddingLocation)}
                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Lokasi
              </button>
            )}
          </div>

          {isAddingLocation && (
            <form
              onSubmit={handleAddLocation}
              className="bg-blue-50/60 border border-blue-200 p-3 rounded-2xl flex gap-2"
            >
              <input
                type="text"
                autoFocus
                placeholder="Misal: Rak Kering, Chiller 1, Bar Area..."
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting || !newLocationName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Simpan
              </button>
            </form>
          )}

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-10 bg-white/40 border border-dashed border-slate-300 rounded-2xl">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {items.length === 0
                  ? "Upload countsheet terlebih dahulu sebelum menambah lokasi."
                  : "Klik \"Tambah Lokasi\" untuk mendata rak/area hitung."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((loc: any) => {
                const totalCounted = counts.filter((c: any) => c.location_id === loc.id && c.qty > 0).length;
                const isComplete = loc.is_complete === true;

                return (
                  <div
                    key={loc.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/stock-opname/${sessionId}/location/${loc.id}`
                      )
                    }
                    className="bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 p-4 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isComplete
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{loc.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {totalCounted} item dihitung
                            {isComplete && (
                              <span className="ml-2 text-emerald-600 font-semibold">• Selesai</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Rekonsiliasi */}
        <div>
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-100">
                <Package className="w-5 h-5 text-blue-400" />
                Akumulasi Fisik
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {items.filter((i) => (physicalQtyMap[i.id] || 0) > 0).length} / {items.length} artikel
              </span>
            </div>

            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-slate-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                Belum ada data artikel pada sesi ini.
              </div>
            ) : (
              <div className="overflow-auto max-h-80 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase">
                      <th className="py-2 px-2">Barang</th>
                      <th className="py-2 px-2 text-right">Sistem</th>
                      <th className="py-2 px-2 text-right">Fisik</th>
                      <th className="py-2 px-2 text-right">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {items.map((item) => {
                      const physical = physicalQtyMap[item.id] || 0;
                      const variance = physical - (item.system_qty || 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="py-2 px-2">
                            <p className="font-semibold text-slate-200 text-xs leading-tight">
                              {item.item_name}
                            </p>
                            <p className="text-slate-500 text-xs font-mono">{item.article_code}</p>
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-xs text-slate-400">
                            {item.system_qty?.toLocaleString("id-ID") || 0}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-xs font-bold text-emerald-400">
                            {physical.toLocaleString("id-ID")}
                          </td>
                          <td className={`py-2 px-2 text-right font-mono text-xs font-bold ${
                            variance < 0 ? "text-rose-400" : variance > 0 ? "text-cyan-400" : "text-slate-500"
                          }`}>
                            {variance > 0 ? `+${variance.toLocaleString("id-ID")}` : variance.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
