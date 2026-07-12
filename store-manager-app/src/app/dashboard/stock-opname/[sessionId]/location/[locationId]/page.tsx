"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getStockOpnameItems,
  getStockOpnameCounts,
  saveStockOpnameCount
} from "@/lib/supabase";
import { StockOpnameItem, StockOpnameCount } from "@/lib/types";
import { ArrowLeft, Search, Save, Minus, Plus, Loader2, PackageSearch } from "lucide-react";
import Link from "next/link";

export default function StockOpnameCountPage({ params }: { params: Promise<{ sessionId: string, locationId: string }> }) {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => {
      setSessionId(p.sessionId);
      setLocationId(p.locationId);
    });
  }, [params]);

  useEffect(() => {
    if (sessionId && locationId) {
      loadData();
    }
  }, [sessionId, locationId]);

  async function loadData() {
    if (!sessionId || !locationId) return;
    setLoading(true);
    
    // Ambil daftar barang dari session
    const itemsData = await getStockOpnameItems(sessionId);
    
    // Ambil yang sudah pernah dihitung di lokasi ini
    const countsData = await getStockOpnameCounts(sessionId, locationId);
    
    const countMap: Record<string, number> = {};
    countsData.forEach(c => {
      countMap[c.item_id] = c.qty;
    });

    setItems(itemsData);
    setCounts(countMap);
    setLoading(false);
  }

  // Update qty dan auto-save ke DB
  const updateQty = async (itemId: string, newQty: number) => {
    if (newQty < 0 || !locationId || !profile) return;
    
    setCounts(prev => ({ ...prev, [itemId]: newQty }));
    setSavingId(itemId);
    
    const { error } = await saveStockOpnameCount(locationId, itemId, newQty, profile.id);
    
    setSavingId(null);
    if (error) {
      alert("Gagal menyimpan data: " + error);
    }
  };

  const filteredItems = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (item.article_code?.toLowerCase().includes(s) || item.item_name.toLowerCase().includes(s));
  });

  if (!sessionId || !locationId) return null;

  return (
    <div className="min-h-full p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href={`/dashboard/stock-opname/${sessionId}`} className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium mb-2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Sesi
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Hitung Fisik</h1>
          <p className="text-slate-500 mt-1">Pilih barang dan masukkan jumlahnya di lokasi ini.</p>
        </div>
      </div>

      <div className="glass-card bg-white/70 border border-slate-200 rounded-3xl p-6 mb-6 sticky top-8 z-10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari berdasarkan artikel atau nama barang..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 shadow-sm text-lg"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
          <p>Memuat daftar barang...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/40 rounded-3xl border border-dashed border-slate-300">
          <PackageSearch className="w-12 h-12 mb-4 text-slate-300" />
          <p className="text-lg">Barang tidak ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const qty = counts[item.id] || 0;
            const isSaving = savingId === item.id;
            
            return (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition-colors shadow-sm">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-slate-800 text-lg">{item.item_name}</p>
                  <p className="text-sm text-slate-500 font-mono mt-1">Ref: {item.article_code || "-"}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateQty(item.id, qty - 1)}
                    disabled={qty <= 0 || isSaving}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  
                  <div className="relative w-20">
                    <input 
                      type="number" 
                      value={qty}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                      disabled={isSaving}
                      className="w-full text-center font-bold text-2xl py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hide-arrows"
                    />
                    {isSaving && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => updateQty(item.id, qty + 1)}
                    disabled={isSaving}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Style to hide number input arrows */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-arrows {
          -moz-appearance: textfield;
        }
      `}} />
    </div>
  );
}
