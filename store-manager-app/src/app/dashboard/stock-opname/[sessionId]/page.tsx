"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getStockOpnameLocations,
  createStockOpnameLocation,
  getStockOpnameCounts,
  updateStockOpnameSessionStatus
} from "@/lib/supabase";
import { StockOpnameLocation } from "@/lib/types";
import { Plus, MapPin, ArrowLeft, UploadCloud, Loader2, Package, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function StockOpnameSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const { profile } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [locations, setLocations] = useState<StockOpnameLocation[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    params.then(p => setSessionId(p.sessionId));
  }, [params]);

  useEffect(() => {
    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  async function loadData() {
    if (!sessionId) return;
    setLoading(true);
    const locs = await getStockOpnameLocations(sessionId);
    const cnts = await getStockOpnameCounts(sessionId);
    setLocations(locs);
    setCounts(cnts);
    setLoading(false);
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim() || !sessionId || !profile) return;

    setSubmitting(true);
    const { data, error } = await createStockOpnameLocation(sessionId, newLocationName.trim(), profile.id);
    if (!error && data) {
      setNewLocationName("");
      setIsAddingLocation(false);
      await loadData();
    } else {
      alert("Gagal menambahkan lokasi");
    }
    setSubmitting(false);
  };

  const handleUploadToRepotin = async () => {
    if (!sessionId) return;
    if (!confirm("Apakah Anda yakin ingin mengakhiri sesi ini dan mengunggah data ke Repot.in?")) return;

    setUploading(true);
    // Simulasi upload ke Repot.in
    await new Promise(r => setTimeout(r, 1500));
    const { error } = await updateStockOpnameSessionStatus(sessionId, "uploaded");
    
    if (error) {
      alert("Gagal mengunggah ke Repot.in: " + error);
    } else {
      alert("Berhasil diunggah ke Repot.in!");
      router.push("/dashboard/stock-opname");
    }
    setUploading(false);
  };

  // Hitung akumulasi qty per item dari seluruh lokasi
  const accumulatedItems = counts.reduce((acc, curr) => {
    const articleCode = curr.item.article_code || "UNKNOWN";
    if (!acc[articleCode]) {
      acc[articleCode] = {
        name: curr.item.item_name,
        qty: 0,
        article: articleCode
      };
    }
    acc[articleCode].qty += curr.qty;
    return acc;
  }, {} as Record<string, {name: string, qty: number, article: string}>);

  const accumulatedList = Object.values(accumulatedItems).sort((a: any, b: any) => a.article.localeCompare(b.article));

  if (!sessionId) return null;

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/dashboard/stock-opname" className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium mb-2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Detail Opname</h1>
          <p className="text-slate-500 mt-1">Buat lokasi hitung dan pantau akumulasi</p>
        </div>
        
        <button 
          onClick={handleUploadToRepotin}
          disabled={uploading || loading}
          className="glass-button bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/50 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-70 transition-all"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          Selesaikan & Upload ke Repot.in
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Lokasi Hitung */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-500" />
              Lokasi Hitung
            </h2>
            <button 
              onClick={() => setIsAddingLocation(!isAddingLocation)}
              className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Lokasi
            </button>
          </div>

          {isAddingLocation && (
            <form onSubmit={handleAddLocation} className="glass-card bg-blue-50/50 border border-blue-200 p-4 rounded-2xl flex gap-3">
              <input 
                type="text" 
                autoFocus
                placeholder="Misal: Rak Baju Depan, Gudang Kardus..."
                value={newLocationName}
                onChange={e => setNewLocationName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit" 
                disabled={submitting || !newLocationName.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Simpan
              </button>
            </form>
          )}

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-slate-200/50 rounded-xl" />
              <div className="h-16 bg-slate-200/50 rounded-xl" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-10 bg-white/40 border border-dashed border-slate-300 rounded-2xl">
              <p className="text-slate-500">Belum ada lokasi hitung.<br/>Klik "Tambah Lokasi" untuk mulai mendata rak/area.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {locations.map(loc => {
                const totalItemDiLokasi = counts.filter(c => c.location_id === loc.id).length;
                
                return (
                  <div 
                    key={loc.id} 
                    onClick={() => router.push(`/dashboard/stock-opname/${sessionId}/location/${loc.id}`)}
                    className="glass-card bg-white/70 hover:bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{loc.name}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {totalItemDiLokasi} jenis barang dihitung
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Akumulasi */}
        <div className="lg:col-span-1">
          <div className="glass-card bg-slate-800 text-white rounded-3xl p-6 sticky top-8 shadow-xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-100">
              <Package className="w-5 h-5 text-blue-400" />
              Akumulasi Fisik
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : accumulatedList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada barang yang dihitung.
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {accumulatedList.map((item: any) => (
                  <div key={item.article} className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                    <div className="max-w-[70%]">
                      <p className="font-bold text-slate-200 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.article}</p>
                    </div>
                    <div className="font-mono text-xl font-bold text-emerald-400">
                      {item.qty}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && accumulatedList.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Item Unik</span>
                <span className="text-2xl font-black text-white">{accumulatedList.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
