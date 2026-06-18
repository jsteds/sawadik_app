# Panduan Aplikasi Store Manager

Proyek aplikasi Store Manager berbasis web telah berhasil disiapkan menggunakan *stack* teknologi modern (**Next.js**, **Tailwind CSS**, **Shadcn UI**, dan **Supabase**). Berikut adalah ringkasan hasil kerja dan panduan penggunaannya.

## 1. Fitur yang Telah Diimplementasikan

- **Sistem Autentikasi**:
  - Halaman Login modern (`/login`).
  - *Utility* Supabase untuk memproses *sign-in* (`src/lib/supabase.ts`).
- **Dashboard & Layout**:
  - Sidebar navigasi yang responsif dengan ikon modern.
  - Ringkasan KPI Toko (Karyawan In-charge, Tugas Selesai, Status Cleaning, dan jumlah Dokumen).
- **Manajemen Tim (`/dashboard/team`)**:
  - Tabel daftar anggota tim (Nama, Email, Role, Status).
  - *Dialog* form untuk menambahkan anggota baru dengan *dropdown* pilihan posisi.
- **Manajemen Dokumen (`/dashboard/documents`)**:
  - Daftar SOP & Work Instructions.
  - Tombol untuk Upload dan Download Dokumen.
- **Penugasan / Kanban Board (`/dashboard/tasks`)**:
  - Tampilan *Kanban* (To Do, In Progress, Selesai) untuk memudahkan pelacakan tugas.
  - *Dialog* pembuatan tugas baru dengan assign ke anggota spesifik dan penentuan tenggat waktu.
- **General Cleaning (`/dashboard/cleaning`)**:
  - Manajemen area/equipment untuk dibersihkan.
  - Fitur unggah foto (*Before*, *Progress*, *After*) yang langsung dapat diakses lewat *Dialog box*.

## 2. Struktur Database (Supabase)
Terdapat file `supabase_schema.sql` di *root* proyek.

**Langkah Selanjutnya untuk Database:**
1. Buat proyek gratis di [Supabase](https://supabase.com/).
2. Buka menu **SQL Editor**, *copy-paste* seluruh isi file `supabase_schema.sql` dan jalankan (*Run*).
3. Ambil URL dan Anon Key dari menu **Project Settings > API**, lalu buat file `.env.local` di folder `store-manager-app` dengan isi:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   ```

## 3. Cara Menjalankan Aplikasi Lokal

Untuk melihat hasil aplikasi yang sudah dibuat di komputer Anda secara lokal:

1. Buka Terminal dan navigasi ke folder proyek:
   ```bash
   cd "C:\Users\Eds\Documents\BELUM ADA NAMA\store-manager-app"
   ```
2. Instal *dependencies* (jika belum komplit):
   ```bash
   npm install
   ```
3. Jalankan *development server*:
   ```bash
   npm run dev
   ```
4. Buka browser dan akses **http://localhost:3000** (Otomatis akan di-redirect ke halaman Login).

## 4. Cara Deploy Gratis ke Vercel

Aplikasi Next.js paling optimal jika di-deploy ke Vercel. 

1. *Push* kode ini ke repositori **GitHub** Anda.
2. Login ke [Vercel](https://vercel.com/) dan pilih **Add New Project**.
3. Impor repo GitHub tersebut.
4. Jangan lupa tambahkan *Environment Variables* (`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`) di menu Settings Vercel sebelum menekan **Deploy**.

Seluruh desain UI menggunakan prinsip *vibrant*, *clean*, dan profesional sehingga karyawan toko mudah memahami navigasinya.
