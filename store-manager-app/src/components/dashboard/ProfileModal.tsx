"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateMyProfile } from "@/lib/supabase";
import { ROLE_LABELS } from "@/lib/types";
import {
  X,
  User,
  Mail,
  Lock,
  Shield,
  CreditCard,
  Building2,
  Calendar,
  Check,
  Loader2,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { profile, refreshProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [nik, setNik] = useState(profile?.nik || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!profile) return null;

  const getInitials = (name: string) => {
    if (!name) return "EA";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Nama lengkap tidak boleh kosong.");
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg("Password baru minimal 6 karakter.");
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg("Konfirmasi password baru tidak cocok.");
      return;
    }

    setLoading(true);

    const updates: {
      full_name?: string;
      nik?: string;
      email?: string;
      password?: string;
    } = {
      full_name: fullName.trim(),
      nik: nik.trim(),
    };

    if (email.trim() && email.trim() !== profile.email) {
      updates.email = email.trim();
    }

    if (password.trim()) {
      updates.password = password.trim();
    }

    const { error } = await updateMyProfile(profile.id, updates);

    if (error) {
      setErrorMsg(error);
      setLoading(false);
      return;
    }

    setSuccessMsg("Profil berhasil diperbarui!");
    await refreshProfile();
    setPassword("");
    setConfirmPassword("");
    setLoading(false);

    setTimeout(() => {
      setSuccessMsg("");
    }, 4000);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "area_manager":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "super_admin":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "manager":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-zinc-900 p-6 border-b border-zinc-800/80">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-zinc-900">
              {getInitials(profile.full_name || profile.email)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">
                {profile.full_name || profile.email}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(
                    profile.role
                  )}`}
                >
                  <Shield className="w-3 h-3 mr-1.5" />
                  {ROLE_LABELS[profile.role] || profile.role}
                </span>
                {profile.position && (
                  <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-full">
                    {profile.position}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Informasi Pribadi */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Informasi Pribadi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                    NIK / ID Pegawai
                  </label>
                  <input
                    type="text"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="Contoh: 1029384"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Status Info (Read-only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="px-3.5 py-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    Wilayah / Cabang
                  </span>
                  <span className="text-xs font-medium text-zinc-200">
                    {profile.role === "area_manager"
                      ? "Seluruh Cabang (Area)"
                      : profile.stores?.name || "Pusat"}
                  </span>
                </div>

                <div className="px-3.5 py-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Tanggal Bergabung
                  </span>
                  <span className="text-xs font-medium text-zinc-200">
                    {profile.join_date || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Keamanan & Kredensial */}
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                Keamanan & Login Akun
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  Alamat Email Akun
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Password Baru (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Kosongkan jika tetap"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Konfirmasi Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                Catatan: Jika Anda mengubah email atau password, Anda mungkin diminta untuk masuk kembali dengan kredensial baru Anda.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar / Logout
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
