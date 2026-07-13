"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getStockOpnameSessions,
  createStockOpnameSession,
  insertStockOpnameItems
} from "@/lib/supabase";
import { StockOpnameSession, DEFAULT_REPOTIN_COUNT_SHEET } from "@/lib/types";
import { FileText, Download, Play, CheckCircle2, Search, ArrowRight, Loader2, Upload, RefreshCw, CloudDownload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export default function StockOpnamePage() {
  const router = useRouter();
  const { profile, activeStoreId, isSuperAdmin } = useAuth();
  const [sessions, setSessions] = useState<StockOpnameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [repotinLoading, setRepotinLoading] = useState(false);
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

  // 1. Mode: Ambil Data dari Repot.in (Simulasi integrasi ERP Countsheet langsung)
  const handleFetchFromRepotin = async () => {
    if (!effectiveStoreId || !profile?.id) return;
    setRepotinLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const dateStr = new Date().toLocaleDateString("id-ID");
      const sessionTitle = `Opname Repot.in (${dateStr})`;
      const { data: session, error: sessionErr } = await createStockOpnameSession(
        effectiveStoreId,
        sessionTitle,
        profile.id
      );

      if (sessionErr || !session) {
        throw new Error(sessionErr || "Gagal membuat sesi opname dari Repot.in");
      }

      // sort_order menjaga urutan artikel tetap sesuai sumber Repot.in
      const itemsToInsert = DEFAULT_REPOTIN_COUNT_SHEET.map((item, index) => ({
        session_id: session.id,
        article_code: item.article_code,
        item_name: item.item_name,
        system_qty: item.system_qty,
        uom: item.uom,
        site: item.site,
        sort_order: index,
      }));

      const { error: itemErr } = await insertStockOpnameItems(itemsToInsert);
      if (itemErr) throw new Error(itemErr);

      await loadSessions();
      router.push(`/dashboard/stock-opname/${session.id}`);
    } catch (err: any) {
      alert(err.message || "Gagal mengambil data dari Repot.in");
    } finally {
      setRepotinLoading(false);
    }
  };

  // 2. Mode: Upload Countsheet (.csv / .xlsx / .xls)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveStoreId || !profile?.id) return;

    setSyncLoading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      // ── Baca file menjadi array of arrays (rows × cols) ──────────────────
      let rawRows: string[][] = [];

      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        const headerLine = lines[0] ?? "";
        const delimiter = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
        rawRows = lines.map(line =>
          line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""))
        );
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // sheet_to_json with header:1 → array of arrays, defval empty string
        const sheetRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        rawRows = sheetRows
          .filter(row => row.some(cell => String(cell).trim() !== ""))
          .map(row => row.map(cell => String(cell).trim()));
      } else {
        alert("Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls");
        setSyncLoading(false);
        return;
      }

      if (rawRows.length < 2) {
        alert("File kosong atau tidak memiliki baris data.");
        setSyncLoading(false);
        return;
      }

      // ── Identifikasi kolom dari header ────────────────────────────────────
      const headers = rawRows[0].map(h => h.toLowerCase());

      const siteIdx    = headers.findIndex(h => h === "site");
      const name1Idx   = headers.findIndex(h => h === "name 1" || h === "name1" || h.includes("store name") || h.includes("nama toko"));
      const articleIdx = headers.findIndex(h =>
        (h === "article" || h.includes("article code") || h === "kode" || h === "sku" || h === "code") &&
        !h.includes("description") && !h.includes("deskripsi")
      );
      const descIdx    = headers.findIndex(h =>
        h.includes("description") || h.includes("deskripsi") || h === "item name" || h === "barang" || h === "nama barang"
      );
      const uomIdx     = headers.findIndex(h =>
        h.includes("unit") || h.includes("measure") || h === "uom" || h.includes("satuan")
      );
      const qtyIdx     = headers.findIndex(h =>
        (h.includes("system") && h.includes("qty")) ||
        h === "system qty" || h === "stok sistem" || h === "stok"
      );

      // ── Parse baris data ──────────────────────────────────────────────────
      const dataRows = rawRows.slice(1);
      const items = dataRows.map((cols, rowIndex) => {
        let article_code: string | null = null;
        let item_name = "";
        let uom = "EA";
        let system_qty = 0;
        let site = "";
        let name1 = "";

        if (articleIdx !== -1) article_code = cols[articleIdx] || null;
        if (descIdx    !== -1) item_name    = cols[descIdx]    || "";
        if (uomIdx     !== -1) uom          = cols[uomIdx]     || "EA";
        if (qtyIdx     !== -1) system_qty   = parseFloat(cols[qtyIdx] || "0") || 0;
        if (siteIdx    !== -1) site         = cols[siteIdx]    || "";
        if (name1Idx   !== -1) name1        = cols[name1Idx]   || "";

        // Fallback jika header tidak terdeteksi (sesuai standar format Countsheet Excel/CSV: Site | Name 1 | Article | Article Description | UOM | Location | System Qty)
        if (!article_code && !item_name) {
          if (cols.length >= 4) {
            site         = cols[0] || "";
            name1        = cols[1] || "";
            article_code = cols[2] || null;
            item_name    = cols[3] || "";
            uom          = cols[4] || "EA";
            system_qty   = parseFloat(cols[6] || cols[5] || "0") || 0;
          } else {
            article_code = cols[0] || null;
            item_name    = cols[1] || "";
            uom          = cols[2] || "EA";
          }
        }

        return {
          article_code,
          item_name: item_name.trim() || (article_code ? `Artikel ${article_code}` : ""),
          uom: (uom || "EA").toUpperCase(),
          system_qty,
          site,
          name1,
          sort_order: rowIndex,
        };
      }).filter(item => item.item_name && item.item_name.trim() !== "");

      if (items.length === 0) {
        alert("Tidak ada item yang berhasil dibaca.\n\nPastikan header kolom menggunakan:\nSite | Name 1 | Article | Article Description | Base Unit of Measure | System Qty");
        setSyncLoading(false);
        return;
      }

      // ── Simpan ke Supabase ────────────────────────────────────────────────
      const sessionTitle = `Upload: ${file.name.replace(/\.(csv|xlsx|xls)$/i, "")} (${new Date().toLocaleDateString("id-ID")})`;
      const { data: session, error: sessionErr } = await createStockOpnameSession(
        effectiveStoreId, sessionTitle, profile.id
      );
      if (sessionErr || !session) throw new Error(sessionErr || "Gagal membuat sesi");

      const itemsToInsert = items.map(item => ({
        session_id:   session.id,
        article_code: item.article_code,
        item_name:    item.item_name,
        uom:          item.uom,
        system_qty:   item.system_qty,
        site:         item.site,
        name1:        item.name1,
        sort_order:   item.sort_order,
      }));

      const { error: itemErr } = await insertStockOpnameItems(itemsToInsert);
      if (itemErr) throw new Error(itemErr);

      await loadSessions();
      router.push(`/dashboard/stock-opname/${session.id}`);
    } catch (err: any) {
      alert("Gagal memproses file:\n" + (err.message || String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSyncLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const header = "Site,Name 1,Article,Article Description,Base Unit of Measure,System Qty\n";
    const sampleRows = [
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000160,BUBBLE TEA POWDER MIX,G,15000",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000096,MOUSSE POWDER,G,8500",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000095,TARO POWDER,G,12000",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000094,HEAVY CREAM,ML,24000",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000083,COMPOSITE JELLY TOPPINGS,G,10000",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000081,COFFEE JELLY,G,9000",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000079,RED BEAN IN SYRUP,G,7500",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000064,TAPIOCA PEARLS,G,45000",
      "F703CH,ST CT CITIPLAZA KUTABUMI,W000051,PLASTIC SEAL PP,EA,1200",
    ].join("\n");

    const blob = new Blob([header + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "format_countsheet_repotin.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!effectiveStoreId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        Silakan pilih toko terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Stock Opname</h1>
          <p className="text-slate-500 mt-1">
            Kelola perhitungan fisik barang dengan mode sinkronisasi ERP Repot.in atau upload Countsheet format standar.
          </p>
        </div>

        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadCsvTemplate}
            className="text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
            title="Download contoh format CSV countsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Format Countsheet
          </button>

          <button
            onClick={handleFetchFromRepotin}
            disabled={repotinLoading || syncLoading}
            className="glass-button bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-70 transition-all text-sm"
          >
            {repotinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Ambil Data dari Repot.in
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={syncLoading || repotinLoading}
            className="glass-button bg-blue-600 hover:bg-blue-700 text-white border-blue-500/50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-70 transition-all text-sm"
          >
            {syncLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Countsheet
          </button>
        </div>
      </div>

      {/* Info Banner Mode Perhitungan */}
      <div className="mb-8 p-5 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-200/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Skenario Model Perhitungan F&B (Chatime Count Sheet)
          </h3>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            Mendukung pengisian fisik berdasar <span className="font-semibold text-slate-800">Article Code, Deskripsi Barang, dan Satuan Dasar (G / ML / OZ / EA)</span>. Buat beberapa lokasi hitung sekaligus (misal: Rak Kering, Chiller, Bar), angka akan diakumulasi otomatis dan dihitung selisihnya terhadap System Qty.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card bg-white/60 border border-slate-200 rounded-3xl p-6">
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
              <Search className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-slate-800 font-bold mb-1">Belum ada Sesi Opname</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Mulai dengan menarik data dari Repot.in atau upload file Countsheet F&B Anda untuk memulai perhitungan fisik.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleFetchFromRepotin}
                disabled={repotinLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                {repotinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Ambil Data dari Repot.in
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Countsheet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => router.push(`/dashboard/stock-opname/${session.id}`)}
                className="group flex items-center justify-between p-4 bg-white/70 hover:bg-white border border-slate-200 rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    session.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    session.status === 'uploaded' ? 'bg-purple-100 text-purple-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {session.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                     session.status === 'uploaded' ? <CloudDownload className="w-6 h-6" /> :
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

