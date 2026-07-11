"use server";

import { Profile, Schedule, ShiftCode } from "@/lib/types";

/**
 * Konfigurasi Koneksi Google Sheets
 * Pastikan Anda menambahkan variabel berikut di file .env.local:
 * 
 * NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY="AIzaSyYourApiKeyHere..."
 * NEXT_PUBLIC_GOOGLE_SHEET_ID="1BxiMVs0XRYFgYourSheetIdHere..."
 */
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY || "";
const SCHEDULE_SHEET_ID = process.env.NEXT_PUBLIC_SCHEDULE_SHEET_ID || "14s3Y-LMUd1Gbd-XBJ07_boyRNeL5CPij_G8gyo15SoE";
const EMPLOYEE_SHEET_ID = process.env.NEXT_PUBLIC_EMPLOYEE_SHEET_ID || "1RqzmVe3V3PTgCrlvnyqwOwpTLsxRGQYSxOFmfjXrtzM";

// Nama Worksheet/Tab di dalam Google Sheets
const SHEET_NAME_EMPLOYEES = "data_karyawan!A2:H"; 
const SHEET_NAME_CODES = "shift_code!A2:D"; 

/**
 * Fungsi untuk menarik data dari Google Sheets API via REST.
 */
async function fetchSheetData(sheetId: string, range: string): Promise<string[][]> {
  if (!API_KEY || !sheetId) {
    console.warn("Google Sheets API Key atau Sheet ID belum dikonfigurasi.");
    return [];
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${API_KEY}`;
  
  try {
    // Menggunakan cache: 'no-store' agar data selalu fresh dan tidak menyimpan error 403 sebelumnya
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Gagal fetch Google Sheets: ${response.statusText}`);
    }
    const data = await response.json();
    return data.values || []; // Mengembalikan array 2D [Baris][Kolom]
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Mengambil daftar toko unik dari data karyawan di Google Sheets
 */
