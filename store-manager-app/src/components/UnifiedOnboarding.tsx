"use client";

import { useState } from "react";
import { Store, ShieldCheck, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import AreaManagerSetup from "./AreaManagerSetup";
import Onboarding from "./Onboarding";

interface UnifiedOnboardingProps {
  profile: any;
  refreshProfile: () => Promise<void>;
}

export default function UnifiedOnboarding({ profile, refreshProfile }: UnifiedOnboardingProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  if (selectedRole === "area_manager") {
    return <AreaManagerSetup profile={profile} onComplete={refreshProfile} />;
  }

  if (selectedRole === "store_manager" || selectedRole === "staff") {
    return <Onboarding selectedRole={selectedRole} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8 w-full max-w-4xl mx-auto">
      <div className="w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Pilih Peran Anda</h1>
          <p className="text-zinc-400">Pilih role Anda di dalam perusahaan untuk melanjutkan setup profil.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Area Manager Card */}
          <button
            onClick={() => setSelectedRole("area_manager")}
            className="group relative flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-amber-500/50 transition-all text-left w-full h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Area Manager</h3>
            <p className="text-sm text-zinc-400 text-center">
              Mengawasi beberapa toko (store) sekaligus.
            </p>
          </button>

          {/* Store Manager Card */}
          <button
            onClick={() => setSelectedRole("store_manager")}
            className="group relative flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-blue-500/50 transition-all text-left w-full h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Store className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Store Manager</h3>
            <p className="text-sm text-zinc-400 text-center">
              Mengelola operasional satu toko secara penuh.
            </p>
          </button>

          {/* Staff Card */}
          <button
            onClick={() => setSelectedRole("staff")}
            className="group relative flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-emerald-500/50 transition-all text-left w-full h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Staff</h3>
            <p className="text-sm text-zinc-400 text-center">
              Anggota tim yang bertugas di satu toko.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
