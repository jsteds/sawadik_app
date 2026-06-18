"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import {
  getCleaningTasks,
  createCleaningTask,
  uploadCleaningPhoto,
  takeoverCleaningTask,
  deleteCleaningTask,
  getTeamMembers,
} from "@/lib/supabase";
import type { GeneralCleaningTask, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Camera, CheckCircle2, Loader2, Plus, Trash2, UserPlus } from "lucide-react";

export default function GeneralCleaningPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<GeneralCleaningTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating task
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskArea, setNewTaskArea] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [createLoading, setCreateLoading] = useState(false);

  // States for uploading
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<GeneralCleaningTask | null>(null);

  const fileInputRefs = {
    before: useRef<HTMLInputElement>(null),
    progress: useRef<HTMLInputElement>(null),
    after: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    const [t, m] = await Promise.all([
      getCleaningTasks(),
      getTeamMembers()
    ]);
    setTasks(t);
    setTeamMembers(m);
    setLoading(false);
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.store_id) return;
    setCreateLoading(true);
    
    const { error } = await createCleaningTask({
      area_equipment: newTaskArea,
      assigned_to: newTaskAssignee || null,
      store_id: profile.store_id,
      date: newTaskDate,
    });

    if (!error) {
      setShowCreateModal(false);
      setNewTaskArea("");
      setNewTaskAssignee("");
      await loadData();
    } else {
      alert("Gagal membuat tugas: " + error);
    }
    setCreateLoading(false);
  }

  async function handleTakeover(taskId: string) {
    if (!profile) return;
    if (!confirm("Apakah Anda yakin ingin mengambil alih tugas ini?")) return;
    
    const { error } = await takeoverCleaningTask(taskId, profile.id);
    if (!error) {
      await loadData();
    } else {
      alert("Gagal mengambil alih tugas: " + error);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Hapus tugas ini secara permanen?")) return;
    const { error } = await deleteCleaningTask(taskId);
    if (!error) await loadData();
  }

  async function handleUploadPhoto(task: GeneralCleaningTask, stage: "before" | "progress" | "after", file: File) {
    setUploadingTask(task.id);
    setUploadingStage(stage);
    
    const { error } = await uploadCleaningPhoto(task.id, stage, file);
    if (error) {
      alert("Gagal upload foto: " + error);
    } else {
      // Reload specific task list or full data
      await loadData();
    }
    
    setUploadingTask(null);
    setUploadingStage(null);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const isManager = profile?.role === "manager" || profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">General Cleaning (GC)</h2>
          <p className="text-sm text-slate-500">Kelola dan pantau tugas pembersihan area/equipment toko.</p>
        </div>
        
        {isManager && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger render={
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Buat Tugas GC
              </Button>
            } />
            <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">Tugas Cleaning Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Area / Equipment</Label>
                  <Input 
                    required 
                    placeholder="Contoh: Mesin Espresso / Kaca Depan"
                    value={newTaskArea}
                    onChange={(e) => setNewTaskArea(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tugaskan Kepada (Opsional)</Label>
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                  >
                    <option value="">-- Bebas (Siapa saja) --</option>
                    <option value={profile?.id}>Saya Sendiri ({profile?.full_name})</option>
                    {teamMembers.filter(m => m.id !== profile?.id).map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.position || m.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Target</Label>
                  <Input 
                    type="date" 
                    required 
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={createLoading}>
                  {createLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan Tugas
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Belum ada jadwal General Cleaning.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const isMyTask = task.assigned_to === profile?.id;
            const isUnassigned = !task.assigned_to;
            const canManage = isManager || isMyTask;
            const isCompleted = task.status === "completed" || task.status === "verified";

            return (
              <Card key={task.id} className={`relative overflow-hidden ${isCompleted ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg leading-tight flex items-start gap-2 text-slate-800 dark:text-slate-100">
                      <Sparkles className={`w-5 h-5 shrink-0 ${isCompleted ? 'text-emerald-500' : 'text-blue-500'}`} /> 
                      {task.area_equipment}
                    </CardTitle>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {isManager && (
                        <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5 relative z-10">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        {task.assignee?.full_name ?? (
                          <span className="italic text-slate-500 dark:text-slate-400">Belum di-assign</span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                      {new Date(task.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Photo Previews if any */}
                  {(task.before_photo_url || task.progress_photo_url || task.after_photo_url) && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {/* Before */}
                      <div className="aspect-square bg-slate-100 dark:bg-zinc-800 rounded-md overflow-hidden relative group">
                        {task.before_photo_url ? (
                          <Image src={task.before_photo_url} alt="Before" fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">No Before</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">Before</div>
                      </div>
                      
                      {/* Progress */}
                      <div className="aspect-square bg-slate-100 dark:bg-zinc-800 rounded-md overflow-hidden relative group">
                        {task.progress_photo_url ? (
                          <Image src={task.progress_photo_url} alt="Progress" fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">No Progress</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">Progress</div>
                      </div>

                      {/* After */}
                      <div className="aspect-square bg-slate-100 dark:bg-zinc-800 rounded-md overflow-hidden relative group">
                        {task.after_photo_url ? (
                          <Image src={task.after_photo_url} alt="After" fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">No After</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">After</div>
                      </div>
                    </div>
                  )}

                  {!isCompleted && (
                    <div className="pt-2">
                      {isMyTask ? (
                        <Dialog>
                          <DialogTrigger render={
                            <Button 
                              variant="outline" 
                              className="w-full flex items-center gap-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                              onClick={() => setSelectedTaskForUpload(task)}
                            >
                              <Camera className="w-4 h-4" /> 
                              Upload Bukti Foto
                            </Button>
                          } />
                          <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Upload Bukti: {selectedTaskForUpload?.area_equipment}</DialogTitle>
                            </DialogHeader>
                            {selectedTaskForUpload && (
                              <div className="space-y-6 py-4">
                                <div className="grid grid-cols-3 gap-4">
                                  {(["before", "progress", "after"] as const).map((stage) => {
                                    const stageUrl = selectedTaskForUpload[`${stage}_photo_url` as keyof GeneralCleaningTask];
                                    const isUploading = uploadingTask === selectedTaskForUpload.id && uploadingStage === stage;
                                    
                                    return (
                                      <div key={stage} className="space-y-2 text-center relative">
                                        <Label className="capitalize">{stage}</Label>
                                        <div 
                                          onClick={() => !isUploading && fileInputRefs[stage].current?.click()}
                                          className={`aspect-square relative rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden
                                            ${stageUrl ? 'border-emerald-500/50' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
                                          `}
                                        >
                                          {isUploading ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                          ) : stageUrl ? (
                                            <Image src={stageUrl as string} alt={stage} fill className="object-cover" />
                                          ) : (
                                            <>
                                              <Camera className="w-6 h-6 mb-1 text-zinc-400" />
                                              <span className="text-[10px] text-zinc-500 font-medium px-1">Pilih Foto</span>
                                            </>
                                          )}
                                        </div>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          ref={fileInputRefs[stage]}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadPhoto(selectedTaskForUpload, stage, file);
                                            // reset input
                                            e.target.value = '';
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-center text-slate-500">
                                  Tugas akan otomatis diselesaikan setelah Anda mengupload foto "After".
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button 
                          onClick={() => handleTakeover(task.id)}
                          variant="ghost" 
                          className="w-full flex items-center gap-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          <UserPlus className="w-4 h-4" />
                          Ambil Alih Tugas Ini
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
