import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, FileText, Sparkles } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Karyawan</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">4 In-charge hari ini</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tugas Selesai</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8 / 12</div>
            <p className="text-xs text-muted-foreground mt-1">66% penyelesaian harian</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SOP & Dokumen</CardTitle>
            <FileText className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground mt-1">2 SOP baru minggu ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Cleaning</CardTitle>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Aman</div>
            <p className="text-xs text-muted-foreground mt-1">Semua area sudah dibersihkan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b last:border-0 pb-4 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex flex-shrink-0 items-center justify-center">
                    <Sparkles className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Budi menyelesaikan General Cleaning</p>
                    <p className="text-xs text-muted-foreground">Area Kasir • 10 menit yang lalu</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tugas Tertunda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b last:border-0 pb-4 last:pb-0">
                  <div className="w-10 h-10 rounded bg-red-50 flex flex-shrink-0 items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cek Expired Date Produk</p>
                    <p className="text-xs text-muted-foreground">Tenggat: Hari ini 14:00</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded">High</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
