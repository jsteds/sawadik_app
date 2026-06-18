"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-950">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Store Manager</CardTitle>
          <CardDescription className="text-center">
            {isRegistering ? "Daftar akun baru untuk mulai bergabung" : "Login ke akun Anda untuk mengelola toko"}
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
                placeholder="manager@store.com" 
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
            <Button type="submit" className="w-full" disabled={loading}>
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
                className="text-blue-600 hover:underline"
              >
                {isRegistering ? "Masuk di sini" : "Daftar di sini"}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
