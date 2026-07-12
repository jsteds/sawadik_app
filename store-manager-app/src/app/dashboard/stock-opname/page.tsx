"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getStockOpnameSessions,
  createStockOpnameSession,
  insertStockOpnameItems
} from "@/lib/supabase";
import { StockOpnameSession } from "@/lib/types";
import { FileText, Download, Play, CheckCircle2, Search, ArrowRight, Loader2, Upload } from "lucide-react";

export default function StockOpnamePage() {
  const router = useRouter();
  const { profile, activeStoreId, isSuperAdmin } = useAuth();
  const [sessions, setSessions] = useState<StockOpnameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveStoreId = isSuperAdmin ? activeStoreId : profile?.store_id;

  useEffect(() => {
    if (effectiveStoreId) {
      loadSessions();
    }
  }, [effectiveStoreId]);

  async function loadSessions() {
    if (!effectiveStoreId) return;
    setLoading(true);
    const data = await getStockOpnameSessions(effectiveStoreId);
    setSessions(data);
    setLoading(false);
  }

  // Handle CSV Upload (Simulasi tarik data Repot.in)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveStoreId || !profile?.id) return;

    setSyncLoading(true);

    try {
      const text = await file.text();
      const rows = text.split("\n").filter(row => row.trim().length > 0);

      // Asumsi CSV: article_code,item_name,system_qty
      // Lewati header (baris pertama)
      const items = rows.slice(1).map(row => {
        const cols = row.split(",");
        return {
          article_code: cols[0]?.trim() || null,
          item_name: cols[1]?.trim() || "Item Tanpa Nama",
          system_qty: parseInt(cols[2]?.trim() || "0", 10)
        };
      });

      if (items.length === 0) {
        alert("File CSV kosong atau format tidak valid.");
        setSyncLoading(false);
        return;
      }

      // Buat session baru
      const sessionTitle = `Opname ${new Date().toLocaleDateString("id-ID")}`;
      const { data: session, error: sessionErr } = await createStockOpnameSession(effectiveStoreId, sessionTitle, profile.id);

      if (sessionErr || !session) throw new Error(sessionErr || "Gagal membuat sesi");

      // Insert items
      const itemsToInsert = items.map(item => ({
        ...item,
        session_id: session.id
      }));

      const { error: itemErr } = await insertStockOpnameItems(itemsToInsert);
      if (itemErr) throw new Error(itemErr);

      await loadSessions();
      alert(`Berhasil membuat sesi opname dengan ${items.length} item.`);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat memproses file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSyncLoading(false);
    }
  };

  if (!effectiveStoreId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        Silakan pilih toko terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Stock Opname</h1>
          <p className="text-slate-500 mt-1">Kelola dan sinkronisasi perhitungan fisik barang dengan Repot.in</p>
        </div>

        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={syncLoading}
          className="glass-button bg-blue-600 hover:bg-blue-700 text-white border-blue-500/50 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-70 transition-all"
        >
          {syncLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          Upload Countsheet
        </button>
      </div>

      {/* Main Content */}
      <div className="glass-card bg-white/50 border border-slate-200 rounded-3xl p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Daftar Sesi Opname
        </h2>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-200/50 rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-300" />
            </div>
            <h3 className="text-slate-800 font-bold mb-1">Belum ada Sesi Opname</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">Mulai dengan menarik data (upload countsheet) dari Repot.in untuk memulai perhitungan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => router.push(`/dashboard/stock-opname/${session.id}`)}
                className="group flex items-center justify-between p-4 bg-white/60 hover:bg-white border border-slate-200 rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${session.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                      session.status === 'uploaded' ? 'bg-purple-100 text-purple-600' :
                        'bg-blue-100 text-blue-600'
                    }`}>
                    {session.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                      session.status === 'uploaded' ? <Upload className="w-6 h-6" /> :
                        <Play className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{session.title}</h3>
                    <p className="text-xs text-slate-500 flex gap-2">
                      <span>Mulai: {new Date(session.created_at).toLocaleDateString('id-ID')}</span>
                      <span>•</span>
                      <span className="capitalize">Status: {session.status}</span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
