"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getDocuments, uploadDocument, deleteDocument } from "@/lib/supabase";
import type { Document } from "@/lib/types";
import { DOCUMENT_CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  FileText,
  Download,
  Eye,
  UploadCloud,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCategoryColor(cat: string) {
  const map: Record<string, string> = {
    sop: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    wi: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    policy: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    other: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400",
  };
  return map[cat] ?? map.other;
}

function getFileIcon(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  if (/\.(png|jpg|jpeg|webp|gif)/.test(lower)) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
  return <FileText className="w-5 h-5 text-slate-400" />;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  storeId: string;
  uploadedBy: string;
}

function UploadModal({ onClose, onSuccess, storeId, uploadedBy }: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("sop");
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Pilih file terlebih dahulu."); return; }
    if (!title.trim()) { setError("Judul dokumen tidak boleh kosong."); return; }
    setUploading(true);
    setError(null);
    const { error: err } = await uploadDocument(file, title.trim(), category, storeId, uploadedBy, isPublic);
    setUploading(false);
    if (err) {
      setError(err);
    } else {
      onSuccess();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Upload Dokumen</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Judul Dokumen *</Label>
            <Input
              required
              placeholder="Contoh: SOP Buka Toko (Opening)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Kategori *</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Visibility Checkbox */}
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isPublic" 
              checked={isPublic} 
              onChange={(e) => setIsPublic(e.target.checked)} 
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-600"
            />
            <Label htmlFor="isPublic" className="text-sm font-medium cursor-pointer">
              Bagikan ke Publik (Semua Cabang)
            </Label>
          </div>

          {/* File picker */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">File *</Label>
            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-1 text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors group">
                <UploadCloud className="w-8 h-8 text-slate-300 group-hover:text-orange-400 transition-colors mb-1.5" />
                <span className="text-sm text-slate-400 group-hover:text-orange-500 transition-colors font-medium">Klik untuk pilih file</span>
                <span className="text-xs text-slate-300 mt-0.5">PDF, DOC, DOCX, XLS, PNG, JPG</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengupload...</>
            ) : (
              <><UploadCloud className="w-4 h-4 mr-2" />Upload Dokumen</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"internal" | "public">("internal");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isManager = profile?.role === "manager" || profile?.role === "admin";

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const data = await getDocuments();
    setDocs(data as Document[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const filteredDocs = docs.filter((doc) => {
    // 1. Tab Filter
    if (activeTab === "internal" && doc.is_public) return false;
    if (activeTab === "public" && !doc.is_public) return false;

    // 2. Search Filter
    const matchSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.category.toLowerCase().includes(search.toLowerCase());
      
    // 3. Category Filter
    const matchCat = categoryFilter === "all" || doc.category === categoryFilter;
    
    return matchSearch && matchCat;
  });

  async function handleDelete(doc: Document) {
    if (!confirm(`Hapus dokumen "${doc.title}" secara permanen?`)) return;
    setDeletingId(doc.id);
    const { error } = await deleteDocument(doc.id, doc.file_path);
    if (error) alert("Gagal hapus: " + error);
    else await loadDocs();
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Dokumen (SOP &amp; WI)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola standar operasional, work instruction, dan kebijakan toko.
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Dokumen
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("internal")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "internal"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Dokumen Internal
        </button>
        <button
          onClick={() => setActiveTab("public")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "public"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Dokumen Publik
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Cari nama dokumen..."
            className="pl-9 bg-white dark:bg-zinc-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ value: "all", label: "Semua" }, ...DOCUMENT_CATEGORIES].map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === c.value
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-10 h-10 text-slate-200 dark:text-zinc-700 mx-auto" />
            <p className="text-sm text-slate-500">
              {docs.length === 0
                ? "Belum ada dokumen. Upload dokumen pertama!"
                : "Tidak ada dokumen yang cocok dengan pencarian."}
            </p>
            {isManager && docs.length === 0 && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <UploadCloud className="w-4 h-4 mr-1.5" />
                Upload Dokumen Pertama
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 dark:border-zinc-800">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama Dokumen</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategori</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Diupload</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Ukuran</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="border-zinc-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.file_url)}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[240px]">{doc.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          {doc.uploader?.full_name && <span>{doc.uploader.full_name}</span>}
                          {activeTab === "public" && doc.store?.name && (
                            <>
                              <span>•</span>
                              <span className="font-medium">{doc.store.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getCategoryColor(doc.category)}`}>
                      {DOCUMENT_CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 hidden sm:table-cell">
                    {formatDate(doc.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 hidden md:table-cell">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lihat"
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      {/* Download */}
                      <a
                        href={doc.file_url}
                        download={doc.title}
                        title="Download"
                        className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {/* Delete (manager only & must own the file) */}
                      {isManager && doc.store_id === profile?.store_id && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          title="Hapus"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Stats */}
      {!loading && docs.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          {filteredDocs.length} dari {docs.length} dokumen ditampilkan
        </p>
      )}

      {/* Upload Modal */}
      {showUploadModal && profile?.store_id && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={loadDocs}
          storeId={profile.store_id}
          uploadedBy={profile.id}
        />
      )}
    </div>
  );
}
