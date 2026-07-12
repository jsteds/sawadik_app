"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Store } from "@/lib/types";

interface Props {
  profile: Profile;
  onComplete: () => Promise<void>;
}

type SetupStep = 2 | 3;

export default function AreaManagerSetup({ profile, onComplete }: Props) {
  const [step, setStep] = useState<SetupStep>(2);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingStores, setLoadingStores] = useState(false);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [nik, setNik] = useState(profile?.nik || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load stores once when component mounts (step 2)
  useState(() => {
    (async () => {
      setLoadingStores(true);
      const { data } = await supabase.from("stores").select("*").order("name");
      if (data) {
        setStores(data as Store[]);
        // Pre-select existing managed_store_ids if any
        if (profile.managed_store_ids && profile.managed_store_ids.length > 0) {
          setSelectedIds(new Set(profile.managed_store_ids));
        }
      }
      setLoadingStores(false);
      setStoresLoaded(true);
    })();
  });

  const toggleStore = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStep2 = () => {
    if (selectedIds.size === 0) {
      setError("Pilih minimal 1 store yang masuk dalam lingkup pengawasan Anda.");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !nik.trim()) {
      setError("Nama dan NIK wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        auth_user_id: session?.user?.id || profile?.auth_user_id,
        email: session?.user?.email || profile?.email,
        full_name: fullName.trim(),
        nik: nik.trim(),
        managed_store_ids: Array.from(selectedIds),
        role: "area_manager",
        position: "Area Manager",
        status: "aktif",
      }, { onConflict: 'auth_user_id' });

    if (updateError) {
      setError("Gagal menyimpan: " + updateError.message);
      setLoading(false);
      return;
    }

    await onComplete();
  };

  const STEPS = [
    { label: "Pilih Store", n: 2 },
    { label: "Data Diri", n: 3 },
  ];

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-4">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Selamat Datang, Area Manager!</h1>
        <p className="text-zinc-400 text-sm">Lengkapi informasi berikut untuk memulai.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {STEPS.map(({ label, n }, i) => (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  step > n
                    ? "bg-amber-500 text-white"
                    : step === n
                    ? "bg-amber-500 text-white ring-4 ring-amber-500/20"
                    : "bg-zinc-700 text-zinc-400"
                )}
              >
                {step > n ? <Check className="w-4 h-4" /> : n - 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  step === n ? "text-amber-400" : "text-zinc-500"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-8 h-px", step > n ? "bg-amber-500" : "bg-zinc-700")} />
            )}
          </div>
        ))}
      </div>

      {/* Step 2 — Store Selection */}
      {step === 2 && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Pilih Store Lingkup</h2>
            <p className="text-zinc-400 text-sm">Centang store yang masuk dalam pengawasan Anda.</p>
          </div>

          {loadingStores ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{selectedIds.size} dari {stores.length} dipilih</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.size === stores.length
                        ? new Set()
                        : new Set(stores.map((s) => s.id))
                    )
                  }
                  className="text-xs text-amber-400 hover:underline font-medium"
                >
                  {selectedIds.size === stores.length ? "Hapus Semua" : "Pilih Semua"}
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stores.map((store) => {
                  const selected = selectedIds.has(store.id);
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => toggleStore(store.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                        selected
                          ? "bg-amber-500/10 border-amber-500/50"
                          : "bg-zinc-800 border-zinc-700 hover:border-amber-500/30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0",
                          selected ? "bg-amber-500 border-amber-500" : "border-zinc-600"
                        )}
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{store.name}</p>
                        {store.code && <p className="text-xs text-zinc-500">{store.code}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-800">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button
            onClick={handleStep2}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            disabled={loadingStores}
          >
            Lanjut <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 3 — Profile Data */}
      {step === 3 && (
        <form onSubmit={handleStep3} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Lengkapi Data Diri</h2>
            <p className="text-zinc-400 text-sm">Konfirmasi atau perbarui nama dan NIK Anda.</p>
          </div>

          {/* Selected stores summary */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs font-semibold text-amber-400 mb-1">Store dipilih ({selectedIds.size})</p>
            <p className="text-xs text-amber-300/70 leading-relaxed">
              {stores
                .filter((s) => selectedIds.has(s.id))
                .map((s) => s.name)
                .join(", ")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-setup-name" className="text-zinc-300">Nama Lengkap</Label>
            <Input
              id="am-setup-name"
              type="text"
              placeholder="Nama lengkap Area Manager"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-setup-nik" className="text-zinc-300">NIK (No. Induk Karyawan)</Label>
            <Input
              id="am-setup-nik"
              type="text"
              placeholder="Contoh: AM-001"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-800">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => { setStep(2); setError(""); }}
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
                "Mulai Dashboard"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
