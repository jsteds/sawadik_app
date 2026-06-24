"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import {
  getDailyCleaningTasks,
  bulkCreateDailyCleaningTasks,
  completeDailyCleaningTask,
  uncompleteDailyCleaningTask,
  deleteDailyCleaningTask,
  getTeamMembers,
  uploadGCPdfToPublic,
} from "@/lib/supabase";
import type { DailyCleaningTask, Profile } from "@/lib/types";
import { compressImage } from "@/lib/imageUtils";
import { SHIFT_OPTIONS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Camera,
  X,
  User,
  ListTodo,
  Clock,
  FileText
} from "lucide-react";

// ─── Helpers untuk PDF ────────────────────────────────────────────────────────

function drawPlaceholder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  x: number,
  y: number,
  size: number,
  label: string
) {
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(x, y, size, size, "FD");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`No ${label} Photo`, x + size / 2, y + size / 2, {
    align: "center",
  });
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generateDailyCleaningPDFReport(
  tasks: DailyCleaningTask[],
  storeName: string,
  storeCode: string | null,
  managerName: string,
  reportDate: string
): Promise<{ fileName: string; blob: Blob }> {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = tasks.length - completedCount;
  const allDone = pendingCount === 0;

  // ── Header ──
  doc.setFillColor(255, 204, 0); 
  doc.circle(0, 0, 25, "F");

  doc.setFillColor(30, 64, 175);
  for (let c = 0; c < 6; c++) {
    for (let r = 0; r < 4; r++) {
      if (c + r > 2) {
        doc.circle(6 + c * 4, 6 + r * 4, 0.5, "F");
      }
    }
  }

  doc.setDrawColor(255, 204, 0);
  doc.setLineWidth(1);
  const sx = pageWidth - margin - 15;
  const sy = 8;
  doc.line(sx - 12, sy + 2, sx - 9, sy - 1);
  doc.line(sx - 9, sy - 1, sx - 6, sy + 2);
  doc.line(sx - 6, sy + 2, sx - 3, sy - 1);
  doc.line(sx - 3, sy - 1, sx, sy + 2);

  const fbiLogoBase64 = await fetchImageAsBase64("/fbi_logo.png");
  if (fbiLogoBase64) {
    doc.addImage(fbiLogoBase64, "PNG", pageWidth - margin - 35, 12, 35, 12);
  }

  doc.setTextColor(30, 64, 175);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Cleaning Report", margin, 32);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`${storeName}${storeCode ? " (" + storeCode + ")" : ""}`, margin, 38);
  doc.text(`Tanggal Daily Cleaning: ${reportDate}`, margin, 43);

  if (!allDone) {
    doc.setFillColor(251, 191, 36);
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const draftLabel = "⚠ DRAFT — Belum semua tugas selesai";
    doc.text(draftLabel, pageWidth - margin, 38, { align: "right" });
  }

  // ── Summary Cards ──
  let y = 50;
  const cardW = (pageWidth - margin * 2 - 6) / 4;

  const summaryData = [
    { label: "Total Tugas", value: String(tasks.length), color: [71, 85, 105] as [number, number, number] },
    { label: "Selesai", value: String(completedCount), color: [16, 185, 129] as [number, number, number] },
    { label: "Belum Selesai", value: String(pendingCount), color: pendingCount > 0 ? [239, 68, 68] as [number, number, number] : [107, 114, 128] as [number, number, number] },
    { label: "Persentase", value: `${tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%`, color: [37, 99, 235] as [number, number, number] },
  ];

  summaryData.forEach((item, i) => {
    const x = margin + i * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "F");
    doc.setDrawColor(...item.color);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...item.color);
    doc.text(item.value, x + cardW / 2, y + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + cardW / 2, y + 15, { align: "center" });
  });

  y += 25;

  // ── Detail Table ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Detail Tugas Daily Cleaning", margin, y);
  y += 4;

  const tableRows: (string | object)[][] = [];

  for (const task of tasks) {
    const statusLabel = task.status === "completed" ? "✓ Selesai" : "Menunggu";
    const completedAt = task.completed_at 
      ? new Date(task.completed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "—";

    const row: (string | object)[] = [
      String(tasks.indexOf(task) + 1),
      task.task_name,
      task.assignee?.full_name || "Belum Diassign",
      statusLabel,
      completedAt,
    ];
    tableRows.push(row);
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Tugas Pembersihan", "PIC", "Status", "Waktu Selesai"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val.includes("✓")) {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [107, 114, 128];
        }
      }
    },
  });

  // ── Photo Section ──
  const tasksWithPhotos = tasks.filter((t) => t.photo_url);

  if (tasksWithPhotos.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;
    let photoY = finalY + 8;

    if (photoY > pageHeight - 60) {
      doc.addPage();
      photoY = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Dokumentasi Foto", margin, photoY);
    photoY += 5;

    const cols = 3;
    const imgSize = 45;
    const imgGapX = 10;
    const imgGapY = 15;
    
    for (let i = 0; i < tasksWithPhotos.length; i++) {
      const task = tasksWithPhotos[i];
      const col = i % cols;
      
      if (i > 0 && col === 0) {
        photoY += imgSize + imgGapY;
      }
      
      if (photoY > pageHeight - 65) {
        doc.addPage();
        photoY = margin;
      }

      const x = margin + col * (imgSize + imgGapX);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(task.task_name, x, photoY, { maxWidth: imgSize });
      
      let imgYOffset = 4;
      if (task.task_name.length > 30) imgYOffset = 7;

      if (task.photo_url) {
        try {
          const imgData = await fetchImageAsBase64(task.photo_url);
          if (imgData) {
            doc.addImage(imgData, "JPEG", x, photoY + imgYOffset, imgSize, imgSize);
          } else {
            drawPlaceholder(doc, x, photoY + imgYOffset, imgSize, "Bukti");
          }
        } catch {
          drawPlaceholder(doc, x, photoY + imgYOffset, imgSize, "Bukti");
        }
      }

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(task.assignee?.full_name || "—", x + imgSize / 2, photoY + imgYOffset + imgSize + 3, {
        align: "center",
      });
    }
  }

  // ── Footer / Signature ──
  const lastPageNum = doc.getNumberOfPages();
  doc.setPage(lastPageNum);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const footerY = Math.max((doc as any).lastAutoTable?.finalY ?? 200, pageHeight - 50);

  const sigY = footerY + 15 > pageHeight - 35
      ? (() => {
        doc.addPage();
        return margin + 10;
      })()
      : footerY + 15;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY, margin + 55, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(managerName, margin, sigY + 5);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Store Manager", margin, sigY + 10);
  doc.text(`Digenerate pada: ${new Date().toLocaleString("id-ID")}`, margin, sigY + 16);

  // ── Footer & Page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const startY = pageHeight - 12;

    doc.setDrawColor(0, 0, 204);
    doc.setLineWidth(1);
    doc.line(5, startY + 8, 8, startY + 2);
    doc.line(9, startY + 8, 12, startY + 2);
    doc.line(13, startY + 8, 16, startY + 2);

    doc.setFillColor(255, 204, 0);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 3; r++) {
        doc.circle(20 + c * 3, startY + 3 + r * 3, 0.6, "F");
      }
    }

    doc.setFillColor(0, 0, 204);
    doc.ellipse(pageWidth - 40, pageHeight, 80, 15, "F");

    doc.setFillColor(255, 204, 0);
    doc.circle(pageWidth, pageHeight, 12, "F");
    doc.setFillColor(0, 0, 204);
    doc.circle(pageWidth, pageHeight, 6, "F");
    doc.setFillColor(255, 255, 255);
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        doc.circle(pageWidth - 10 + c * 3, pageHeight - 6 + r * 3, 0.4, "F");
      }
    }

    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: "right" });
    doc.setTextColor(148, 163, 184);
    doc.text("Auto generated by sawadik-app", 40, pageHeight - 4);
  }

  const fileName = `DailyCleaning_Report_${storeName.replace(/\s+/g, "_")}_${reportDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
  
  return { fileName, blob: doc.output("blob") };
}


export default function DailyCleaningPage() {
  const { profile } = useAuth();
  const isManager = profile?.role === "manager" || profile?.role === "admin";

  const [tasks, setTasks] = useState<DailyCleaningTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createAssignee, setCreateAssignee] = useState<string>("");
  const [taskNames, setTaskNames] = useState<string[]>([""]);
  const [createLoading, setCreateLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Photo Modal
  const [uploadTask, setUploadTask] = useState<DailyCleaningTask | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    const [data, members] = await Promise.all([
      getDailyCleaningTasks(selectedDate),
      getTeamMembers()
    ]);
    setTasks(data as DailyCleaningTask[]);
    setTeamMembers(members);
    setLoading(false);
  }, [profile?.store_id, selectedDate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Task Completion ───
  async function toggleTask(task: DailyCleaningTask) {
    if (!profile) return;
    
    // Validate if the current user is the assignee or manager
    if (task.assigned_to !== profile.id && !isManager) {
      alert("Hanya orang yang ditugaskan atau manager yang dapat mengubah status tugas ini.");
      return;
    }

    if (task.status === "completed") {
      // Uncheck
      const { error } = await uncompleteDailyCleaningTask(task.id);
      if (!error) await loadData();
    } else {
      // Harus menggunakan foto untuk menyelesaikan tugas
      setUploadTask(task);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Hapus tugas ini?")) return;
    const { error } = await deleteDailyCleaningTask(taskId);
    if (!error) await loadData();
  }

  async function handleGeneratePDF() {
    if (!profile) return;
    setGeneratingPdf(true);
    try {
      const reportDate = new Date(selectedDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const { fileName, blob } = await generateDailyCleaningPDFReport(
        tasks,
        profile.stores?.name ?? "Toko",
        profile.stores?.code ?? null,
        profile.full_name ?? "Manager",
        reportDate
      );
      
      if (profile.store_id) {
        const { error } = await uploadGCPdfToPublic(blob, fileName, profile.store_id, profile.id);
        if (error) {
          alert("Laporan PDF berhasil didownload namun gagal dipublish ke folder Publik: " + error);
        } else {
          alert("Laporan PDF berhasil didownload dan otomatis dipublish ke folder Publik!");
        }
      }
    } catch (err) {
      alert("Gagal generate PDF: " + err);
    }
    setGeneratingPdf(false);
  }

  async function handleCreateTasks(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.store_id) return;

    if (!createAssignee) {
      alert("Silakan pilih staf yang ditugaskan.");
      return;
    }

    const validNames = taskNames.filter(n => n.trim() !== "");
    if (!validNames.length) return;

    setCreateLoading(true);
    const rows = validNames.map(name => ({
      store_id: profile.store_id!,
      date: selectedDate,
      task_name: name.trim(),
      assigned_to: createAssignee
    }));

    const { error } = await bulkCreateDailyCleaningTasks(rows);
    if (!error) {
      setShowCreateModal(false);
      setTaskNames([""]);
      setCreateAssignee("");
      await loadData();
    } else {
      alert("Gagal membuat tugas: " + error);
    }
    setCreateLoading(false);
  }

  // Grouping tasks by Assignee
  const tasksByAssignee = tasks.reduce((acc, task) => {
    const key = task.assigned_to || "unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, DailyCleaningTask[]>);

  const assigneeIds = Object.keys(tasksByAssignee);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Penugasan Harian
          </h2>
          <p className="text-sm text-slate-500">
            Daftar tugas pembersihan per individu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto h-9"
          />

          {isManager && tasks.length > 0 && (
            <Button
              onClick={handleGeneratePDF}
              disabled={generatingPdf}
              className={`flex items-center gap-2 h-9 text-sm shadow-sm ${
                tasks.every(t => t.status === "completed")
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              {generatingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Laporan PDF</span>
            </Button>
          )}

          {isManager && (
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger
                render={
                  <Button className="h-9 gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Tambah Tugas</span>
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tugaskan Pekerjaan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTasks} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Staf yang Ditugaskan *</Label>
                    <Select value={createAssignee} onValueChange={(val) => val && setCreateAssignee(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih anggota tim">
                          {teamMembers.find(m => m.id === createAssignee)?.full_name || "Pilih anggota tim"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.filter(m => m.status === 'aktif').map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Daftar Tugas *</Label>
                    {taskNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Misal: Sapu lantai area kasir"
                          value={name}
                          required
                          onChange={(e) => {
                            const newNames = [...taskNames];
                            newNames[idx] = e.target.value;
                            setTaskNames(newNames);
                          }}
                        />
                        {taskNames.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newNames = taskNames.filter((_, i) => i !== idx);
                              setTaskNames(newNames);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full mt-2 text-blue-600 hover:text-blue-700"
                      onClick={() => setTaskNames([...taskNames, ""])}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Tambah Baris
                    </Button>
                  </div>

                  <Button type="submit" className="w-full mt-4" disabled={createLoading}>
                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Berikan Tugas"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Belum ada tugas</h3>
          <p className="text-slate-500 mt-1 text-sm">Belum ada staf yang ditugaskan untuk tanggal ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assigneeIds.map((assigneeId) => {
            const assigneeTasks = tasksByAssignee[assigneeId];
            if (!assigneeTasks?.length) return null;

            const completedCount = assigneeTasks.filter(t => t.status === "completed").length;
            const progress = Math.round((completedCount / assigneeTasks.length) * 100);
            
            const firstTask = assigneeTasks[0];
            const assigneeName = firstTask?.assignee?.full_name || "Belum Ditugaskan";
            const storeName = firstTask?.store?.name;
            
            const isDifferentStore = storeName && profile?.stores && storeName !== profile.stores.name;
            const displayName = isDifferentStore ? `${assigneeName} (${storeName})` : assigneeName;

            const assigneeAvatar = firstTask?.assignee?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${assigneeName}`;

            return (
              <Card key={assigneeId} className="shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border bg-white">
                        <Image src={assigneeAvatar} alt={displayName} fill className="object-cover" unoptimized />
                      </div>
                      <CardTitle className="text-lg font-semibold">
                        {displayName}
                      </CardTitle>
                    </div>
                    <span className="text-sm font-medium text-slate-500">
                      {completedCount}/{assigneeTasks.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {assigneeTasks.map((task) => (
                      <li key={task.id} className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 group items-start">
                        {task.status === "completed" && task.photo_url ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer flex-shrink-0" onClick={() => setUploadTask(task)}>
                            <Image src={task.photo_url} alt="Bukti" fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleTask(task)}
                            disabled={!isManager && task.assigned_to !== profile?.id}
                            className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Upload Foto Bukti"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[3rem]">
                          <p className={`text-sm font-medium transition-colors ${task.status === "completed"
                              ? "text-slate-400 line-through"
                              : "text-slate-700 dark:text-slate-200"
                            }`}>
                            {task.task_name}
                          </p>

                          {task.status === "completed" && task.completer && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Selesai {new Date(task.completed_at!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Photo Upload Modal */}
      {uploadTask && (
        <PhotoUploadModal
          task={uploadTask}
          onClose={() => setUploadTask(null)}
          onDone={loadData}
        />
      )}
    </div>
  );
}

// ─── Photo Upload Modal (Opsional) ───
function PhotoUploadModal({
  task,
  onClose,
  onDone
}: {
  task: DailyCleaningTask;
  onClose: () => void;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const compressedFile = await compressImage(file, 800, 0.7);
      const { error } = await completeDailyCleaningTask(task.id, profile.id, compressedFile);

      if (error) {
        alert("Gagal upload foto: " + error);
      } else {
        onDone();
        onClose();
      }
    } catch (err) {
      alert("Gagal memproses foto: " + err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 border rounded-2xl w-full max-w-sm shadow-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Foto Bukti Selesai</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Foto bukti <strong>wajib diunggah</strong> untuk menyelesaikan tugas <span className="font-semibold text-slate-800 dark:text-slate-200">{task.task_name}</span>.
        </p>

        {task.photo_url ? (
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border mb-4">
            <Image src={task.photo_url} alt="Bukti" fill className="object-cover" />
          </div>
        ) : null}

        <input
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          capture="environment"
          className="hidden"
          ref={fileRef}
          onChange={handleFileChange}
        />

        <Button
          className="w-full gap-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {task.photo_url ? "Ganti Foto" : "Ambil Foto Sekarang"}
        </Button>
      </div>
    </div>
  );
}
