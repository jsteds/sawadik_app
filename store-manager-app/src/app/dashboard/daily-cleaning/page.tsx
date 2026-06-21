"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import {
  getDailyCleaningTasks,
  bulkCreateDailyCleaningTasks,
  completeDailyCleaningTask,
  uncompleteDailyCleaningTask,
  deleteDailyCleaningTask,
  getTeamMembers,
} from "@/lib/supabase";
import type { DailyCleaningTask, Profile } from "@/lib/types";
import { SHIFT_OPTIONS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Camera,
  X,
  User,
  ListTodo,
  Clock
} from "lucide-react";

export default function DailyCleaningPage() {
  const { profile } = useAuth();
  const isManager = profile?.role === "manager" || profile?.role === "admin";

  const [tasks, setTasks] = useState<DailyCleaningTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createAssignee, setCreateAssignee] = useState<string>("");
  const [taskNames, setTaskNames] = useState<string[]>([""]);
  const [createLoading, setCreateLoading] = useState(false);

  // Photo Modal
  const [uploadTask, setUploadTask] = useState<DailyCleaningTask | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    const [data, members] = await Promise.all([
      getDailyCleaningTasks(selectedDate),
      getTeamMembers()
    ]);
    setTasks(data as DailyCleaningTask[]);
    setTeamMembers(members);
    setLoading(false);
  }, [profile?.store_id, selectedDate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Task Completion ───
  async function toggleTask(task: DailyCleaningTask) {
    if (!profile) return;
    
    // Validate if the current user is the assignee or manager
    if (task.assigned_to !== profile.id && !isManager) {
      alert("Hanya orang yang ditugaskan atau manager yang dapat mengubah status tugas ini.");
      return;
    }

    if (task.status === "completed") {
      // Uncheck
      const { error } = await uncompleteDailyCleaningTask(task.id);
      if (!error) await loadData();
    } else {
      // Harus menggunakan foto untuk menyelesaikan tugas
      setUploadTask(task);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Hapus tugas ini?")) return;
    const { error } = await deleteDailyCleaningTask(taskId);
    if (!error) await loadData();
  }

  async function handleCreateTasks(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.store_id) return;

    if (!createAssignee) {
      alert("Silakan pilih staf yang ditugaskan.");
      return;
    }

    const validNames = taskNames.filter(n => n.trim() !== "");
    if (!validNames.length) return;

    setCreateLoading(true);
    const rows = validNames.map(name => ({
      store_id: profile.store_id!,
      date: selectedDate,
      task_name: name.trim(),
      assigned_to: createAssignee
    }));

    const { error } = await bulkCreateDailyCleaningTasks(rows);
    if (!error) {
      setShowCreateModal(false);
      setTaskNames([""]);
      setCreateAssignee("");
      await loadData();
    } else {
      alert("Gagal membuat tugas: " + error);
    }
    setCreateLoading(false);
  }

  // Grouping tasks by Assignee
  const tasksByAssignee = tasks.reduce((acc, task) => {
    const key = task.assigned_to || "unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, DailyCleaningTask[]>);

  const assigneeIds = Object.keys(tasksByAssignee);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Penugasan Harian
          </h2>
          <p className="text-sm text-slate-500">
            Daftar tugas pembersihan per individu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto h-9"
          />

          {isManager && (
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger
                render={
                  <Button className="h-9 gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Tambah Tugas</span>
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tugaskan Pekerjaan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTasks} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Staf yang Ditugaskan *</Label>
                    <Select value={createAssignee} onValueChange={(val) => val && setCreateAssignee(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih anggota tim">
                          {teamMembers.find(m => m.id === createAssignee)?.full_name || "Pilih anggota tim"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.filter(m => m.status === 'aktif').map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Daftar Tugas *</Label>
                    {taskNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Misal: Sapu lantai area kasir"
                          value={name}
                          required
                          onChange={(e) => {
                            const newNames = [...taskNames];
                            newNames[idx] = e.target.value;
                            setTaskNames(newNames);
                          }}
                        />
                        {taskNames.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newNames = taskNames.filter((_, i) => i !== idx);
                              setTaskNames(newNames);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full mt-2 text-blue-600 hover:text-blue-700"
                      onClick={() => setTaskNames([...taskNames, ""])}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Tambah Baris
                    </Button>
                  </div>

                  <Button type="submit" className="w-full mt-4" disabled={createLoading}>
                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Berikan Tugas"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-dashed">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Belum ada tugas</h3>
          <p className="text-slate-500 mt-1 text-sm">Belum ada staf yang ditugaskan untuk tanggal ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assigneeIds.map((assigneeId) => {
            const assigneeTasks = tasksByAssignee[assigneeId];
            if (!assigneeTasks?.length) return null;

            const completedCount = assigneeTasks.filter(t => t.status === "completed").length;
            const progress = Math.round((completedCount / assigneeTasks.length) * 100);
            
            const firstTask = assigneeTasks[0];
            const assigneeName = firstTask?.assignee?.full_name || "Belum Ditugaskan";
            const storeName = firstTask?.store?.name;
            
            const isDifferentStore = storeName && profile?.stores && storeName !== profile.stores.name;
            const displayName = isDifferentStore ? `${assigneeName} (${storeName})` : assigneeName;

            const assigneeAvatar = firstTask?.assignee?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${assigneeName}`;

            return (
              <Card key={assigneeId} className="shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border bg-white">
                        <Image src={assigneeAvatar} alt={displayName} fill className="object-cover" unoptimized />
                      </div>
                      <CardTitle className="text-lg font-semibold">
                        {displayName}
                      </CardTitle>
                    </div>
                    <span className="text-sm font-medium text-slate-500">
                      {completedCount}/{assigneeTasks.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {assigneeTasks.map((task) => (
                      <li key={task.id} className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 group items-start">
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          onChange={() => toggleTask(task)}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                          disabled={!isManager && task.assigned_to !== profile?.id}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium transition-colors ${task.status === "completed"
                              ? "text-slate-400 line-through"
                              : "text-slate-700 dark:text-slate-200"
                            }`}>
                            {task.task_name}
                          </p>

                          {task.status === "completed" && task.completer && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Diselesaikan pada {new Date(task.completed_at!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-500 hover:bg-blue-50"
                            onClick={() => setUploadTask(task)}
                            title="Upload Foto Bukti"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </Button>
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Photo Upload Modal */}
      {uploadTask && (
        <PhotoUploadModal
          task={uploadTask}
          onClose={() => setUploadTask(null)}
          onDone={loadData}
        />
      )}
    </div>
  );
}

// ─── Photo Upload Modal (Opsional) ───
function PhotoUploadModal({
  task,
  onClose,
  onDone
}: {
  task: DailyCleaningTask;
  onClose: () => void;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    const { error } = await completeDailyCleaningTask(task.id, profile.id, file);
    setUploading(false);

    if (error) {
      alert("Gagal upload foto: " + error);
    } else {
      onDone();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 border rounded-2xl w-full max-w-sm shadow-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Foto Bukti Selesai</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Foto bukti <strong>wajib diunggah</strong> untuk menyelesaikan tugas <span className="font-semibold text-slate-800 dark:text-slate-200">{task.task_name}</span>.
        </p>

        {task.photo_url ? (
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border mb-4">
            <Image src={task.photo_url} alt="Bukti" fill className="object-cover" />
          </div>
        ) : null}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileRef}
          onChange={handleFileChange}
        />

        <Button
          className="w-full gap-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {task.photo_url ? "Ganti Foto" : "Ambil Foto Sekarang"}
        </Button>
      </div>
    </div>
  );
}
