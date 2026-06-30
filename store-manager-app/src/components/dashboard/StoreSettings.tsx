"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateStoreSettings } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, X, Settings2, Eye, ShieldAlert, Check } from "lucide-react";

export default function StoreSettings() {
  const { profile, isSuperAdmin, activeStoreId, allStores, refreshProfile } = useAuth();
  
  const [customPositions, setCustomPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState("");
  const [teamVisibility, setTeamVisibility] = useState(false);
  const [cleaningVisibility, setCleaningVisibility] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const effectiveStoreId = isSuperAdmin ? activeStoreId : profile?.store_id;

  useEffect(() => {
    let currentStore = profile?.stores;
    if (isSuperAdmin && activeStoreId) {
      currentStore = allStores.find((s) => s.id === activeStoreId) as any;
    }

    if (currentStore) {
      setCustomPositions(currentStore.custom_positions || []);
      setTeamVisibility(currentStore.team_visibility || false);
      setCleaningVisibility(currentStore.cleaning_visibility || false);
    }
  }, [profile, isSuperAdmin, activeStoreId, allStores]);

  const handleAddPosition = () => {
    if (newPosition.trim() && !customPositions.includes(newPosition.trim())) {
      setCustomPositions([...customPositions, newPosition.trim()]);
      setNewPosition("");
    }
  };

  const handleRemovePosition = (pos: string) => {
    setCustomPositions(customPositions.filter((p) => p !== pos));
  };

  const handleSave = async () => {
    if (!effectiveStoreId) return;
    
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const { error } = await updateStoreSettings(effectiveStoreId, {
      custom_positions: customPositions,
      team_visibility: teamVisibility,
      cleaning_visibility: cleaningVisibility,
    });

    if (error) {
      setErrorMsg(`Gagal menyimpan pengaturan: ${error}`);
    } else {
      setSuccessMsg("Pengaturan berhasil disimpan.");
      await refreshProfile();
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    
    setSaving(false);
  };

  if (!profile || (profile.role === "staff" && !isSuperAdmin)) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-blue-400" />
            Pengaturan Toko
          </h2>
          <p className="text-zinc-400 mt-1">Kelola preferensi dan privasi untuk cabang Anda.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Simpan Perubahan
        </Button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jabatan Kustom */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Daftar Jabatan / Role</CardTitle>
            <CardDescription className="text-zinc-400">
              Sesuaikan pilihan jabatan yang akan muncul saat menambah anggota tim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="Contoh: Barista Senior"
                className="bg-zinc-950 border-zinc-800 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPosition();
                  }
                }}
              />
              <Button onClick={handleAddPosition} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {customPositions.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">Belum ada jabatan kustom. Sistem akan menggunakan opsi bawaan.</p>
              ) : (
                customPositions.map((pos) => (
                  <div key={pos} className="flex items-center gap-1 bg-zinc-800 px-3 py-1.5 rounded-full text-sm text-zinc-200">
                    <span>{pos}</span>
                    <button 
                      onClick={() => handleRemovePosition(pos)}
                      className="text-zinc-400 hover:text-red-400 ml-1 focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visibilitas */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Visibilitas Antar Cabang</CardTitle>
            <CardDescription className="text-zinc-400">
              Atur privasi data toko Anda dari cabang lain dalam satu perusahaan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
              <div className="space-y-0.5">
                <Label className="text-white text-base">Visibilitas Tim</Label>
                <p className="text-sm text-zinc-400 max-w-[250px]">
                  Izinkan cabang lain melihat daftar anggota tim Anda.
                </p>
              </div>
              <Switch 
                checked={teamVisibility} 
                onCheckedChange={setTeamVisibility} 
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
              <div className="space-y-0.5">
                <Label className="text-white text-base">General Cleaning</Label>
                <p className="text-sm text-zinc-400 max-w-[250px]">
                  Izinkan cabang lain melihat laporan general cleaning Anda.
                </p>
              </div>
              <Switch 
                checked={cleaningVisibility} 
                onCheckedChange={setCleaningVisibility} 
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-200">
              <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
              <p>
                Meskipun visibilitas diaktifkan, cabang lain <strong>hanya dapat melihat (read-only)</strong>. Hak untuk mengubah data tetap hanya dimiliki oleh manajer di toko ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