export async function getUniqueStoresFromSheet() {
  const empRows = await fetchSheetData(EMPLOYEE_SHEET_ID, SHEET_NAME_EMPLOYEES);
  const storeMap = new Map<string, { id: string; name: string; code: string }>();
  
  empRows.forEach((row) => {
    const storeName = row[0]?.trim();
    const storeCode = row[1]?.trim();
    
    if (storeName && storeCode && storeName.toLowerCase() !== "store") {
      if (!storeMap.has(storeCode)) {
        // Gunakan storeCode sebagai fallback ID sementara untuk Dropdown
        storeMap.set(storeCode, { id: storeCode, name: storeName, code: storeCode });
      }
    }
  });

  return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Mengambil dan memetakan master data jadwal dari Google Sheet
 * @param storeId - ID Toko (jika roster di sheet dicampur untuk semua toko)
 * @param startDate - Format "YYYY-MM-DD"
 * @param endDate - Format "YYYY-MM-DD"
 */
export async function getMasterScheduleFromSheet(storeId: string, storeCode: string | undefined | null, startDate: string, endDate: string) {
  if (!storeCode) {
    console.warn("Store Code tidak ditemukan di profil user.");
    return { profiles: [], schedules: [], shiftCodes: [] };
  }

  // 1. Ambil Data Karyawan
  const empRows = await fetchSheetData(EMPLOYEE_SHEET_ID, SHEET_NAME_EMPLOYEES);
  
  const profiles: Profile[] = [];
  const schedules: Schedule[] = [];

  /**
   * PANDUAN MAPPING KOLOM DATA KARYAWAN:
   * 0=store, 1=site (kode toko), 2=ci, 3=nama, 4=nik, 5=jabatan, 6=periode-incharge, 7=status (kontrak)
   */
  const storeEmpRows = empRows.filter(row => row[1] === storeCode); 

  storeEmpRows.forEach((row, rowIndex) => {
    const profileId = `sheet-prof-${rowIndex}`; 
    const profile: Profile = {
      id: profileId,
      auth_user_id: null,
      email: `${row[3]}@dummy.com`.replace(/\s/g, '').toLowerCase(),
      full_name: (row[3] || "Tanpa Nama").trim(), // Nama Karyawan (Kolom D/3)
      nik: row[4]?.trim() || null,               // NIK (Kolom E/4)
      role: "staff",
      position: row[5] || "Staff",       // Jabatan (Kolom F/5)
      status: "aktif",
      store_id: storeId,
      join_date: null,         
      avatar_url: null,
      contract_end_date: row[7] || null, // Kontrak/Status (Kolom H/7)
      incharge_start_date: row[6] || null, // Incharge (Kolom G/6)
      managed_store_ids: null,
      created_at: new Date().toISOString(),
    };
    profiles.push(profile);
  });

  // 2. Ambil Data Jadwal/Schedule (Tab dinamis menggunakan Kode Toko)
  // Tarik dari A1 untuk membaca header bulan yang ditumpuk secara vertikal
  const SHEET_NAME_SCHEDULE = `${storeCode}!A1:AJ`;
  const schedRows = await fetchSheetData(SCHEDULE_SHEET_ID, SHEET_NAME_SCHEDULE);
  
  const start = new Date(startDate);
  const end = new Date(endDate);

  const monthMatch = [
    ["JAN"], ["FEB"], ["MAR"], ["APR"], ["MEI", "MAY"], ["JUN"], ["JUL"], ["AGU", "AUG"], ["SEP"], ["OKT", "OCT"], ["NOV"], ["DES", "DEC"]
  ];

  // Fungsi untuk mengecek apakah sebuah baris adalah header bulan yang dicari
  function isTargetMonthHeader(colA: string, targetDate: Date) {
    const text = colA.toUpperCase();
    const year = targetDate.getFullYear().toString();
    if (!text.includes(year)) return false;
    
    const targetMonthAliases = monthMatch[targetDate.getMonth()];
    return targetMonthAliases.some(m => text.includes(m));
  }

  function isAnyMonthHeader(colA: string) {
    const text = colA.toUpperCase();
    const hasYear = /\d{4}/.test(text);
    if (!hasYear) return false;
    return monthMatch.flat().some(m => text.includes(m));
  }

  let activeMonthBlock = false;

  schedRows.forEach((row, rowIndex) => {
    const colA = row[0]?.trim() || "";

    // Deteksi Header Bulan (contoh: "JULI 2026")
    if (isAnyMonthHeader(colA)) {
      if (isTargetMonthHeader(colA, start)) {
        activeMonthBlock = true;
      } else {
        activeMonthBlock = false;
      }
      return;
    }

    // Hanya proses baris jika kita sedang berada di blok bulan yang benar
    if (!activeMonthBlock) return;

    // Lewati baris header tabel ("NIK", "NAMA LENGKAP", dll) atau baris kosong
    if (colA.toUpperCase() === "NIK" || !colA) return;

    const employeeNik = colA;
    const employeeName = row[1]?.trim();
    if (!employeeName) return;

    // Cari profil dengan nama yang cocok (case-insensitive) atau NIK
    const matchedProfile = profiles.find(p => 
      (p.nik && employeeNik && p.nik === employeeNik) ||
      (p.full_name?.toLowerCase() === employeeName.toLowerCase())
    );
    
    if (matchedProfile) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Pada sheet, Tanggal 1 berada di index 3 (Kolom D), Tanggal 2 di index 4, dst.
        const dateOfMonth = d.getDate();
        const colIndex = dateOfMonth + 2; 

        const shiftCodeName = row[colIndex];
        if (shiftCodeName && shiftCodeName.trim() !== "") {
          schedules.push({
            id: `sched-${rowIndex}-${colIndex}-${dateOfMonth}`,
            store_id: storeId,
            profile_id: matchedProfile.id,
            date: d.toISOString().split("T")[0],
            shift_code_id: shiftCodeName.trim(), // Nama kode
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  });

  // 3. (Opsional) Ambil Shift Codes dari Sheet Employee
  const shiftCodes: ShiftCode[] = [];
  const codeRows = await fetchSheetData(EMPLOYEE_SHEET_ID, SHEET_NAME_CODES);
  codeRows.forEach(row => {
    if(row[0]){
      shiftCodes.push({
        id: row[0],         
        code: row[0],
        group_name: row[1] || null, // Kolom B/1 = Group
        time_in: row[2] || null,    // Kolom C/2 = Time In
        time_out: row[3] || null,   // Kolom D/3 = Time Out
        created_at: new Date().toISOString()
      });
    }
  });

  return { profiles, schedules, shiftCodes };
}
