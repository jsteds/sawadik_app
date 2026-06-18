"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Download, Eye, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const { profile } = useAuth();
  const canUpload = profile?.role === "manager" || profile?.role === "admin";
  
  // Dummy data for documents
  const docs = [
    { id: "1", title: "SOP Buka Toko (Opening)", category: "SOP", date: "2023-10-01", size: "2.4 MB" },
    { id: "2", title: "SOP Tutup Toko (Closing)", category: "SOP", date: "2023-10-02", size: "1.8 MB" },
    { id: "3", title: "Work Instruction: Mesin Kasir", category: "WI", date: "2023-11-15", size: "3.1 MB" },
    { id: "4", title: "Kebijakan Cuti Karyawan", category: "Policy", date: "2024-01-10", size: "1.2 MB" },
  ];

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    doc.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Dokumen (SOP & WI)</h2>
        
        {canUpload && (
          <Button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
            <UploadCloud className="w-4 h-4" /> Upload Dokumen
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama dokumen atau kategori..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Dokumen</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tanggal Upload</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      {doc.category}
                    </span>
                  </TableCell>
                  <TableCell>{doc.date}</TableCell>
                  <TableCell>{doc.size}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Lihat">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Download">
                        <Download className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tidak ada dokumen yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
