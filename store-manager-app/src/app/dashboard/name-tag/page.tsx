"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, AlertCircle, FileText, Printer } from "lucide-react";
import "./name-tag.css";

export default function NameTagGenerator() {
  const [namesText, setNamesText] = useState("BUDI\nSITI\nANDI\nTONI\nRINA\nEKO\nNUR\nICHA\nALEXANDER\nCHRISTOPHER");
  const [validNames, setValidNames] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    updateNameTags();
  }, [namesText]);

  const updateNameTags = () => {
    const lines = namesText.split('\n');
    const filtered = lines
      .map(line => line.trim().toUpperCase())
      .filter(line => line.length > 0);
    setValidNames(filtered);
  };

  const getSmartFontSize = (nameLength: number) => {
    if (nameLength <= 7) return '18pt';
    if (nameLength === 8) return '16pt';
    if (nameLength === 9) return '14pt';
    if (nameLength === 10) return '12pt';
    return '10.5pt';
  };

  const handleRefresh = () => {
    updateNameTags();
  };

  const downloadPDF = async () => {
    if (validNames.length === 0) {
      alert("Silakan masukkan nama karyawan terlebih dahulu.");
      return;
    }

    try {
      setIsGenerating(true);

      // Pastikan font Blueberry Sans Original siap digunakan di browser
      await document.fonts.ready;

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Skala ketajaman gambar (10px per mm = ~254 DPI, resolusi tinggi untuk cetak)
      const pxPerMm = 10;
      const pageW = 210 * pxPerMm; // 2100 px
      const pageH = 297 * pxPerMm; // 2970 px

      const cardsPerPage = 60; // 4 kolom x 15 baris
      const cardW = 48 * pxPerMm; // 480 px (4.8 cm)
      const cardH = 16 * pxPerMm; // 160 px (1.6 cm)
      const gapX = 2 * pxPerMm; // 20 px (0.2 cm)
      const gapY = 2 * pxPerMm; // 20 px (0.2 cm)
      const startX = 6 * pxPerMm; // 60 px (margin kiri)
      const startY = 14.5 * pxPerMm; // 145 px (margin atas)

      const totalPages = Math.ceil(validNames.length / cardsPerPage);

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const canvas = document.createElement("canvas");
        canvas.width = pageW;
        canvas.height = pageH;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // Background putih A4
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageW, pageH);

        const startIdx = pageIdx * cardsPerPage;
        const endIdx = Math.min(startIdx + cardsPerPage, validNames.length);

        for (let i = startIdx; i < endIdx; i++) {
          const localIdx = i - startIdx;
          const col = localIdx % 4;
          const row = Math.floor(localIdx / 4);

          const x = startX + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);

          // 1. Garis potong kartu (dashed border slate-300)
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(x, y, cardW, cardH);
          ctx.setLineDash([]);

          // 2. Teks nama karyawan dengan font asli Blueberry Sans Original
          const name = validNames[i];
          const len = name.length;
          let fontSizePx = 52; // setara ~18pt pada skala 10px/mm
          if (len > 7 && len <= 9) fontSizePx = 44;
          else if (len > 9 && len <= 12) fontSizePx = 38;
          else if (len > 12 && len <= 16) fontSizePx = 32;
          else if (len > 16) fontSizePx = 26;

          ctx.font = `normal ${fontSizePx}px "Blueberry Sans Original", sans-serif`;
          ctx.fillStyle = "#0f172a"; // slate-900
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.fillText(name, x + cardW / 2, y + cardH / 2);
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        if (pageIdx > 0) doc.addPage();
        doc.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      doc.save("Name_Tags_A4_Standar_Store.pdf");
    } catch (err) {
      console.error("PDF generation error:", err);
      alert(
        "Gagal membuat file PDF: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (validNames.length === 0) {
      alert("Silakan masukkan nama karyawan terlebih dahulu.");
      return;
    }
    window.print();
  };

  if (!isClient) return null; // Avoid hydration mismatch

  // Calculate pages for print
  const cardsPerPage = 60;
  const totalPages = Math.ceil(validNames.length / cardsPerPage);
  const printPages = Array.from({ length: totalPages }, (_, p) => {
    const start = p * cardsPerPage;
    return validNames.slice(start, start + cardsPerPage);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Generator Name Tag
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sesuai Standar Cetak Store (4.8 cm x 1.6 cm, Font: Blueberry Sans 18pt)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Input Sisi Kiri */}
        <div className="md:col-span-1 glass-panel rounded-xl p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Input Data</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Karyawan (Batch)</label>
            <textarea 
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 bg-white/50 border border-white/40 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-blueberry transition-all resize-y"
              placeholder="Masukkan nama panggilan...&#10;Satu nama per baris."
            />
            <p className="mt-2 text-xs text-slate-500">Otomatis memperbarui tampilan tanpa perlu klik refresh.</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 glass-button px-4 py-2.5 rounded-xl font-medium text-sm text-slate-700 hover:text-blue-600"
            >
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Refresh Preview
            </button>
            <button 
              onClick={downloadPDF}
              disabled={isGenerating}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
                isGenerating 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/20 shadow-sm'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Membuat PDF A4...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF A4 (Standar Store)
                </>
              )}
            </button>
            <button 
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium text-sm bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 border border-blue-500/20 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak Langsung (Print)
            </button>
          </div>
        </div>

        {/* Area Preview Sisi Kanan */}
        <div className="md:col-span-2 space-y-6">
          {/* Alert Aturan */}
          <div className="flex gap-3 bg-amber-50/50 backdrop-blur-sm border border-amber-500/20 p-4 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 mb-1">Ketentuan Standar Store:</h3>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                <li>Ukuran Bidang: Lebar 4.8 cm, Tinggi 1.6 cm</li>
                <li>Format: Blueberry Sans (18 pt), Kapital (UPPERCASE), Posisi Center</li>
                <li>Bahan: Kertas Art Carton / HVS ➡️ Laminasi Glossy</li>
              </ul>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Live Preview (Skala Layar)</h2>
            <div className="flex flex-wrap gap-4 p-6 bg-white/40 border border-white/60 rounded-xl min-h-[150px] justify-center md:justify-start">
              {validNames.length === 0 ? (
                <p className="text-slate-400 text-sm m-auto italic">Belum ada nama yang dimasukkan.</p>
              ) : (
                validNames.map((name, idx) => (
                  <div 
                    key={idx}
                    className={`nametag-preview font-blueberry text-slate-900 shadow-sm ${name.length > 10 ? 'border-amber-500 bg-amber-50' : ''}`}
                    style={{ fontSize: getSmartFontSize(name.length) }}
                  >
                    {name}
                  </div>
                ))
              )}
            </div>
          </div>
          

        </div>
      </div>

      {/* WADAH PENGOLAHAN RENDER ENGINE PDF */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '210mm', zIndex: -50, opacity: 0.01, pointerEvents: 'none' }}>
        <div id="printTarget">
          {printPages.map((pageNames, pageIdx) => (
            <div key={pageIdx} className="pdf-sheet font-blueberry">
              {pageNames.map((name, idx) => (
                <div 
                  key={idx}
                  className="nametag-print"
                  style={{ fontSize: getSmartFontSize(name.length) }}
                >
                  {name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
