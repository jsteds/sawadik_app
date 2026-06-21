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
} from "@/lib/supabase";
import type { DailyCleaningTask } from "@/lib/types";
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
  Clock,
  ListTodo
} from "lucide-react";

export default function DailyCleaningPage() {
  const { profile } = useAuth();
  const isManager = profile?.role === "manager" || profile?.role === "admin";

  const [tasks, setTasks] = useState<DailyCleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createShift, setCreateShift] = useState<string>("Opening");
  const [taskNames, setTaskNames] = useState<string[]>([""]);
  const [createLoading, setCreateLoading] = useState(false);

  // Photo Modal
  const [uploadTask, setUploadTask] = useState<DailyCleaningTask | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.store_id) return;
    setLoading(true);
    const data = await getDailyCleaningTasks(selectedDate);
    setTasks(data as DailyCleaningTask[]);
    setLoading(false);
  }, [profile?.store_id, selectedDate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Task Completion ───
  async function toggleTask(task: DailyCleaningTask) {
    if (!profile) return;

    if (task.status === "completed") {
      // Uncheck
      const { error } = await uncompleteDailyCleaningTask(task.id);
      if (!error) await loadData();
    } else {
      // Check (tanpa foto)
      const { error } = await completeDailyCleaningTask(task.id, profile.id, null);
      if (!error) await loadData();
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

    const validNames = taskNames.filter(n => n.trim() !== "");
    if (!validNames.length) return;

    setCreateLoading(true);
    const rows = validNames.map(name => ({
      store_id: profile.store_id!,
      date: selectedDate,
      shift: createShift,
      task_name: name.trim()
    }));

    const { error } = await bulkCreateDailyCleaningTasks(rows);
    if (!error) {
      setShowCreateModal(false);
      setTaskNames([""]);
      await loadData();
    } else {
      alert("Gagal membuat tugas: " + error);
    }
    setCreateLoading(false);
  }

  // Grouping tasks by shift
  const tasksByShift = SHIFT_OPTIONS.reduce((acc, shift) => {
    acc[shift] = tasks.filter(t => t.shift === shift);
    return acc;
  }, {} as Record<string, DailyCleaningTask[]>);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Daily Cleaning
          </h2>
          <p className="text-sm text-slate-500">
            Checklist pembersihan harian berdasarkan shift.
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
                    <span className="hidden sm:inline">Tambah Checklist</span>
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Buat Checklist Harian</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTasks} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Shift</Label>
                    <Select value={createShift} onValueChange={(val) => val && setCreateShift(val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Daftar Tugas</Label>
                    {taskNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Misal: Sapu lantai area kasir"
                          value={name}
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
                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Checklist"}
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
          <p className="text-slate-500 mt-1 text-sm">Tidak ada checklist untuk tanggal ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {SHIFT_OPTIONS.map((shift) => {
            const shiftTasks = tasksByShift[shift];
            if (!shiftTasks?.length) return null;

            const completedCount = shiftTasks.filter(t => t.status === "completed").length;
            const progress = Math.round((completedCount / shiftTasks.length) * 100);

            return (
              <Card key={shift} className="shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" /> {shift}
                    </CardTitle>
                    <span className="text-sm font-medium text-slate-500">
                      {completedCount}/{shiftTasks.length}
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
                    {shiftTasks.map((task) => (
                      <li key={task.id} className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 group items-start">
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          onChange={() => toggleTask(task)}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
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
                              {task.completer.full_name?.split(' ')[0]}
                              <span className="opacity-50">
                                • {new Date(task.completed_at!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
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
          Menyertakan foto bersifat opsional. Foto akan membuktikan bahwa <strong>{task.task_name}</strong> telah selesai dengan baik.
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
