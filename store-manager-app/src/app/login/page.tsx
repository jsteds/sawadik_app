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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();

  // ── Standard login state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nik, setNik] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

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
        options: { data: { full_name: fullName, nik } },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Registrasi berhasil! Silakan periksa email Anda.");
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 font-sans">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isRegistering ? "Buat Akun Baru" : "Selamat Datang"}
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-zinc-400">
            {isRegistering
              ? "Daftar untuk mulai mengelola operasional Anda"
              : "Masukkan email & password untuk melanjutkan"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-700 dark:text-zinc-300">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-blue-500"
                    placeholder="e.g. Budi Santoso"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nik" className="text-gray-700 dark:text-zinc-300">
                    NIK
                  </Label>
                  <Input
                    id="nik"
                    type="text"
                    required
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-blue-500"
                    placeholder="e.g. 12345678"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-zinc-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-blue-500"
                placeholder="nama@perusahaan.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className={cn(
                "w-full transition-all mt-4 font-semibold shadow-md",
                "bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white"
              )}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : isRegistering ? (
                "Daftar Sekarang"
              ) : (
                "Lanjut"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
                setMessage("");
              }}
              className="text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isRegistering
                ? "Sudah punya akun? Login di sini"
                : "Belum punya akun? Daftar di sini"}
            </button>
          </div>

          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-gray-500 dark:text-zinc-400">
                ATAU LANJUTKAN DENGAN
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-6 bg-white dark:bg-zinc-950 border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
