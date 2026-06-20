"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginRole = "manager" | "staff";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("manager");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
      return;
    }

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            // Secara default user baru bisa ditandai sebagai role tertentu (opsional)
            role: role
          }
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setMessage("Registrasi berhasil! Silakan periksa email Anda (jika konfirmasi diaktifkan), atau langsung masuk.");
        setIsRegistering(false);
        setLoading(false);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    }
  };

  const isManager = role === "manager";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Role Selector Tabs */}
        <div className="flex p-1 bg-gray-200/50 dark:bg-zinc-900 rounded-xl">
          <button
            onClick={() => setRole("manager")}
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
            onClick={() => setRole("staff")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
              !isManager 
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Users className="w-4 h-4" />
            Staff Toko
          </button>
        </div>

        <Card className={cn(
          "w-full shadow-xl border-t-4 transition-colors duration-300",
          isManager ? "border-t-blue-600" : "border-t-emerald-600"
        )}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isManager ? "Store Manager" : "Staff Toko"}
            </CardTitle>
            <CardDescription className="text-center">
              {isRegistering 
                ? "Daftar akun baru untuk mulai bergabung" 
                : (isManager ? "Login ke akun Anda untuk mengelola toko" : "Login ke akun Anda untuk melihat tugas")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isRegistering && (
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
                {loading ? "Memproses..." : (isRegistering ? "Daftar" : "Masuk")}
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
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
