"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, User, IdCard, MapPin, Sparkles, ArrowRight, Loader2, Search } from "lucide-react";

export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  
  // Determine role from user metadata (set during registration)
  // or fallback to localStorage (set before Google OAuth redirect)
  const [userRole, setUserRole] = useState<string>("manager");

  useEffect(() => {
    const storedRole = localStorage.getItem("intended_role");
    const metaRole = session?.user?.user_metadata?.role;
    
    // Prioritaskan localStorage karena Google OAuth tidak membawa role di metadata
    if (storedRole) {
      setUserRole(storedRole);
    } else if (metaRole) {
      setUserRole(metaRole);
    }
  }, [session]);

  const isStaff = userRole === "staff";

  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [fullName, setFullName] = useState("");
  const [nik, setNik] = useState("");
  
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isStaff) {
      supabase.from("stores").select("id, name, location").order("name").then(({ data }) => {
        if (data) setAvailableStores(data);
      });
    }
  }, [isStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      let finalStoreId = "";

      if (isStaff) {
        if (!selectedStoreId) {
          throw new Error("Silakan pilih toko tempat Anda bekerja.");
        }
        finalStoreId = selectedStoreId;
      } else {
        // 1. Buat Store baru untuk Manager
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .insert({
            name: storeName.trim(),
            location: storeLocation.trim(),
          })
          .select()
          .single();

        if (storeError) {
          throw new Error(`Gagal membuat toko: ${storeError.message}`);
        }

        if (!storeData) {
          throw new Error("Gagal menerima data toko baru.");
        }
        finalStoreId = storeData.id;
      }

      // 2. Hubungkan profile user dengan store_id dan update informasi
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          store_id: finalStoreId,
          full_name: fullName.trim(),
          nik: nik.trim(),
          role: isStaff ? "staff" : "manager",
          position: isStaff ? "Staff" : "Store Manager",
          status: "aktif",
        })
        .eq("auth_user_id", session.user.id);

      if (profileError) {
        throw new Error(`Gagal memperbarui profil: ${profileError.message}`);
      }

      setSuccess(true);
      
      // 3. Refresh profile di AuthContext untuk mengupdate UI
      await refreshProfile();
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl relative overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="space-y-2 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Langkah Awal</span>
          </div>
          <CardTitle className="text-3xl font-extrabold text-white tracking-tight">
            {isStaff ? "Bergabung ke Toko" : "Siapkan Toko & Profil Anda"}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            {isStaff 
              ? "Selamat datang! Silakan lengkapi profil Anda dan pilih toko tempat Anda bekerja." 
              : "Selamat datang! Sebagai Store Manager baru, silakan buat toko pertama Anda dan lengkapi detail profil Anda untuk mengelola tim."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} className="divide-y divide-zinc-800">
          <CardContent className="space-y-6 pt-6 pb-8">
            {/* Bagian 1: Detail Toko */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-400" />
                Informasi Toko
              </h3>
              
              {isStaff ? (
                <div className="space-y-2">
                  <Label htmlFor="storeSelect" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                    Pilih Toko / Cabang
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <select
                      id="storeSelect"
                      className="w-full pl-9 bg-zinc-950 border border-zinc-800 rounded-md py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      required
                      disabled={loading || success}
                    >
                      <option value="" className="bg-zinc-900">-- Pilih Toko Anda --</option>
                      {availableStores.map(store => (
                        <option key={store.id} value={store.id} className="bg-zinc-900">
                          {store.name} {store.location ? `- ${store.location}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                      Nama Toko / Cabang
                    </Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        id="storeName"
                        placeholder="e.g. Sentra Jaya Bandung"
                        className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        required={!isStaff}
                        disabled={loading || success}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeLocation" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                      Lokasi / Alamat Cabang
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        id="storeLocation"
                        placeholder="e.g. Jl. Riau No. 12, Bandung"
                        className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                        value={storeLocation}
                        onChange={(e) => setStoreLocation(e.target.value)}
                        required={!isStaff}
                        disabled={loading || success}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bagian 2: Profil */}
            <div className="space-y-4 pt-4">
              <h3 className="text-md font-semibold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Profil {isStaff ? "Karyawan" : "Manager"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                    Nama Lengkap Anda
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="fullName"
                      placeholder="e.g. Eds"
                      className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading || success}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nik" className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                    NIK / Nomor Induk Karyawan
                  </Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="nik"
                      placeholder={isStaff ? "e.g. STF-2026-001" : "e.g. MGR-2026-001"}
                      className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus-visible:ring-blue-500"
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      required
                      disabled={loading || success}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-6 pb-2 flex justify-end gap-3">
            <Button
              type="submit"
              disabled={loading || success}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-6 py-2 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Menyimpan...</span>
                </>
              ) : success ? (
                <span>Berhasil!</span>
              ) : (
                <>
                  <span>Siapkan Dashboard Toko</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
