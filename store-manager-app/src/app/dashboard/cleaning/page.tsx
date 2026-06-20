"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import {
  getCleaningTasks,
  createCleaningTask,
  uploadCleaningPhoto,
  uploadReferencePhoto,
  takeoverCleaningTask,
  deleteCleaningTask,
  getTeamMembers,
  bulkCreateCleaningTasks,
} from "@/lib/supabase";
import type { GeneralCleaningTask, Profile } from "@/lib/types";
import { LOCATION_TYPES } from "@/lib/types";
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
import {
  Sparkles,
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  FileText,
  AlertTriangle,
  Upload,
  X,
  ChevronRight,
  ListPlus,
} from "lucide-react";

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generatePDFReport(
  tasks: GeneralCleaningTask[],
  storeName: string,
  storeLocation: string | null,
  managerName: string,
  reportDate: string
) {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const completedCount = tasks.filter(
    (t) => t.status === "completed" || t.status === "verified"
  ).length;
  const pendingCount = tasks.length - completedCount;
  const allDone = pendingCount === 0;

  // ── Header ──
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("General Cleaning Report", margin, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${storeName}${storeLocation ? " — " + storeLocation : ""}`, margin, 19);
  doc.text(`Tanggal GC: ${reportDate}`, margin, 24);

  if (!allDone) {
    doc.setFillColor(251, 191, 36); // amber
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const draftLabel = "⚠ DRAFT — Belum semua tugas selesai";
    doc.text(draftLabel, pageWidth - margin, 14, { align: "right" });
    doc.setTextColor(255, 255, 255);
  }

  // ── Summary Cards ──
  let y = 35;
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
  doc.text("Detail Tugas General Cleaning", margin, y);
  y += 4;

  // Build rows — fetch images if available
  const tableRows: (string | object)[][] = [];

  for (const task of tasks) {
    const statusLabel =
      task.status === "completed" || task.status === "verified"
        ? "✓ Selesai"
        : task.status === "in_progress"
          ? "Sedang Dikerjakan"
          : "Menunggu";

    const row: (string | object)[] = [
      String(tasks.indexOf(task) + 1),
      task.area_equipment,
      task.location_type || "—",
      task.assignee?.full_name || "Belum Diassign",
      statusLabel,
      task.notes || "—",
    ];
    tableRows.push(row);
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Area / Equipment", "Tipe", "PIC", "Status", "Catatan"]],
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
      1: { cellWidth: 45 },
      2: { cellWidth: 22 },
      3: { cellWidth: 35 },
      4: { cellWidth: 28 },
      5: { cellWidth: 40 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val.includes("✓")) {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("Sedang")) {
          data.cell.styles.textColor = [245, 158, 11];
        } else {
          data.cell.styles.textColor = [107, 114, 128];
        }
      }
    },
  });

  // ── Photo Section ──
  // Only include tasks that have photos
  const tasksWithPhotos = tasks.filter(
    (t) => t.before_photo_url || t.after_photo_url
  );

  if (tasksWithPhotos.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;
    let photoY = finalY + 8;

    // Check if we need a new page
    if (photoY > pageHeight - 60) {
      doc.addPage();
      photoY = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Dokumentasi Foto", margin, photoY);
    photoY += 5;

    for (const task of tasksWithPhotos) {
      if (photoY > pageHeight - 55) {
        doc.addPage();
        photoY = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `${tasks.indexOf(task) + 1}. ${task.area_equipment} (${task.assignee?.full_name || "—"})`,
        margin,
        photoY
      );
      photoY += 4;

      const photoSlots = [
        { url: task.before_photo_url, label: "Before" },
        { url: task.progress_photo_url, label: "Progress" },
        { url: task.after_photo_url, label: "After" },
      ];

      const imgSize = 38;
      const imgGap = 5;

      for (let i = 0; i < photoSlots.length; i++) {
        const slot = photoSlots[i];
        const x = margin + i * (imgSize + imgGap);

        if (slot.url) {
          try {
            const imgData = await fetchImageAsBase64(slot.url);
            if (imgData) {
              doc.addImage(imgData, "JPEG", x, photoY, imgSize, imgSize);
            } else {
              drawPlaceholder(doc, x, photoY, imgSize, slot.label);
            }
          } catch {
            drawPlaceholder(doc, x, photoY, imgSize, slot.label);
          }
        } else {
          drawPlaceholder(doc, x, photoY, imgSize, slot.label);
        }

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(slot.label, x + imgSize / 2, photoY + imgSize + 3, {
          align: "center",
        });
      }

      photoY += imgSize + 10;
    }
  }

  // ── Footer / Signature ──
  const lastPageNum = doc.getNumberOfPages();
  doc.setPage(lastPageNum);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const footerY = Math.max((doc as any).lastAutoTable?.finalY ?? 200, pageHeight - 50);

  // Check if we need new page for signature
  const sigY =
    footerY + 15 > pageHeight - 35
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

  // ── Page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${p} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: "right" }
    );
    doc.text("Auto generated by sawadik-app", margin, pageHeight - 5);
  }

  const fileName = `GC_Report_${storeName.replace(/\s+/g, "_")}_${reportDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GeneralCleaningTask["status"] }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Menunggu",
      className: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400",
    },
    in_progress: {
      label: "Dalam Proses",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    completed: {
      label: "Selesai",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    verified: {
      label: "Diverifikasi",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
  };
  const { label, className } = map[status] ?? map.pending;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}

// ─── Photo Upload Modal ───────────────────────────────────────────────────────

interface PhotoUploadModalProps {
  task: GeneralCleaningTask;
  onClose: () => void;
  onDone: () => void;
}

function PhotoUploadModal({ task, onClose, onDone }: PhotoUploadModalProps) {
  const [currentTask, setCurrentTask] = useState(task);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notes, setNotes] = useState(task.notes ?? "");

  const beforeRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const refs = { before: beforeRef, progress: progressRef, after: afterRef };

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    stage: "before" | "progress" | "after"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(stage);
    const { error } = await uploadCleaningPhoto(currentTask.id, stage, file, notes);
    if (error) {
      alert("Gagal upload: " + error);
    } else {
      // Refresh this specific task from the updated URLs
      const updated = { ...currentTask };
      const reader = new FileReader();
      reader.onload = () => {
        if (stage === "before") updated.before_photo_url = reader.result as string;
        else if (stage === "progress") updated.progress_photo_url = reader.result as string;
        else updated.after_photo_url = reader.result as string;
        if (stage === "after") updated.status = "completed";
        else updated.status = "in_progress";
        setCurrentTask({ ...updated });
      };
      reader.readAsDataURL(file);
    }
    setUploading(null);
    e.target.value = "";
  }

  const stages: { key: "before" | "progress" | "after"; label: string; emoji: string }[] = [
    { key: "before", label: "Before", emoji: "🔴" },
    { key: "progress", label: "Progress", emoji: "🟡" },
    { key: "after", label: "After", emoji: "🟢" },
  ];

  const photoUrls = {
    before: currentTask.before_photo_url,
    progress: currentTask.progress_photo_url,
    after: currentTask.after_photo_url,
  };

  const isCompleted =
    currentTask.status === "completed" || currentTask.status === "verified";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
              Upload Bukti Foto
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[220px]">
              {currentTask.area_equipment}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {isCompleted && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              Tugas ini telah diselesaikan!
            </div>
          )}

          {/* Photo stages */}
          <div className="grid grid-cols-3 gap-3">
            {stages.map((stage) => {
              const url = photoUrls[stage.key];
              const isUploading = uploading === stage.key;
              const isDisabled =
                (stage.key === "progress" && !photoUrls.before) ||
                (stage.key === "after" && !photoUrls.before);

              return (
                <div key={stage.key} className="space-y-1.5 text-center">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                    {stage.emoji} {stage.label}
                  </span>
                  <button
                    disabled={isUploading || isDisabled}
                    onClick={() => refs[stage.key].current?.click()}
                    className={`
                      group w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center overflow-hidden relative transition-all
                      ${url
                        ? "border-emerald-400 dark:border-emerald-600 hover:border-blue-400 cursor-pointer"
                        : isDisabled
                        ? "border-dashed border-zinc-200 dark:border-zinc-700 opacity-40 cursor-not-allowed"
                        : "border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-900/10 cursor-pointer"}
                    `}
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    ) : url ? (
                      <>
                        <Image src={url} alt={stage.label} fill className="object-cover" />
                        {/* Replace overlay — shows on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-1">
                          <Sparkles className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[9px] text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Ganti
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-zinc-400 mb-1" />
                        <span className="text-[9px] text-zinc-400 font-medium">
                          {isDisabled ? "Upload Before\ndulu" : "Ambil Foto"}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Camera-only input */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={refs[stage.key]}
                    onChange={(e) => handleFileChange(e, stage.key)}
                  />
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              Catatan (opsional)
            </Label>
            <textarea
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              rows={2}
              placeholder="Tambahkan catatan jika ada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            📸 Foto wajib diambil langsung dari kamera.<br />
            Tugas selesai otomatis setelah foto <strong>After</strong> diupload.
          </p>

          <Button
            onClick={() => { onDone(); onClose(); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Selesai
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface TaskDraft {
  area_equipment: string;
  location_type: string;
  assigned_to: string;
  reference_photo: File | null;   // file lokal untuk preview
  reference_preview: string | null; // data URL untuk preview
}

const DEFAULT_DRAFT: TaskDraft = {
  area_equipment: "",
  location_type: "Area",
  assigned_to: "",
  reference_photo: null,
  reference_preview: null,
};

export default function GeneralCleaningPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<GeneralCleaningTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([{ ...DEFAULT_DRAFT }]);
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [createLoading, setCreateLoading] = useState(false);

  // Upload modal
  const [uploadTask, setUploadTask] = useState<GeneralCleaningTask | null>(null);

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [t, m] = await Promise.all([getCleaningTasks(), getTeamMembers()]);
    setTasks(t as GeneralCleaningTask[]);
    setTeamMembers(m as Profile[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isManager = profile?.role === "manager" || profile?.role === "admin";

  // ── Stats ──
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.status === "completed" || t.status === "verified"
  ).length;
  const pendingTasks = totalTasks - completedTasks;
  const allDone = totalTasks > 0 && pendingTasks === 0;
  const completionPct = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // ── Filtered tasks ──
  const filteredTasks =
    filterStatus === "all"
      ? tasks
      : filterStatus === "mine"
        ? tasks.filter((t) => t.assigned_to === profile?.id)
        : tasks.filter((t) => t.status === filterStatus);

  // ── Create tasks ──
  async function handleCreateTasks(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.store_id) return;
    const validDrafts = taskDrafts.filter((d) => d.area_equipment.trim() !== "");
    if (!validDrafts.length) return;
    setCreateLoading(true);

    // Upload foto referensi terlebih dahulu (paralel)
    const refUrls = await Promise.all(
      validDrafts.map(async (d) => {
        if (!d.reference_photo) return null;
        const { url } = await uploadReferencePhoto(d.reference_photo, profile.store_id!);
        return url;
      })
    );

    const rows = validDrafts.map((d, i) => ({
      area_equipment: d.area_equipment.trim(),
      location_type: d.location_type || null,
      assigned_to: d.assigned_to || null,
      store_id: profile.store_id!,
      date: taskDate,
      reference_photo_url: refUrls[i] ?? null,
    }));

    const { error } =
      rows.length === 1
        ? await createCleaningTask(rows[0])
        : await bulkCreateCleaningTasks(rows);

    if (!error) {
      setShowCreateModal(false);
      setTaskDrafts([{ ...DEFAULT_DRAFT }]);
      await loadData();
    } else {
      alert("Gagal membuat tugas: " + error);
    }
    setCreateLoading(false);
  }

  // ── CSV Import ──
  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const parsed: TaskDraft[] = lines
        .slice(1) // skip header
        .map((line) => {
          const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          return {
            area_equipment: cols[0] ?? "",
            location_type: cols[1] ?? "Area",
            assigned_to: "",
            reference_photo: null,
            reference_preview: null,
          };
        })
        .filter((d) => d.area_equipment);

      if (parsed.length > 0) {
        setTaskDrafts(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Delete ──
  async function handleDelete(taskId: string) {
    if (!confirm("Hapus tugas ini secara permanen?")) return;
    const { error } = await deleteCleaningTask(taskId);
    if (!error) await loadData();
  }

  // ── Takeover ──
  async function handleTakeover(taskId: string) {
    if (!profile) return;
    if (!confirm("Ambil alih tugas ini?")) return;
    const { error } = await takeoverCleaningTask(taskId, profile.id);
    if (!error) await loadData();
    else alert("Gagal: " + error);
  }

  // ── Generate PDF ──
  async function handleGeneratePDF() {
    if (!profile) return;
    setGeneratingPdf(true);
    try {
      const reportDate = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      await generatePDFReport(
        tasks,
        profile.stores?.name ?? "Toko",
        profile.stores?.location ?? null,
        profile.full_name ?? "Manager",
        reportDate
      );
    } catch (err) {
      alert("Gagal generate PDF: " + err);
    }
    setGeneratingPdf(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            General Cleaning (GC)
          </h2>
          <p className="text-sm text-slate-500">
            Kelola dan pantau tugas pembersihan area/equipment toko.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Generate PDF Button */}
          {isManager && totalTasks > 0 && (
            <Button
              onClick={handleGeneratePDF}
              disabled={generatingPdf}
              className={`flex items-center gap-2 text-sm shadow-sm ${allDone
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
            >
              {generatingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {allDone ? "Generate Laporan PDF" : "Generate Draft PDF"}
            </Button>
          )}

          {/* Create Task Button */}
          {isManager && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buat Tugas GC
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Tugas", value: totalTasks, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-zinc-900" },
            { label: "Selesai", value: completedTasks, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Belum Selesai", value: pendingTasks, color: pendingTasks > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400", bg: pendingTasks > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-zinc-900" },
            { label: "Completion", value: `${completionPct}%`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 text-center border border-transparent`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progress Keseluruhan</span>
            <span>{completedTasks} / {totalTasks} tugas selesai</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* All done banner */}
      {allDone && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-5 py-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
              Semua tugas General Cleaning sudah selesai! 🎉
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
              Laporan PDF siap digenerate menggunakan tombol di atas.
            </p>
          </div>
        </div>
      )}

      {/* Not all done warning (for manager) */}
      {isManager && totalTasks > 0 && !allDone && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Masih ada <strong>{pendingTasks} tugas</strong> yang belum selesai. PDF yang digenerate akan ditandai sebagai DRAFT.
          </p>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      {totalTasks > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Semua" },
            { key: "pending", label: "Menunggu" },
            { key: "in_progress", label: "Dalam Proses" },
            { key: "completed", label: "Selesai" },
            ...(profile ? [{ key: "mine", label: "Tugas Saya" }] : []),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === f.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Task Grid ── */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {tasks.length === 0
              ? "Belum ada jadwal General Cleaning."
              : "Tidak ada tugas yang cocok dengan filter ini."}
          </p>
          {isManager && tasks.length === 0 && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buat Tugas Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const isMyTask = task.assigned_to === profile?.id;
            const isCompleted =
              task.status === "completed" || task.status === "verified";
            const photoCount = [
              task.before_photo_url,
              task.progress_photo_url,
              task.after_photo_url,
            ].filter(Boolean).length;

            return (
              <Card
                key={task.id}
                className={`relative overflow-hidden transition-shadow hover:shadow-md ${isCompleted
                  ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  }`}
              >
                {/* Foto Referensi Hero */}
                {task.reference_photo_url && (
                  <div className="relative w-full h-40 overflow-hidden rounded-t-xl">
                    <Image
                      src={task.reference_photo_url}
                      alt={`Referensi ${task.area_equipment}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-[10px] text-white/80 font-medium bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      📸 Foto Referensi
                    </span>
                  </div>
                )}

              <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-snug text-slate-800 dark:text-slate-100 truncate">
                        {task.area_equipment}
                      </CardTitle>
                      {task.location_type && (
                        <span className="inline-block mt-1 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                          {task.location_type}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StatusBadge status={task.status} />
                      {isManager && (
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-400">
                        {task.assignee?.full_name
                          ? task.assignee.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                          : "?"}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                        {task.assignee?.full_name ?? (
                          <em className="text-slate-400 not-italic">Belum diassign</em>
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {new Date(task.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Photo progress indicator */}
                  <div className="flex items-center gap-1">
                    {(["before", "progress", "after"] as const).map((s) => {
                      const url = task[`${s}_photo_url`];
                      return (
                        <div
                          key={s}
                          className={`flex-1 h-1.5 rounded-full ${url
                            ? "bg-emerald-400"
                            : "bg-zinc-200 dark:bg-zinc-700"
                            }`}
                        />
                      );
                    })}
                    <span className="text-[9px] text-slate-400 ml-1">
                      {photoCount}/3 foto
                    </span>
                  </div>

                  {/* Photo thumbnails */}
                  {(task.before_photo_url || task.progress_photo_url || task.after_photo_url) && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["before", "progress", "after"] as const).map((s) => {
                        const url = task[`${s}_photo_url`];
                        return (
                          <div
                            key={s}
                            className="aspect-square bg-slate-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative"
                          >
                            {url ? (
                              <Image
                                src={url}
                                alt={s}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-400">
                                —
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[8px] text-center py-0.5">
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Catatan */}
                  {task.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-zinc-800 rounded-lg px-2.5 py-2 border border-slate-100 dark:border-zinc-700">
                      💬 {task.notes}
                    </p>
                  )}

                  {/* Action button */}
                  {!isCompleted && (
                    <div>
                      {isMyTask ? (
                        <Button
                          onClick={() => setUploadTask(task)}
                          className="w-full flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                          variant="ghost"
                        >
                          <Camera className="w-4 h-4" />
                          Upload Bukti Foto
                          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleTakeover(task.id)}
                          variant="ghost"
                          className="w-full flex items-center gap-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          <UserPlus className="w-4 h-4" />
                          Ambil Alih Tugas Ini
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Task Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Buat Tugas General Cleaning
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              <form onSubmit={handleCreateTasks} className="space-y-5">
                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tanggal Target</Label>
                  <Input
                    type="date"
                    required
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="bg-transparent"
                  />
                </div>

                {/* CSV Import */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCSVImport}
                    />
                  </label>
                  <span className="text-xs text-slate-400">
                    Format: area_equipment, location_type
                  </span>
                </div>

                {/* Task rows */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <ListPlus className="w-4 h-4 text-blue-500" />
                    Daftar Area / Equipment
                  </Label>

                  {taskDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      className="relative bg-slate-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-2"
                    >
                      {taskDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTaskDrafts((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-slate-500">
                            Nama Area / Equipment *
                          </Label>
                          <Input
                            required
                            placeholder="Contoh: Mesin Espresso, Kaca Depan..."
                            value={draft.area_equipment}
                            onChange={(e) =>
                              setTaskDrafts((prev) =>
                                prev.map((d, i) =>
                                  i === idx
                                    ? { ...d, area_equipment: e.target.value }
                                    : d
                                )
                              )
                            }
                            className="bg-white dark:bg-zinc-900 text-sm h-9"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Tipe</Label>
                          <select
                            className="w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-9"
                            value={draft.location_type}
                            onChange={(e) =>
                              setTaskDrafts((prev) =>
                                prev.map((d, i) =>
                                  i === idx
                                    ? { ...d, location_type: e.target.value }
                                    : d
                                )
                              )
                            }
                          >
                            {LOCATION_TYPES.map((lt) => (
                              <option key={lt} value={lt}>
                                {lt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">
                            Tugaskan ke
                          </Label>
                          <select
                            className="w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-9"
                            value={draft.assigned_to}
                            onChange={(e) =>
                              setTaskDrafts((prev) =>
                                prev.map((d, i) =>
                                  i === idx
                                    ? { ...d, assigned_to: e.target.value }
                                    : d
                                )
                              )
                            }
                          >
                            <option value="">— Siapa saja —</option>
                            {teamMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name} ({m.position || m.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Foto Referensi */}
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs text-slate-500 flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            Foto Referensi Area/Equipment
                            <span className="text-slate-400">(opsional)</span>
                          </Label>

                          {draft.reference_preview ? (
                            <div className="relative">
                              <div className="relative w-full h-36 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-600">
                                <Image
                                  src={draft.reference_preview}
                                  alt="Referensi"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setTaskDrafts((prev) =>
                                    prev.map((d, i) =>
                                      i === idx
                                        ? { ...d, reference_photo: null, reference_preview: null }
                                        : d
                                    )
                                  )
                                }
                                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                              <Camera className="w-6 h-6 text-slate-300 group-hover:text-blue-400 transition-colors mb-1" />
                              <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                                Klik untuk upload foto
                              </span>
                              <span className="text-[10px] text-slate-300 mt-0.5">JPG, PNG, WEBP</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const preview = ev.target?.result as string;
                                    setTaskDrafts((prev) =>
                                      prev.map((d, i) =>
                                        i === idx
                                          ? { ...d, reference_photo: file, reference_preview: preview }
                                          : d
                                      )
                                    );
                                  };
                                  reader.readAsDataURL(file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setTaskDrafts((prev) => [...prev, { ...DEFAULT_DRAFT }])
                    }
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Area / Equipment
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Simpan {taskDrafts.filter((d) => d.area_equipment).length} Tugas
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Upload Modal ── */}
      {uploadTask && (
        <PhotoUploadModal
          task={uploadTask}
          onClose={() => setUploadTask(null)}
          onDone={() => {
            setUploadTask(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
