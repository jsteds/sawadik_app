# Schedule Review

Web statis untuk membaca jadwal 19 store dari Google Sheets dan menampilkan:

- nama dan NIK karyawan,
- shift hari ini dan besok,
- daftar karyawan yang incharge hari ini,
- lama mulai incharge di store,
- tanggal kontrak berakhir.

## Arsitektur

Frontend berada di GitHub Pages (`index.html`, `styles.css`, `app.js`). Data dibaca lewat Google Apps Script (`apps-script/Code.js`) supaya spreadsheet tetap read-only dan ID spreadsheet tidak perlu dipakai langsung oleh frontend dengan Google API key. Frontend mencoba `fetch` lebih dulu dan otomatis fallback ke JSONP bila browser memblokir CORS.

## Setup Apps Script

1. Buka [script.google.com](https://script.google.com).
2. Buat project baru.
3. Salin isi `apps-script/Code.js`.
4. Ganti nilai berikut:
   - `scheduleSpreadsheetId`
   - `employeeSpreadsheetId`
   - `employees.sheetName`
   - nama kolom di `employees.columns` bila berbeda.
5. Deploy sebagai Web app.
6. Pilih akses sesuai kebutuhan. Untuk penggunaan pribadi, gunakan akun sendiri. Untuk GitHub Pages publik, Web app perlu bisa diakses oleh user yang membuka dashboard.
7. Salin URL `/exec` ke kolom API Apps Script di halaman web.

## Format Sheet Schedule

Parser awal mengikuti layout dari screenshot:

- row 2 berisi tanggal angka `1`, `2`, `3`, dst,
- row 3 berisi nama hari,
- row 4 ke bawah berisi data karyawan,
- kolom B = NIK,
- kolom C = nama lengkap,
- kolom D = posisi,
- kolom E dan seterusnya = shift per tanggal.

Jika layout berbeda, ubah bagian `CONFIG.schedule` di `apps-script/Code.js`.

## Format Sheet Karyawan

Default nama kolom:

- `store`
- `site`
- `ci`
- `nama`
- `nik`
- `jabatan`
- `periode-incharge`
- `status`

Nama kolom bisa disesuaikan di `CONFIG.employees.columns`.

## Format Sheet Shift Code

Default sheet roster bernama `shift_code` dengan header:

- `roster`
- `group`
- `time_in`
- `time_out`

Kode shift dari schedule, misalnya `M0025`, `A0014`, `F41`, akan dicocokkan ke sheet ini. Jika ditemukan, UI menampilkan format seperti `M0025 (08.00-15.40)`. Kode `SHOFF` tetap dianggap libur/off.

## Menjalankan Lokal

Karena ini web statis, file `index.html` bisa dibuka langsung di browser. Untuk test penuh, deploy dulu Apps Script sebagai Web app, lalu tempel URL `/exec` di kolom API Apps Script.
