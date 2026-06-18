"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, CheckCircle2, Circle } from "lucide-react";

export default function TasksPage() {
  const [tasks] = useState([
    { id: "1", title: "Cek Stok Gudang", assignee: "Andi Saputra", status: "todo", deadline: "Hari ini, 14:00" },
    { id: "2", title: "Display Produk Baru", assignee: "Budi Santoso", status: "in_progress", deadline: "Hari ini, 16:00" },
    { id: "3", title: "Laporan Penjualan Mingguan", assignee: "Citra Lestari", status: "done", deadline: "Kemarin" },
  ]);

  const renderTaskCard = (task: any) => (
    <Card key={task.id} className="mb-3">
      <CardContent className="p-4 space-y-2">
        <h4 className="font-medium text-sm">{task.title}</h4>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{task.assignee}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.deadline}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Penugasan Tim</h2>
        <Dialog>
          <DialogTrigger render={<Button className="flex items-center gap-2"><Plus className="w-4 h-4" /> Buat Tugas</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tugas Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Judul Tugas</Label>
                <Input placeholder="Contoh: Cek expired date susu" />
              </div>
              <div className="space-y-2">
                <Label>Tugaskan Kepada</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Pilih Anggota Tim" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="andi">Andi Saputra</SelectItem>
                    <SelectItem value="budi">Budi Santoso</SelectItem>
                    <SelectItem value="citra">Citra Lestari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tenggat Waktu</Label>
                <Input type="datetime-local" />
              </div>
              <Button className="w-full mt-4">Simpan Tugas</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div className="bg-gray-100 dark:bg-zinc-900/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Circle className="w-4 h-4 text-gray-500" /> To Do
            </h3>
            <span className="bg-gray-200 dark:bg-zinc-800 text-xs px-2 py-1 rounded-full font-medium">
              {tasks.filter(t => t.status === 'todo').length}
            </span>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'todo').map(renderTaskCard)}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Clock className="w-4 h-4" /> In Progress
            </h3>
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs px-2 py-1 rounded-full font-medium">
              {tasks.filter(t => t.status === 'in_progress').length}
            </span>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'in_progress').map(renderTaskCard)}
          </div>
        </div>

        {/* Done Column */}
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" /> Selesai
            </h3>
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium">
              {tasks.filter(t => t.status === 'done').length}
            </span>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'done').map(renderTaskCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
