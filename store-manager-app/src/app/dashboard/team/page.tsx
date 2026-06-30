"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Star, Trophy, TrendingUp, Users, Award, Clock,
  CheckCircle2, Zap, Plus, Pencil, Trash2, X,
  Upload, Search, Filter, Loader2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  uploadAvatar,
} from "@/lib/supabase";
import type { Profile, MemberFormData } from "@/lib/types";
import {
  POSITION_OPTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types";

// ─── Accent colors per index (cycling) ───────────────────────────────────────
const ACCENT_COLORS = [
  { color: "#3b82f6", glow: "rgba(59,130,246,0.4)", badge: "from-blue-600 to-blue-400", tag: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { color: "#a855f7", glow: "rgba(168,85,247,0.4)", badge: "from-purple-600 to-purple-400", tag: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { color: "#10b981", glow: "rgba(16,185,129,0.4)", badge: "from-emerald-600 to-emerald-400", tag: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", badge: "from-amber-600 to-amber-400", tag: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { color: "#06b6d4", glow: "rgba(6,182,212,0.4)", badge: "from-cyan-600 to-cyan-400", tag: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { color: "#f43f5e", glow: "rgba(244,63,94,0.4)", badge: "from-rose-600 to-rose-400", tag: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
];

function getAccent(index: number) {
  return ACCENT_COLORS[index % ACCENT_COLORS.length];
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${type === "success" ? "bg-emerald-900/90 border-emerald-500/30 text-emerald-200" : "bg-red-900/90 border-red-500/30 text-red-200"
      }`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose}><X className="w-3.5 h-3.5 ml-2 opacity-60 hover:opacity-100" /></button>
    </div>
  );
}

// ─── Konfirmasi Hapus Modal ───────────────────────────────────────────────────
function DeleteConfirmModal({ member, onConfirm, onCancel, loading }: {
  member: Profile;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl border border-white/10 p-6 w-full max-w-sm" style={{ background: "#0f172a" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-white font-bold text-lg">Hapus Anggota?</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Hapus <span className="text-white font-semibold">{member.full_name}</span> dari tim? Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Member Form Modal ────────────────────────────────────────────────────────
function MemberFormModal({ member, onSave, onClose, loading, customPositions }: {
  member: Profile | null; // null = mode tambah
  onSave: (data: MemberFormData, avatarFile?: File) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  customPositions?: string[];
}) {
  const isEdit = !!member;
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(member?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [form, setForm] = useState<MemberFormData>({
    full_name: member?.full_name ?? "",
    nik: member?.nik ?? "",
    email: member?.email ?? "",
    position: member?.position ?? "",
    role: (member?.role === "manager" ? "manager" : "staff"),
    status: member?.status ?? "aktif",
    join_date: member?.join_date ?? new Date().toISOString().split("T")[0],
    avatar_url: member?.avatar_url ?? "",
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form, avatarFile);
  };

  const field = (label: string, key: keyof MemberFormData, type = "text", required = true) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}{required && " *"}</label>
      <input
        type={type}
        required={required}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
        placeholder={`Masukkan ${label.toLowerCase()}`}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "linear-gradient(160deg, #0f172a, #1a2540)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-white font-black text-xl">{isEdit ? "Edit Anggota" : "Tambah Anggota Baru"}</h2>
          <button onClick={onClose} disabled={loading} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors"
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarPreview ? (
                <Image src={avatarPreview} alt="preview" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-slate-500" />
                  <span className="text-[10px] text-slate-500">Foto</span>
                </div>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div>
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                {avatarPreview ? "Ganti Foto" : "Upload Foto Profil"}
              </button>
              <p className="text-xs text-slate-500 mt-1">PNG/JPG maks. 2MB</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Nama Lengkap", "full_name")}
            {field("NIK (No. Induk Karyawan)", "nik")}
          </div>

          {field("Email", "email", "email")}

          {/* Jabatan Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jabatan *</label>
            <select
              required
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            >
              <option value="" className="bg-slate-800">Pilih Jabatan</option>
              {(customPositions?.length ? customPositions : POSITION_OPTIONS).map((p) => (
                <option key={p} value={p} className="bg-slate-800">{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "manager" | "staff" }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              >
                <option value="staff" className="bg-slate-800">Staff</option>
                <option value="manager" className="bg-slate-800">Manager</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Profile["status"] }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              >
                <option value="aktif" className="bg-slate-800">Aktif</option>
                <option value="cuti" className="bg-slate-800">Cuti</option>
                <option value="resign" className="bg-slate-800">Resign</option>
              </select>
            </div>
          </div>

          {field("Tanggal Bergabung", "join_date", "date")}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Tambah Anggota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Featured Card (Rank 1) ───────────────────────────────────────────────────
function FeaturedCard({ member, rank, onEdit, onDelete, canManage }: {
  member: Profile; rank: number; onEdit: (m: Profile) => void; onDelete: (m: Profile) => void; canManage: boolean;
}) {
  const accent = getAccent(rank - 1);
  const avatarSrc = member.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(member.full_name ?? "?")}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 flex flex-col md:flex-row"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)", boxShadow: `0 0 60px ${accent.glow}, 0 0 120px rgba(0,0,0,0.6)` }}>
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)" }} />
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: accent.color }} />

      {/* Avatar */}
      <div className="relative md:w-72 flex-shrink-0 flex flex-col items-center justify-end min-h-[280px] md:min-h-0 pt-8">
        {/* Badge removed as requested */}
        {canManage && (
          <div className="absolute top-4 right-4 z-10 flex gap-1.5">
            <button onClick={() => onEdit(member)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-blue-500/30 flex items-center justify-center text-slate-300 hover:text-blue-300 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(member)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-slate-300 hover:text-red-300 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="relative w-48 h-64 md:w-56 md:h-72">
          <Image src={avatarSrc} alt={member.full_name ?? ""} fill className="object-cover object-top" style={{ filter: `drop-shadow(0 0 20px ${accent.glow})` }} unoptimized />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative">
        <div>
          {/* Top Performer label removed as requested */}
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-1">{member.full_name ?? "—"}</h2>
          <p className="text-lg font-semibold uppercase tracking-widest mb-1" style={{ color: accent.color }}>{member.position ?? member.role}</p>
          {member.nik && <p className="text-xs text-slate-500 mb-2">NIK: {member.nik}</p>}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[member.status]}`}>{STATUS_LABELS[member.status]}</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold border ${accent.tag}`}>{member.role.toUpperCase()}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-3 border border-white/10 flex flex-col gap-1" style={{ background: `${accent.color}10` }}>
            <div className="flex items-center gap-1" style={{ color: accent.color }}><Award className="w-4 h-4" /><span className="text-xs text-slate-400">Jabatan</span></div>
            <span className="text-sm font-black text-white">{member.position ?? "—"}</span>
          </div>
          <div className="rounded-xl p-3 border border-white/10 flex flex-col gap-1" style={{ background: `${accent.color}10` }}>
            <div className="flex items-center gap-1" style={{ color: accent.color }}><Clock className="w-4 h-4" /><span className="text-xs text-slate-400">Bergabung</span></div>
            <span className="text-sm font-black text-white">{member.join_date ? new Date(member.join_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
          </div>
          <div className="rounded-xl p-3 border border-white/10 flex flex-col gap-1" style={{ background: `${accent.color}10` }}>
            <div className="flex items-center gap-1" style={{ color: accent.color }}><CheckCircle2 className="w-4 h-4" /><span className="text-xs text-slate-400">Status</span></div>
            <span className="text-sm font-black text-white">{STATUS_LABELS[member.status]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Regular Team Card ────────────────────────────────────────────────────────
function TeamCard({ member, rank, onEdit, onDelete, canManage }: {
  member: Profile; rank: number; onEdit: (m: Profile) => void; onDelete: (m: Profile) => void; canManage: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = getAccent(rank - 1);
  const avatarSrc = member.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(member.full_name ?? "?")}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 cursor-pointer flex flex-col transition-all duration-300"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1a2540 100%)", boxShadow: hovered ? `0 0 40px ${accent.glow}, 0 8px 32px rgba(0,0,0,0.6)` : "0 4px 16px rgba(0,0,0,0.4)", transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent.color}, transparent)` }} />

      {/* Header row */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className={`bg-gradient-to-r ${accent.badge} text-white font-black text-xs w-7 h-7 rounded-lg flex items-center justify-center shadow`}>{rank}</div>
        {canManage && (
          <div className={`flex gap-1 transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(member); }} className="w-6 h-6 rounded-md bg-white/10 hover:bg-blue-500/30 flex items-center justify-center text-slate-400 hover:text-blue-300 transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(member); }} className="w-6 h-6 rounded-md bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-slate-400 hover:text-red-300 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="relative h-44 mx-4 rounded-xl overflow-hidden">
        <Image src={avatarSrc} alt={member.full_name ?? ""} fill className="object-cover object-top transition-transform duration-500" style={{ transform: hovered ? "scale(1.05)" : "scale(1)", filter: hovered ? `drop-shadow(0 0 12px ${accent.glow})` : "none" }} unoptimized />
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: `linear-gradient(to top, ${accent.color}30, transparent)` }} />
      </div>

      {/* Info */}
      <div className="px-4 py-3 flex-1 flex flex-col">
        <h3 className="text-sm font-black text-white leading-tight">{member.full_name ?? "—"}</h3>
        <p className="text-xs font-semibold uppercase tracking-wider mt-0.5" style={{ color: accent.color }}>{member.position ?? member.role}</p>
        {member.nik && <p className="text-[10px] text-slate-500 mt-0.5">NIK: {member.nik}</p>}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${STATUS_COLORS[member.status]}`}>{STATUS_LABELS[member.status]}</span>
        </div>
        <div className="mt-auto pt-2 border-t border-white/5 mt-3">
          <div className="text-[10px] text-slate-500">{member.join_date ? `Bergabung: ${new Date(member.join_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}</div>
        </div>
      </div>
      <div className="h-0.5 w-full transition-all duration-300" style={{ background: hovered ? `linear-gradient(90deg, transparent, ${accent.color}, transparent)` : "transparent" }} />
    </div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
function LeaderboardRow({ member, index }: { member: Profile; index: number }) {
  const accent = getAccent(index);
  const avatarSrc = member.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(member.full_name ?? "?")}`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all"
      style={{ background: index === 0 ? `${accent.color}12` : "rgba(255,255,255,0.02)" }}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 bg-gradient-to-br ${accent.badge} text-white`}>{index + 1}</div>
      <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
        <Image src={avatarSrc} alt={member.full_name ?? ""} fill className="object-cover object-top" unoptimized />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">{member.full_name ?? "—"}</div>
        <div className="text-[10px] font-medium truncate" style={{ color: accent.color }}>{member.position ?? member.role}</div>
      </div>
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${STATUS_COLORS[member.status]} flex-shrink-0`}>{STATUS_LABELS[member.status]}</span>
    </div>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/5 overflow-hidden animate-pulse" style={{ background: "#0f172a" }}>
      <div className="h-1 bg-white/5" />
      <div className="px-4 pt-3 pb-1 flex justify-between items-center">
        <div className="w-7 h-7 rounded-lg bg-white/10" />
      </div>
      <div className="mx-4 h-44 rounded-xl bg-white/5" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 rounded bg-white/10 w-3/4" />
        <div className="h-2.5 rounded bg-white/5 w-1/2" />
        <div className="h-2 rounded bg-white/5 w-1/3" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { profile, isSuperAdmin, activeStoreId } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | Profile["status"]>("semua");
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [deletingMember, setDeletingMember] = useState<Profile | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const canManage = profile?.role === "manager" || profile?.role === "admin" || isSuperAdmin;

  const effectiveStoreId = isSuperAdmin ? activeStoreId : profile?.store_id;

  // ─ Load members ─
  useEffect(() => {
    if (isSuperAdmin && !activeStoreId) return;
    if (effectiveStoreId || isSuperAdmin) {
      loadMembers();
    }
  }, [effectiveStoreId, isSuperAdmin, activeStoreId]);

  async function loadMembers() {
    setLoading(true);
    const storeFilter = isSuperAdmin ? (activeStoreId ?? undefined) : undefined;
    const data = await getTeamMembers(storeFilter);
    setMembers(data);
    setLoading(false);
  }

  // ─ Filter members ─
  const filtered = members.filter((m) => {
    const matchSearch =
      !searchQuery ||
      (m.full_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.position ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.nik ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "semua" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getPositionRank = (position: string | null) => {
    if (!position) return 99;
    const p = position.toLowerCase();
    if (p === "store manager") return 1;
    if (p === "asst. store manager" || p === "assistant store manager") return 2;
    if (p === "chatime staff") return 3;
    if (p === "partimer") return 4;

    // Fallback if they use different strings but similar meaning
    if (p.includes("manager") && !p.includes("asst")) return 1;
    if (p.includes("asst") || p.includes("supervisor")) return 2;
    if (p.includes("staff")) return 3;
    if (p.includes("partime")) return 4;

    return 5;
  };

  // Sort: by hierarchy, then by join_date
  const sorted = [...filtered].sort((a, b) => {
    const rankA = getPositionRank(a.position);
    const rankB = getPositionRank(b.position);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return new Date(a.join_date ?? "").getTime() - new Date(b.join_date ?? "").getTime();
  });

  const featured = sorted[0] ?? null;
  const rest = sorted.slice(1);

  // ─ CRUD Handlers ─
  async function handleSave(formData: MemberFormData, avatarFile?: File) {
    if (!effectiveStoreId && !isSuperAdmin) {
      setToast({ message: "Akun ini belum terhubung ke toko manapun.", type: "error" });
      return;
    }
    setFormLoading(true);

    let avatarUrl = formData.avatar_url;

    // Upload avatar dulu jika ada file baru
    if (avatarFile) {
      const tempId = editingMember?.id ?? crypto.randomUUID();
      const { url, error: uploadErr } = await uploadAvatar(avatarFile, tempId);
      if (uploadErr) {
        setToast({ message: `Gagal upload foto: ${uploadErr}`, type: "error" });
        setFormLoading(false);
        return;
      }
      avatarUrl = url ?? undefined;
    }

    if (editingMember) {
      // Edit
      const { error } = await updateTeamMember(editingMember.id, { ...formData, avatar_url: avatarUrl });
      if (error) {
        setToast({ message: `Gagal update: ${error}`, type: "error" });
      } else {
        setToast({ message: "Anggota berhasil diperbarui!", type: "success" });
        setShowForm(false);
        setEditingMember(null);
        loadMembers();
      }
    } else {
      // Tambah baru
      if (!effectiveStoreId) {
        setToast({ message: "Gagal: Store ID tidak ditemukan.", type: "error" });
        setFormLoading(false);
        return;
      }
      
      const { error } = await addTeamMember(effectiveStoreId, { ...formData, avatar_url: avatarUrl });
      if (error) {
        setToast({ message: `Gagal menambah anggota: ${error}`, type: "error" });
      } else {
        setToast({ message: "Anggota berhasil ditambahkan!", type: "success" });
        setShowForm(false);
        loadMembers();
      }
    }
    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deletingMember) return;
    setDeleteLoading(true);
    const { error } = await deleteTeamMember(deletingMember.id);
    if (error) {
      setToast({ message: `Gagal hapus: ${error}`, type: "error" });
    } else {
      setToast({ message: `${deletingMember.full_name} telah dihapus dari tim.`, type: "success" });
      setDeletingMember(null);
      loadMembers();
    }
    setDeleteLoading(false);
  }

  const openEdit = (m: Profile) => { setEditingMember(m); setShowForm(true); };
  const openDelete = (m: Profile) => setDeletingMember(m);

  // Stats
  const totalAktif = members.filter((m) => m.status === "aktif").length;
  const totalCuti = members.filter((m) => m.status === "cuti").length;

  return (
    <div className="min-h-full -m-8 p-8" style={{ background: "linear-gradient(180deg, #0a0f1e 0%, #0f172a 40%, #0a0f1e 100%)" }}>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modals */}
      {showForm && (
        <MemberFormModal
          member={editingMember}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingMember(null); }}
          loading={formLoading}
          customPositions={profile?.stores?.custom_positions ?? undefined}
        />
      )}
      {deletingMember && (
        <DeleteConfirmModal
          member={deletingMember}
          onConfirm={handleDelete}
          onCancel={() => setDeletingMember(null)}
          loading={deleteLoading}
        />
      )}

      {/* ── Header ── */}
      <div className="text-center mb-8 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-32 rounded-full opacity-10 blur-3xl bg-blue-500" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4 text-xs font-semibold text-slate-300 tracking-widest uppercase">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            {profile?.stores?.name ?? "Meet Our Team"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            {" "}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {profile?.stores?.name ?? "Kami"}
            </span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Great Team, Great Impact.
          </p>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Anggota", value: members.length.toString(), icon: <Users className="w-4 h-4" />, color: "#3b82f6" },
          { label: "Anggota Aktif", value: totalAktif.toString(), icon: <CheckCircle2 className="w-4 h-4" />, color: "#10b981" },
          { label: "Sedang Cuti", value: totalCuti.toString(), icon: <Clock className="w-4 h-4" />, color: "#f59e0b" },
          { label: "Toko", value: profile?.stores?.name ?? "—", icon: <Zap className="w-4 h-4" />, color: "#a855f7" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 p-4 flex items-center gap-3" style={{ background: `${s.color}08` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="text-xl font-black text-white truncate max-w-[80px]">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Cari nama, jabatan, atau NIK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="semua" className="bg-slate-800">Semua Status</option>
            <option value="aktif" className="bg-slate-800">Aktif</option>
            <option value="cuti" className="bg-slate-800">Cuti</option>
            <option value="resign" className="bg-slate-800">Resign</option>
          </select>
        </div>

        {/* Tambah button */}
        {canManage && (
          <button
            onClick={() => { setEditingMember(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Anggota
          </button>
        )}
      </div>

      {/* ── Main Content ── */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/10 h-72 animate-pulse" style={{ background: "#0f172a" }} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 h-96 animate-pulse" style={{ background: "#0f172a" }} />
        </div>
      ) : members.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Tim masih kosong</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">Mulai tambahkan anggota tim untuk mengelola toko ini bersama-sama.</p>
          {canManage && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
              <Plus className="w-4 h-4" /> Tambah Anggota Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT — Featured + cards */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {featured && (
              <FeaturedCard member={featured} rank={1} onEdit={openEdit} onDelete={openDelete} canManage={canManage} />
            )}
            {rest.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rest.map((m, i) => (
                  <TeamCard key={m.id} member={m} rank={i + 2} onEdit={openEdit} onDelete={openDelete} canManage={canManage} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Leaderboard */}
            <div className="rounded-2xl border border-white/10 p-5 flex-1" style={{ background: "linear-gradient(160deg, #0f172a, #1a2540)" }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daftar Anggota</h3>
                <span className="ml-auto text-xs text-slate-500">{sorted.length} orang</span>
              </div>
              <div className="space-y-2">
                {sorted.map((m, i) => <LeaderboardRow key={m.id} member={m} index={i} />)}
              </div>
              {filtered.length !== members.length && (
                <p className="text-[10px] text-slate-500 text-center mt-4">Menampilkan {filtered.length} dari {members.length} anggota</p>
              )}
            </div>

            {/* Distribusi Jabatan */}
            <div className="rounded-2xl border border-white/10 p-5" style={{ background: "linear-gradient(160deg, #0f172a, #1a2540)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Distribusi Status</h3>
              </div>
              <div className="space-y-3">
                {(["aktif", "cuti", "resign"] as const).map((s, i) => {
                  const count = members.filter((m) => m.status === s).length;
                  const pct = members.length > 0 ? (count / members.length) * 100 : 0;
                  const colors = [ACCENT_COLORS[0].color, ACCENT_COLORS[3].color, ACCENT_COLORS[5].color];
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 capitalize">{STATUS_LABELS[s]}</span>
                        <span className="text-slate-400">{count} orang ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
