# Product Requirements Document (PRD): Store Management App

## 1. Overview
Sebuah aplikasi web untuk mengelola operasional toko, mencakup manajemen tim, penyimpanan dokumen operasional (SOP/WI), penugasan, dan pemantauan kebersihan (General Cleaning).

## 2. Tujuan
Meningkatkan efisiensi operasional toko dan visibilitas kinerja tim dengan sistem yang terpusat, gratis untuk di-hosting, dan *user-friendly*.

## 3. Fitur Utama

### 3.1 Manajemen Tim & Hierarki
- **Daftar Anggota Tim**: Menambah, mengedit, dan menghapus data karyawan.
- **Hierarki Tim**: Menampilkan struktur organisasi (misal: Store Manager -> Supervisor -> Staff).
- **Manajemen Role**: Akses berbasis role (Admin/Manager memiliki akses penuh, Staff hanya dapat melihat tugasnya/mengerjakan tugas).

### 3.2 Manajemen Dokumen (SOP & WI)
- **Repositori File**: Upload, download, dan melihat file/dokumen (PDF, gambar, dll).
- **Kategorisasi**: Kategori khusus untuk SOP, Work Instructions (WI), dan aturan toko.

### 3.3 Penugasan (Task Management)
- **Assign Tugas**: Membuat tugas dengan deskripsi, tenggat waktu (deadline), dan menugaskan ke anggota tim tertentu.
- **Status Tugas**: Melacak progress (To-Do, In Progress, Done).

### 3.4 General Cleaning (GC) & Dashboard
- **Penugasan GC**: Menugaskan area atau peralatan (equipment) tertentu untuk dibersihkan kepada tim/karyawan.
- **Upload Bukti**: Fitur upload foto kondisi *Before*, *Progress*, dan *After*.
- **Dashboard GC**: Menampilkan ringkasan status kebersihan harian/mingguan dan foto-foto bukti.

## 4. Teknologi & Arsitektur (Usulan)
Mengingat aplikasi ini membutuhkan fitur upload gambar/file dan relasi data kompleks:
- **Frontend**: Next.js (React) + Tailwind CSS + komponen UI modern (fokus pada estetika dan kemudahan).
- **Backend & Storage**: Supabase (Database PostgreSQL, Authentication, dan Bucket Storage untuk file/foto). Tersedia versi gratis yang sangat mumpuni.
- **Hosting**: Vercel (Platform gratis yang sangat optimal untuk Next.js).
