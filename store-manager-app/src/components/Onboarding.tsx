"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, User, IdCard, Sparkles, ArrowRight, Loader2, Search, Check } from "lucide-react";

export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  
  const [userRole, setUserRole] = useState<string>("manager");

  useEffect(() => {
    const storedRole = localStorage.getItem("intended_role");
    const metaRole = session?.user?.user_metadata?.role;
    
    if (storedRole) {
      setUserRole(storedRole);
    } else if (metaRole) {
      setUserRole(metaRole);
    }
  }, [session]);

  const isStaff = userRole === "staff";

  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [fullName, setFullName] = useState("");
  const [nik, setNik] = useState("");
  
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  
  // Custom Combobox state
  const [searchStore, setSearchStore] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch all stores regardless of role
  useEffect(() => {
    supabase.from("stores").select("id, name, location").order("name").then(({ data }) => {
      if (data) setAvailableStores(data);
    });
  }, []);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStores = availableStores.filter(store => 
    store.name.toLowerCase().includes(searchStore.toLowerCase()) || 
    (store.location && store.location.toLowerCase().includes(searchStore.toLowerCase()))
  );

  const selectedStore = availableStores.find(s => s.id === selectedStoreId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      if (!selectedStoreId) {
        throw new Error("Silakan cari dan pilih toko tempat Anda bekerja dari daftar.");
      }

      // Hubungkan profile user dengan store_id dan update informasi
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          store_id: selectedStoreId,
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
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl relative overflow-visible">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="space-y-2 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Langkah Awal</span>
          </div>
          <CardTitle className="text-3xl font-extrabold text-white tracking-tight">
            {isStaff ? "Bergabung ke Toko" : "Siapkan Profil & Pilih Toko"}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Selamat datang! Silakan lengkapi profil Anda dan cari toko tempat Anda bekerja di database kami.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} className="divide-y divide-zinc-800">
          <CardContent className="space-y-6 pt-6 pb-8">
            {/* Bagian 1: Detail Toko (COMBOBOX) */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-400" />
                Informasi Toko
              </h3>
              
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                  Cari & Pilih Toko / Cabang
                </Label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder={selectedStore ? `${selectedStore.name} ${selectedStore.location ? `- ${selectedStore.location}` : ''}` : "Ketik nama toko untuk mencari..."}
                    className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus-visible:ring-blue-500"
                    value={searchStore}
                    onChange={(e) => {
                      setSearchStore(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedStoreId(""); // Reset selection if they type again
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    disabled={loading || success}
                  />
                </div>

                {/* Dropdown Results */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-md shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredStores.length === 0 ? (
                      <div className="p-4 text-sm text-zinc-400 text-center">
                        Tidak ada toko yang cocok dengan pencarian Anda.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {filteredStores.map(store => (
                          <li
                            key={store.id}
                            className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-zinc-800 transition-colors ${selectedStoreId === store.id ? 'bg-blue-900/20 text-blue-400' : 'text-zinc-200'}`}
                            onClick={() => {
                              setSelectedStoreId(store.id);
                              setSearchStore("");
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="truncate pr-4">
                              {store.name} <span className="text-zinc-500">{store.location ? `- ${store.location}` : ""}</span>
                            </span>
                            {selectedStoreId === store.id && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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
              disabled={loading || success || !selectedStoreId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-6 py-2 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
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
                  <span>Masuk Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
