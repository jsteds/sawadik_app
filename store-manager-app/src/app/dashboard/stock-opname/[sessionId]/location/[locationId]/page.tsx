"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getStockOpnameItems,
  getStockOpnameItemsBySearch,
  getStockOpnameCounts,
  saveStockOpnameCount,
  markLocationComplete,
  getStockOpnameLocations,
} from "@/lib/supabase";
import { StockOpnameItem } from "@/lib/types";
import {
  ArrowLeft, Search, Minus, Plus, Loader2, PackageSearch,
  CheckCircle2, Save, MapPin, Hash
} from "lucide-react";
import Link from "next/link";

export default function StockOpnameCountPage({
  params,
}: {
  params: Promise<{ sessionId: string; locationId: string }>;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const isAreaManager = profile?.role === "area_manager";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");

  // Search state
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StockOpnameItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Counts: itemId → qty (for items currently in search results)
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Track which items have unsaved changes
  const [pendingSave, setPendingSave] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Already-counted items summary for this location
  const [countedSummary, setCountedSummary] = useState<{ item_id: string; qty: number; item_name: string; article_code: string }[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [completingLocation, setCompletingLocation] = useState(false);
  const [locationComplete, setLocationComplete] = useState(false);
  const [allSessionItems, setAllSessionItems] = useState<StockOpnameItem[]>([]);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then((p) => {
      setSessionId(p.sessionId);
      setLocationId(p.locationId);
    });
  }, [params]);

  useEffect(() => {
    if (sessionId && locationId) {
      loadLocationInfo();
      loadCountedSummary();
      loadAllSessionItems();
    }
  }, [sessionId, locationId]);

  async function loadAllSessionItems() {
    if (!sessionId) return;
    const items = await getStockOpnameItems(sessionId);
    setAllSessionItems(items);
  }

  async function loadLocationInfo() {
    if (!sessionId) return;
    const locs = await getStockOpnameLocations(sessionId);
    const loc = locs.find((l: any) => l.id === locationId);
    if (loc) {
      setLocationName(loc.name || "Lokasi");
      setLocationComplete(loc.is_complete === true);
    }
  }

  async function loadCountedSummary() {
    if (!sessionId || !locationId) return;
    setLoadingCounts(true);
    const countsData = await getStockOpnameCounts(sessionId, locationId);
    const summary = countsData
      .filter((c: any) => c.qty > 0)
      .map((c: any) => ({
        item_id: c.item_id,
        qty: c.qty,
        item_name: c.item?.item_name || "-",
        article_code: c.item?.article_code || "-",
      }));
    setCountedSummary(summary);

    // Seed countMap from already-counted data
    const countMap: Record<string, number> = {};
    countsData.forEach((c: any) => { countMap[c.item_id] = c.qty; });
    setCounts((prev) => ({ ...prev, ...countMap }));

    setLoadingCounts(false);
  }

  // Instant local search + debounced fallback
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Filter in memory instantly if allSessionItems loaded
    if (allSessionItems.length > 0) {
      const words = value.toLowerCase().trim().split(/\s+/);
      const filtered = allSessionItems.filter(item => {
        const name = (item.item_name || "").toLowerCase();
        const code = (item.article_code || "").toLowerCase();
        return words.every(w => name.includes(w) || code.includes(w));
      }).slice(0, 50);
      setSearchResults(filtered);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      if (!sessionId) return;
      const results = await getStockOpnameItemsBySearch(sessionId, value);
      setSearchResults(results);
      setSearching(false);
    }, 250);
  };

  const updateLocalQty = (itemId: string, newQty: number) => {
    if (newQty < 0) return;
    setCounts((prev) => ({ ...prev, [itemId]: newQty }));
    setPendingSave((prev) => new Set(prev).add(itemId));
  };

  const handleSaveItem = async (itemId: string) => {
    if (!locationId || !profile) return;
    const qty = counts[itemId] ?? 0;
    setSavingId(itemId);
    const { error } = await saveStockOpnameCount(locationId, itemId, qty, profile.id);
    setSavingId(null);
    if (error) {
      alert("Gagal menyimpan: " + error);
      return;
    }
    setPendingSave((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    // Refresh summary
    await loadCountedSummary();
  };

  const handleCompleteLocation = async () => {
    if (!locationId) return;
    if (!confirm(`Tandai "${locationName}" sebagai selesai dihitung? Anda masih bisa mengubah data setelah ini.`)) return;

    setCompletingLocation(true);
    const { error } = await markLocationComplete(locationId, true);
    setCompletingLocation(false);

    if (error) {
      alert("Gagal menyimpan status lokasi: " + error);
      return;
    }
    setLocationComplete(true);
    router.push(`/dashboard/stock-opname/${sessionId}`);
  };

  if (!sessionId || !locationId) return null;

  return (
    <div className="min-h-full max-w-2xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/stock-opname/${sessionId}`}
          className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Sesi
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-blue-500" />
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {locationName || "Hitung Fisik"}
              </h1>
              {locationComplete && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">Cari nama atau kode artikel untuk mulai menghitung</p>
          </div>
        </div>
      </div>

      {isAreaManager && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <p className="font-bold text-blue-900 text-sm">Mode Pantau Area Manager (Read-Only)</p>
            <p className="text-blue-700 text-xs mt-0.5">Penginputan jumlah fisik dinonaktifkan untuk peran Area Manager.</p>
          </div>
        </div>
      )}

      {/* Search Box */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4 sticky top-4 z-20">
        <div className="relative">
          {searching ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          )}
          <input
            type="text"
            autoFocus
            placeholder="Ketik nama barang atau kode artikel (misal: lychee, W000160)..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 text-base transition-all"
          />
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          {search.length > 0 && searchResults.length === 0 && !searching ? (
            <p className="text-xs text-slate-400">
              Tidak ada barang yang cocok dengan "<span className="font-semibold">{search}</span>"
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              {allSessionItems.length > 0
                ? `Total ${allSessionItems.length} artikel di sesi ini`
                : "Ketik untuk mencari artikel..."}
            </p>
          )}
          {allSessionItems.length > 0 && searchResults.length === 0 && (
            <button
              onClick={() => {
                setSearchResults(allSessionItems.slice(0, 50));
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Tampilkan Daftar Barang ({allSessionItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            {searchResults.length} hasil ditemukan
          </p>
          {searchResults.map((item) => {
            const qty = counts[item.id] ?? 0;
            const isSaving = savingId === item.id;
            const isDirty = pendingSave.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl shadow-sm p-4 transition-all ${
                  isDirty ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{item.item_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 font-mono">
                        {item.article_code || "-"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                        {item.uom || "EA"}
                      </span>
                      {item.system_qty > 0 && (
                        <span className="text-xs text-slate-400">
                          Sistem: {item.system_qty.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => updateLocalQty(item.id, qty - 1)}
                    disabled={qty <= 0 || isSaving}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1 max-w-[100px]">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={qty === 0 ? "" : qty}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, "");
                        const num = cleaned === "" ? 0 : parseInt(cleaned, 10);
                        updateLocalQty(item.id, num);
                      }}
                      disabled={isSaving || isAreaManager}
                      className="w-full text-center font-bold text-xl py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hide-arrows disabled:opacity-60"
                    />
                    {isSaving && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => updateLocalQty(item.id, qty + 1)}
                    disabled={isSaving || isAreaManager}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <span className="text-sm font-bold text-slate-500 w-10">{item.uom || "EA"}</span>

                  {/* Save button */}
                  <button
                    onClick={() => handleSaveItem(item.id)}
                    disabled={isSaving || isAreaManager || !isDirty}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isDirty && !isAreaManager
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>

                {/* Quick add buttons */}
                <div className="flex items-center gap-1.5">
                  {[10, 100, 500, 1000].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateLocalQty(item.id, qty + n)}
                      disabled={isSaving || isAreaManager}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors disabled:opacity-40"
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state when no search */}
      {!search && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <PackageSearch className="w-14 h-14 mb-4 text-slate-200" />
          <p className="text-base font-semibold text-slate-500 mb-1">Mulai pencarian barang</p>
          <p className="text-sm text-center max-w-xs">
            Ketik nama atau kode artikel di kolom pencarian di atas. Barang yang dicari akan muncul di sini.
          </p>
        </div>
      )}

      {/* Summary: already counted */}
      {!loadingCounts && countedSummary.length > 0 && (
        <div className="mt-4 bg-white/70 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-700">
              Sudah Dihitung di Lokasi Ini ({countedSummary.length} item)
            </h3>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {countedSummary.map((c) => (
              <div key={c.item_id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-semibold text-slate-700">{c.item_name}</span>
                  <span className="text-slate-400 font-mono text-xs ml-2">{c.article_code}</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">{c.qty.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Location button — hidden for Area Manager */}
      {!isAreaManager && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex flex-col gap-2 max-w-2xl mx-auto">
          {pendingSave.size > 0 && (
            <p className="text-xs text-amber-600 font-semibold text-center">
              ⚠ Ada {pendingSave.size} item yang belum di-Save. Klik tombol Save pada masing-masing item terlebih dahulu.
            </p>
          )}
          <button
            onClick={handleCompleteLocation}
            disabled={completingLocation || pendingSave.size > 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            {completingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Save Perhitungan di {locationName || "Lokasi Ini"}
          </button>
        </div>
      )}

      {/* Bottom padding for fixed button */}
      <div className="h-24" />

      <style dangerouslySetInnerHTML={{
        __html: `
          .hide-arrows::-webkit-outer-spin-button,
          .hide-arrows::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          .hide-arrows { -moz-appearance: textfield; }
        `
      }} />
    </div>
  );
}
