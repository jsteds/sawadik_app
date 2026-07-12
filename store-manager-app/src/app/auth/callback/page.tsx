"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push("/dashboard");
      }
    });

    // Fallback: check session explicitly if the event doesn't fire (e.g. already signed in)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Auth callback error:", error.message);
        router.push("/login?error=" + encodeURIComponent(error.message));
        return;
      }
      if (session) {
        router.push("/dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 text-slate-800 dark:text-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
      <h1 className="text-xl font-semibold">Memproses Autentikasi...</h1>
      <p className="text-sm text-slate-500 mt-2">Harap tunggu sebentar, Anda akan dialihkan.</p>
    </div>
  );
}
