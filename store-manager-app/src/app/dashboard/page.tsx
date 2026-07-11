"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Users, FileText, CheckCircle, ChevronDown, ChevronUp, Clock, CalendarDays } from "lucide-react";
import AreaOverviewDashboard from "@/components/dashboard/AreaOverviewDashboard";

export default function DashboardPage() {
  const { profile, isSuperAdmin, isAreaManager, activeStoreId } = useAuth();

  if (isAreaManager) {
    return <AreaOverviewDashboard />;
  }

  const effectiveStoreId = isSuperAdmin ? activeStoreId : profile?.store_id;
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

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<string>("status");
  const [greeting, setGreeting] = useState<string>("Selamat datang");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setGreeting("Selamat pagi");
    else if (hour >= 11 && hour < 15) setGreeting("Selamat siang");
    else if (hour >= 15 && hour < 18.5) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
  }, []);

  useEffect(() => {
    if (!effectiveStoreId && !isSuperAdmin) return;
    if (isSuperAdmin && !activeStoreId) return; // Wait for activeStoreId

    const fetchDashboardData = async () => {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];

      // Fetch Profiles
      let profilesQuery = supabase
        .from("profiles")
        .select("id, status");
      
      if (effectiveStoreId) {
        profilesQuery = profilesQuery.eq("store_id", effectiveStoreId);
      }
      const { data: profiles } = await profilesQuery;

      const totalKaryawan = profiles?.length || 0;
      const inChargeHariIni = profiles?.filter(p => p.status === "aktif").length || 0;

      // Fetch General Cleaning Tasks
      let gcQuery = supabase
        .from("general_cleaning")
        .select("*, assignee:profiles(full_name)")
        .eq("date", today);
      if (effectiveStoreId) {
        gcQuery = gcQuery.eq("store_id", effectiveStoreId);
      }
      const { data: generalCleaningTasks } = await gcQuery;

      // Fetch Daily Cleaning Tasks
      let dcQuery = supabase
        .from("daily_cleaning")
        .select("*, assignee:profiles(full_name)")
        .eq("date", today);
      if (effectiveStoreId) {
        dcQuery = dcQuery.eq("store_id", effectiveStoreId);
      }
      const { data: dailyCleaningTasks } = await dcQuery;

      const allCleaningTasks = [...(generalCleaningTasks || []), ...(dailyCleaningTasks || [])];

      const tugasTotal = allCleaningTasks.length;
      const tugasSelesai = allCleaningTasks.filter(t => t.status === "completed" || t.status === "verified").length;
      
      const recentActivity = allCleaningTasks
        .filter(t => t.status === "completed" || t.status === "verified")
        .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
        .slice(0, 4); 

      // Fetch Documents
      let docsQuery = supabase
        .from("documents")
        .select("created_at");
      if (effectiveStoreId) {
        docsQuery = docsQuery.eq("store_id", effectiveStoreId);
      }
      const { data: documents } = await docsQuery;

      const dokumenTotal = documents?.length || 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dokumenBaru = documents?.filter(d => new Date(d.created_at) > sevenDaysAgo).length || 0;

      // Fetch Pending Cleaning Tasks
      const pendingCleaning = allCleaningTasks
        .filter(t => t.status === "pending" || t.status === "in_progress")
        .sort((a, b) => {
          if (a.assignee_id === profile?.id && b.assignee_id !== profile?.id) return -1;
          if (b.assignee_id === profile?.id && a.assignee_id !== profile?.id) return 1;
          return new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime();
        })
        .slice(0, 6);

      setStats({
        totalKaryawan,
        inChargeHariIni,
        tugasSelesai,
        tugasTotal,
        dokumenTotal,
        dokumenBaru,
      });
      
      setAktivitasTerbaru(recentActivity);
      setTugasTertunda(pendingCleaning);
      setLoading(false);
    };

    fetchDashboardData();
  }, [effectiveStoreId, isSuperAdmin, profile]);

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

  // Circle properties
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (penyelesaianCleaning / 100) * circumference;

  return (
    <div className="min-h-full bg-[#E5E9F0] p-4 sm:p-8 rounded-[2rem] font-sans -m-4 sm:-m-8">
      
      {/* Header Area */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 gap-6 pt-4 px-2">
        <div>
          <h1 className="text-4xl font-normal text-[#1E293B]">
            {greeting}, <span className="font-semibold">{profile?.full_name?.split(" ")[0] || "User"}</span>!
          </h1>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Tugas Selesai</span>
              <div className="bg-[#1E3A8A] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                {stats.tugasSelesai} / {stats.tugasTotal}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Penyelesaian</span>
              <div className="bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                {penyelesaianCleaning}%
              </div>
            </div>
          </div>
        </div>

        {/* Top Right Metrics */}
        <div className="flex gap-8 px-2">
          <div className="flex flex-col items-center">
            <div className="flex items-center text-slate-400 gap-1 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-4xl font-light text-[#1E293B]">{stats.totalKaryawan}</span>
            </div>
            <span className="text-xs text-slate-500">Karyawan</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-slate-400 gap-1 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-4xl font-light text-[#1E293B]">{stats.inChargeHariIni}</span>
            </div>
            <span className="text-xs text-slate-500">In-Charge</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-slate-400 gap-1 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-4xl font-light text-[#1E293B]">{stats.dokumenTotal}</span>
            </div>
            <span className="text-xs text-slate-500">SOP & Dokumen</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Profile */}
         <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="bg-gradient-to-b from-[#8BA9D0] to-[#507EAD] rounded-[2rem] p-6 text-white shadow-md relative overflow-hidden flex flex-col items-center justify-center min-h-[250px]">
             {/* Profile Avatar */}
             <div className="w-32 h-32 rounded-full mb-4 border-2 border-white/30 shadow-lg overflow-hidden bg-white/20 flex items-center justify-center">
                <img 
                  src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || "?")}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
             </div>
             <h2 className="text-2xl font-medium text-center leading-tight">{profile?.full_name}</h2>
             <p className="text-white/80 text-sm font-light mt-1 tracking-wide">{profile?.role?.toUpperCase()}</p>
             
             <div className="mt-4 bg-white/20 rounded-full px-4 py-1.5 backdrop-blur-sm text-xs font-medium border border-white/10">
               NIK: {profile?.nik || "-"}
             </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-2 shadow-sm space-y-1 border border-white/50">
            <AccordionItem 
              title="Status Cleaning" 
              expanded={expandedSection === "status"} 
              onClick={() => setExpandedSection(expandedSection === "status" ? "" : "status")}
            >
              <div className="p-3 pt-0 text-sm text-slate-600">
                {stats.tugasTotal === 0 ? "Belum ada tugas hari ini" : `${penyelesaianCleaning}% area telah dibersihkan hari ini.`}
              </div>
            </AccordionItem>
            <AccordionItem 
              title="Ringkasan Dokumen" 
              expanded={expandedSection === "docs"} 
              onClick={() => setExpandedSection(expandedSection === "docs" ? "" : "docs")}
            >
              <div className="p-3 pt-0 text-sm text-slate-600">
                Terdapat <span className="font-semibold text-blue-600">{stats.dokumenBaru}</span> dokumen baru dalam 7 hari terakhir.
              </div>
            </AccordionItem>
          </div>
        </div>

        {/* Center & Right Column Wrapper */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Center Widgets: Progress & Tracker */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Progress Bar Widget */}
               <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm flex flex-col border border-white/50">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-700">Progress</h3>
                      <p className="text-xs text-slate-400 font-medium">Penyelesaian minggu ini</p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                      ↗
                    </div>
                 </div>
                 
                 {/* Fake Bar Chart */}
                 <div className="mt-auto flex items-end justify-between h-32 px-2 gap-2">
                    {[40, 70, 40, 100, 80, 20, 10].map((h, i) => {
                      const isToday = i === new Date().getDay(); // Map to current weekday dynamically
                      return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1">
                         <div className="w-full flex justify-center h-full items-end relative group">
                            {isToday && (
                              <div className="absolute -top-8 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap shadow-md">
                                {penyelesaianCleaning}%
                              </div>
                            )}
                            <div 
                              className={`w-3 rounded-full transition-all duration-500 ${isToday ? "bg-blue-500" : "bg-slate-200"}`} 
                              style={{ height: `${isToday ? Math.max(10, penyelesaianCleaning) : h}%` }}
                            />
                            {/* Dot indicator */}
                            <div className={`w-1.5 h-1.5 rounded-full absolute -bottom-3 ${isToday ? "bg-blue-500" : "bg-slate-300"}`} />
                         </div>
                         <span className={`text-[10px] font-medium mt-4 ${isToday ? "text-blue-600" : "text-slate-400"}`}>
                           {['M', 'S', 'S', 'R', 'K', 'J', 'S'][i]}
                         </span>
                      </div>
                    )})}
                 </div>
               </div>

               {/* Circular Time Tracker Widget */}
               <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm flex flex-col items-center justify-center relative border border-white/50">
                  <div className="absolute top-6 right-6 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                    ↗
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 w-full text-left absolute top-6 left-6">Penyelesaian</h3>
                  
                  <div className="relative mt-8">
                     <svg className="w-40 h-40 transform -rotate-90">
                       <circle
                         cx="80"
                         cy="80"
                         r={radius}
                         stroke="currentColor"
                         strokeWidth="8"
                         fill="transparent"
                         className="text-slate-100"
                       />
                       <circle
                         cx="80"
                         cy="80"
                         r={radius}
                         stroke="currentColor"
                         strokeWidth="8"
                         fill="transparent"
                         strokeDasharray={circumference}
                         strokeDashoffset={strokeDashoffset}
                         className="text-blue-500 transition-all duration-1000 ease-in-out"
                         strokeLinecap="round"
                       />
                       {/* Decorative dashes */}
                       <circle
                         cx="80"
                         cy="80"
                         r="60"
                         stroke="currentColor"
                         strokeWidth="1"
                         fill="transparent"
                         strokeDasharray="2 6"
                         className="text-slate-300"
                       />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-light text-slate-800">{penyelesaianCleaning}%</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">Selesai</span>
                     </div>
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                     <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
                       <Clock className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>

            {/* Right Widget: Dark Navy Pending Tasks */}
            <div className="lg:col-span-1 bg-[#1E3A8A] rounded-[2rem] p-6 text-white shadow-xl flex flex-col relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
               <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/10 rounded-full -ml-10 -mb-10 blur-2xl" />
               
               <div className="flex justify-between items-end mb-6 relative z-10">
                 <h3 className="text-xl font-light leading-snug">Tugas<br/>Tertunda</h3>
                 <span className="text-4xl font-light text-blue-200">{tugasTertunda.length}</span>
               </div>

               <div className="flex-1 overflow-y-auto space-y-4 relative z-10 mt-2 custom-scrollbar pr-2">
                 {tugasTertunda.length === 0 ? (
                   <p className="text-sm text-blue-200/70 text-center mt-10">Semua tugas selesai!</p>
                 ) : (
                   tugasTertunda.map((tugas, i) => (
                     <div key={i} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                           <Clock className="w-4 h-4 text-blue-200" />
                         </div>
                         <div className="min-w-0">
                           <p className="text-sm font-medium text-white truncate max-w-[120px]">{tugas.area_equipment || tugas.title}</p>
                           <p className={`text-[10px] truncate font-medium ${tugas.assignee_id === profile?.id ? "text-green-300 font-bold" : "text-blue-200/80"}`}>
                             {tugas.assignee?.full_name ? (tugas.assignee_id === profile?.id ? `Untuk Anda` : `Oleh ${tugas.assignee.full_name}`) : "Belum ditugaskan"}
                           </p>
                         </div>
                       </div>
                       <div className="w-5 h-5 rounded border border-blue-400/40 flex items-center justify-center bg-white/5">
                         {/* Empty checkbox */}
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>

          </div>

          {/* Bottom Timeline */}
          <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm overflow-x-auto border border-white/50">
             <div className="flex items-center justify-between mb-8 min-w-[600px]">
                <h3 className="text-lg font-medium text-slate-700">Aktivitas Terbaru</h3>
                <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-1.5 border border-slate-200/50">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600 tracking-wide uppercase">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                </div>
             </div>

             <div className="relative min-w-[600px] pb-4 pt-2">
                {/* Timeline line */}
                <div className="absolute top-[30px] left-0 w-full h-px bg-slate-200 border-t border-dashed border-slate-300" />
                
                <div className="flex justify-between items-start">
                   {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((time, idx) => {
                     // Very rough mapping of activities to time slots for visual effect
                     const act = aktivitasTerbaru[idx % aktivitasTerbaru.length];
                     const showAct = act && idx % 2 === 1 && aktivitasTerbaru.length > 0;

                     return (
                       <div key={time} className="flex flex-col items-center relative z-10" style={{ width: '14%' }}>
                          <span className="text-[10px] text-slate-400 mb-2 font-medium tracking-wide">{time}</span>
                          <div className="w-3 h-3 rounded-full bg-slate-200 border-[3px] border-white shadow-sm mb-4" />
                          
                          {showAct && (
                            <div className="bg-[#1E3A8A] text-white rounded-[1rem] p-3 w-40 text-left shadow-lg transform translate-x-4">
                               <p className="text-xs font-semibold truncate leading-tight">{act.area_equipment || act.title}</p>
                               <p className="text-[10px] text-blue-200/80 mt-1 truncate">Oleh {act.assignee?.full_name}</p>
                            </div>
                          )}
                       </div>
                     )
                   })}
                </div>
                {aktivitasTerbaru.length === 0 && (
                  <p className="text-sm text-slate-400 text-center mt-8 italic">Belum ada aktivitas hari ini.</p>
                )}
             </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}

// Helper component for Left Sidebar Accordions
function AccordionItem({ title, expanded, onClick, children }: { title: string, expanded: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
      >
        {title}
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
