"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, FileText, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { profile } = useAuth();
  
  const [stats, setStats] = useState({
    totalKaryawan: 0,
    inChargeHariIni: 0,
    tugasSelesai: 0,
    tugasTotal: 0,
    dokumenTotal: 0,
    dokumenBaru: 0,
  });
  
  const [aktivitasTerbaru, setAktivitasTerbaru] = useState<any[]>([]);
  const [tugasTertunda, setTugasTertunda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.store_id) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];

      // Fetch Profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("store_id", profile.store_id);

      const totalKaryawan = profiles?.length || 0;
      const inChargeHariIni = profiles?.filter(p => p.status === "aktif").length || 0;

      // Fetch Cleaning Tasks
      const { data: cleaningTasks } = await supabase
        .from("general_cleaning")
        .select("*, assignee:profiles(full_name)")
        .eq("store_id", profile.store_id)
        .eq("date", today);

      const tugasTotal = cleaningTasks?.length || 0;
      const tugasSelesai = cleaningTasks?.filter(t => t.status === "completed" || t.status === "verified").length || 0;
      
      const recentActivity = cleaningTasks
        ?.filter(t => t.status === "completed" || t.status === "verified")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3) || [];

      // Fetch Documents
      const { data: documents } = await supabase
        .from("documents")
        .select("created_at")
        .eq("store_id", profile.store_id);

      const dokumenTotal = documents?.length || 0;
      // Dokumen dalam 7 hari terakhir
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dokumenBaru = documents?.filter(d => new Date(d.created_at) > sevenDaysAgo).length || 0;

      // Fetch Pending Tasks (from 'tasks' table if exists)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("store_id", profile.store_id)
        .neq("status", "done")
        .order("deadline", { ascending: true })
        .limit(3);

      setStats({
        totalKaryawan,
        inChargeHariIni,
        tugasSelesai,
        tugasTotal,
        dokumenTotal,
        dokumenBaru,
      });
      
      setAktivitasTerbaru(recentActivity);
      setTugasTertunda(tasks || []);
      setLoading(false);
    };

    fetchDashboardData();
  }, [profile?.store_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const penyelesaianCleaning = stats.tugasTotal > 0 
    ? Math.round((stats.tugasSelesai / stats.tugasTotal) * 100) 
    : 0;

  let statusCleaning = "Belum Mulai";
  let statusCleaningDesc = "Belum ada tugas hari ini";
  if (stats.tugasTotal > 0) {
    if (penyelesaianCleaning === 100) {
      statusCleaning = "Aman";
      statusCleaningDesc = "Semua area sudah dibersihkan";
    } else if (penyelesaianCleaning > 0) {
      statusCleaning = "Sedang Berjalan";
      statusCleaningDesc = `${penyelesaianCleaning}% selesai`;
    } else {
      statusCleaning = "Butuh Perhatian";
      statusCleaningDesc = "Belum ada area yang dibersihkan";
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Karyawan</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKaryawan}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.inChargeHariIni} In-charge hari ini</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cleaning Selesai</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tugasSelesai} / {stats.tugasTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">{penyelesaianCleaning}% penyelesaian harian</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SOP & Dokumen</CardTitle>
            <FileText className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dokumenTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.dokumenBaru} dokumen baru minggu ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Cleaning</CardTitle>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCleaning}</div>
            <p className="text-xs text-muted-foreground mt-1">{statusCleaningDesc}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Aktivitas Cleaning Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {aktivitasTerbaru.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Belum ada aktivitas hari ini</p>
            ) : (
              <div className="space-y-4">
                {aktivitasTerbaru.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 border-b last:border-0 pb-4 last:pb-0">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex flex-shrink-0 items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.assignee?.full_name || "Seseorang"} menyelesaikan {activity.area_equipment}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hari ini
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tugas Tertunda</CardTitle>
          </CardHeader>
          <CardContent>
            {tugasTertunda.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Tidak ada tugas tertunda!</p>
            ) : (
              <div className="space-y-4">
                {tugasTertunda.map((tugas) => (
                  <div key={tugas.id} className="flex items-center gap-4 border-b last:border-0 pb-4 last:pb-0">
                    <div className="w-10 h-10 rounded bg-amber-50 flex flex-shrink-0 items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tugas.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Tenggat: {tugas.deadline ? new Date(tugas.deadline).toLocaleDateString() : "Tanpa tenggat"}
                      </p>
                    </div>
                    {tugas.deadline && new Date(tugas.deadline) < new Date() && (
                      <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded">Terlambat</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
