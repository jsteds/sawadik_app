"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, Users, ShieldCheck, Check, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Store as StoreType } from "@/lib/types";

type LoginRole = "manager" | "staff" | "area_manager";

// ─── Area Manager Step Types ───────────────────────────────────────────────────
type AMStep = 1 | 2 | 3;

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("manager");

  // ── Standard login state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nik, setNik] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // ── Area Manager wizard state ──
  const [amStep, setAmStep] = useState<AMStep>(1);
  const [amStores, setAmStores] = useState<StoreType[]>([]);
  const [amSelectedIds, setAmSelectedIds] = useState<Set<string>>(new Set());
  const [amFullName, setAmFullName] = useState("");
  const [amNik, setAmNik] = useState("");
  const [amLoadingStores, setAmLoadingStores] = useState(false);
  const [amProfileId, setAmProfileId] = useState<string | null>(null);
  const [amIsRegistering, setAmIsRegistering] = useState(false);
  const [amConfirmPassword, setAmConfirmPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  // Reset wizard when switching to/from area_manager tab
  const handleRoleChange = (newRole: LoginRole) => {
    setRole(newRole);
    setError("");
    setMessage("");
    if (newRole === "area_manager") {
      setAmStep(1);
      setAmSelectedIds(new Set());
      setAmFullName("");
      setAmNik("");
      setEmail("");
      setPassword("");
    }
  };

  // ─── Standard login handler (Manager / Staff) ──────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co" ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      setTimeout(() => router.push("/dashboard"), 1000);
      return;
    }

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, nik, role } },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Registrasi berhasil! Silakan periksa email Anda.");
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  // ─── Helper: load stores + advance to step 2 after successful auth ───────────
  const amLoadStoresAndAdvance = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name, nik, managed_store_ids")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      setError("Profil tidak ditemukan. Hubungi Super Admin atau coba lagi setelah konfirmasi email.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.role !== "area_manager") {
      setError(
        `Akun ini terdaftar sebagai "${profile.role}", bukan Area Manager. Gunakan tab yang sesuai.`
      );
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    setAmProfileId(profile.id);
    setAmFullName(profile.full_name || "");
    setAmNik(profile.nik || "");
    if (profile.managed_store_ids && profile.managed_store_ids.length > 0) {
      setAmSelectedIds(new Set(profile.managed_store_ids));
    }

    setAmLoadingStores(true);
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (storesError || !stores) {
      setError("Gagal memuat daftar store.");
      setAmLoadingStores(false);
      setLoading(false);
      return;
    }

    setAmStores(stores as StoreType[]);
    setAmLoadingStores(false);
    setLoading(false);
    setAmStep(2);
  };

  // ─── Area Manager Step 1: Login & Verify Role ──────────────────────────────
  const handleAMStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setError("Gagal mendapatkan data pengguna.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    await amLoadStoresAndAdvance(userId);
  };

  // ─── Area Manager Step 1: Register ─────────────────────────────────────────
  const handleAMRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== amConfirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "area_manager" } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If auto-confirmed (session exists), proceed to wizard steps
    if (data.session && data.user) {
      await amLoadStoresAndAdvance(data.user.id);
    } else {
      // Email confirmation required
      setLoading(false);
      setError("");
      setMessage(
        "Registrasi berhasil! Periksa email Anda untuk konfirmasi, lalu kembali ke halaman ini dan login."
      );
      setAmIsRegistering(false);
    }
  };

  // ─── Area Manager Step 2: Store Selection → proceed to Step 3 ─────────────
  const handleAMStep2 = () => {
    if (amSelectedIds.size === 0) {
      setError("Pilih minimal 1 store yang masuk dalam lingkup pengawasan Anda.");
      return;
    }
    setError("");
    setAmStep(3);
  };

  const toggleStore = (storeId: string) => {
    setAmSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  // ─── Area Manager Step 3: Profile Data → Save & Redirect ──────────────────
  const handleAMStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amFullName.trim() || !amNik.trim()) {
      setError("Nama dan NIK wajib diisi.");
      return;
    }
    if (!amProfileId) {
      setError("Sesi tidak valid. Silakan mulai ulang.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: amFullName.trim(),
        nik: amNik.trim(),
        managed_store_ids: Array.from(amSelectedIds),
      })
      .eq("id", amProfileId);

    if (updateError) {
      setError("Gagal menyimpan data: " + updateError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const isManager = role === "manager";
  const isAreaManager = role === "area_manager";

  const AM_STEPS = [
    { label: amIsRegistering ? "Daftar" : "Login", step: 1 },
    { label: "Pilih Store", step: 2 },
    { label: "Data Diri", step: 3 },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* ─── Role Selector Tabs ─── */}
        <div className="flex p-1 bg-gray-200/50 dark:bg-zinc-900 rounded-xl">
          <button
            onClick={() => handleRoleChange("manager")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
              isManager
                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Store className="w-4 h-4" />
            Store Manager
          </button>
          <button
            onClick={() => handleRoleChange("area_manager")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
              isAreaManager
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Area Manager
          </button>
          <button
            onClick={() => handleRoleChange("staff")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
              role === "staff"
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Users className="w-4 h-4" />
            Staff
          </button>
        </div>

        {/* ─── Area Manager Multi-Step Wizard ─── */}
        {isAreaManager ? (
          <Card className="w-full shadow-xl border-t-4 border-t-amber-500">
            <CardHeader className="space-y-3">
              {/* Step progress indicator */}
              <div className="flex items-center justify-center gap-2">
                {AM_STEPS.map(({ label, step }, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all",
                        amStep > step
                          ? "bg-amber-500 text-white"
                          : amStep === step
                          ? "bg-amber-500 text-white ring-2 ring-amber-200"
                          : "bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400"
                      )}
                    >
                      {amStep > step ? <Check className="w-3.5 h-3.5" /> : step}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        amStep === step
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400 dark:text-zinc-500"
                      )}
                    >
                      {label}
                    </span>
                    {i < AM_STEPS.length - 1 && (
                      <div className={cn("w-6 h-px", amStep > step ? "bg-amber-400" : "bg-slate-200 dark:bg-zinc-700")} />
                    )}
                  </div>
                ))}
              </div>

              <CardTitle className="text-xl font-bold text-center">
                {amStep === 1 && (amIsRegistering ? "Daftar Area Manager" : "Login Area Manager")}
                {amStep === 2 && "Pilih Store Lingkup"}
                {amStep === 3 && "Lengkapi Data Diri"}
              </CardTitle>
              <CardDescription className="text-center text-sm">
                {amStep === 1 && (amIsRegistering
                  ? "Buat akun Area Manager baru"
                  : "Masukkan email & password akun Area Manager Anda")}
                {amStep === 2 && "Centang store yang masuk dalam lingkup pengawasan Anda"}
                {amStep === 3 && "Konfirmasi atau perbarui nama dan NIK Anda"}
              </CardDescription>
            </CardHeader>

            {/* ── STEP 1: Credentials (Login or Register) ── */}
            {amStep === 1 && (
              <form onSubmit={amIsRegistering ? handleAMRegister : handleAMStep1}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="am-email">Email</Label>
                    <Input
                      id="am-email"
                      type="email"
                      placeholder="areamanager@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="am-password">Password</Label>
                    <Input
                      id="am-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={amIsRegistering ? "new-password" : "current-password"}
                    />
                  </div>
                  {amIsRegistering && (
                    <div className="space-y-2">
                      <Label htmlFor="am-confirm-password">Konfirmasi Password</Label>
                      <Input
                        id="am-confirm-password"
                        type="password"
                        value={amConfirmPassword}
                        onChange={(e) => setAmConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  {message && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {amIsRegistering ? "Mendaftar..." : "Memverifikasi..."}</>
                    ) : amIsRegistering ? (
                      "Daftar & Lanjutkan"
                    ) : (
                      <><span>Lanjut</span><ChevronRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>

                  <div className="text-sm text-center text-slate-500">
                    {amIsRegistering ? "Sudah punya akun? " : "Belum punya akun? "}
                    <button
                      type="button"
                      onClick={() => {
                        setAmIsRegistering(!amIsRegistering);
                        setError("");
                        setMessage("");
                        setAmConfirmPassword("");
                      }}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    >
                      {amIsRegistering ? "Masuk di sini" : "Daftar di sini"}
                    </button>
                  </div>

                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300 dark:border-zinc-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-zinc-950 px-2 text-slate-500">Atau lanjutkan dengan</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full font-medium"
                    onClick={async () => {
                      setLoading(true);
                      setError("");
                      if (typeof window !== "undefined") {
                        localStorage.setItem("intended_role", "area_manager");
                      }
                      const { error: oauthError } = await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: { redirectTo: `${window.location.origin}/dashboard` },
                      });
                      if (oauthError) {
                        setError(oauthError.message);
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </Button>
                </CardFooter>
              </form>
            )}

            {/* ── STEP 2: Store Checklist ── */}
            {amStep === 2 && (
              <div>
                <CardContent className="space-y-3">
                  {amLoadingStores ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">
                          {amSelectedIds.size} dari {amStores.length} dipilih
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (amSelectedIds.size === amStores.length) {
                              setAmSelectedIds(new Set());
                            } else {
                              setAmSelectedIds(new Set(amStores.map((s) => s.id)));
                            }
                          }}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                        >
                          {amSelectedIds.size === amStores.length ? "Hapus Semua" : "Pilih Semua"}
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {amStores.map((store) => {
                          const selected = amSelectedIds.has(store.id);
                          return (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() => toggleStore(store.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                selected
                                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600"
                                  : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-amber-300"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                  selected
                                    ? "bg-amber-500 border-amber-500"
                                    : "border-slate-300 dark:border-zinc-600"
                                )}
                              >
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-slate-800 dark:text-zinc-100 truncate">
                                  {store.name}
                                </p>
                                {store.code && (
                                  <p className="text-xs text-slate-400 dark:text-zinc-500">{store.code}</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setAmStep(1); setError(""); }}
                  >
                    Kembali
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                    onClick={handleAMStep2}
                    disabled={amLoadingStores}
                  >
                    Lanjut <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardFooter>
              </div>
            )}

            {/* ── STEP 3: Profile Data ── */}
            {amStep === 3 && (
              <form onSubmit={handleAMStep3}>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      Store yang dipilih ({amSelectedIds.size})
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      {amStores
                        .filter((s) => amSelectedIds.has(s.id))
                        .map((s) => s.name)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="am-fullname">Nama Lengkap</Label>
                    <Input
                      id="am-fullname"
                      type="text"
                      placeholder="Nama lengkap Area Manager"
                      value={amFullName}
                      onChange={(e) => setAmFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="am-nik">NIK (No. Induk Karyawan)</Label>
                    <Input
                      id="am-nik"
                      type="text"
                      placeholder="Contoh: AM-001"
                      value={amNik}
                      onChange={(e) => setAmNik(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setAmStep(2); setError(""); }}
                    disabled={loading}
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                    ) : (
                      "Masuk Dashboard"
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        ) : (
          /* ─── Standard Login Card (Manager / Staff) ─── */
          <Card
            className={cn(
              "w-full shadow-xl border-t-4 transition-colors duration-300",
              isManager ? "border-t-blue-600" : "border-t-emerald-600"
            )}
          >
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                {isManager ? "Store Manager" : "Staff Toko"}
              </CardTitle>
              <CardDescription className="text-center">
                {isRegistering
                  ? "Daftar akun baru untuk mulai bergabung"
                  : isManager
                  ? "Login ke akun Anda untuk mengelola toko"
                  : "Login ke akun Anda untuk melihat tugas"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {isRegistering && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nama Lengkap</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Nama Lengkap Anda"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nik">NIK (No. Induk Karyawan)</Label>
                      <Input
                        id="nik"
                        type="text"
                        placeholder="Masukkan NIK Anda"
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={isManager ? "manager@store.com" : "staff@store.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {message && <p className="text-sm text-emerald-500">{message}</p>}
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className={cn(
                    "w-full transition-colors",
                    !isManager && "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                  disabled={loading}
                >
                  {loading ? "Memproses..." : isRegistering ? "Daftar" : "Masuk"}
                </Button>
                <div className="text-sm text-center text-slate-500">
                  {isRegistering ? "Sudah punya akun? " : "Belum punya akun? "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError("");
                      setMessage("");
                    }}
                    className={cn(
                      "hover:underline",
                      isManager ? "text-blue-600" : "text-emerald-600"
                    )}
                  >
                    {isRegistering ? "Masuk di sini" : "Daftar di sini"}
                  </button>
                </div>

                <div className="relative my-2 w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300 dark:border-zinc-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-zinc-950 px-2 text-slate-500">
                      Atau lanjutkan dengan
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-medium"
                  onClick={async () => {
                    setLoading(true);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("intended_role", role);
                    }
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: `${window.location.origin}/dashboard` },
                    });
                    if (error) {
                      setError(error.message);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
