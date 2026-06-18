const CONFIG = {
  scheduleSpreadsheetId: "14s3Y-LMUd1Gbd-XBJ07_boyRNeL5CPij_G8gyo15SoE",
  employeeSpreadsheetId: "1RqzmVe3V3PTgCrlvnyqwOwpTLsxRGQYSxOFmfjXrtzM",
  schedule: {
    headerRows: {
      date: 2,
      day: 3,
    },
    dataStartRow: 4,
    nikColumn: 1,
    nameColumn: 2,
    roleColumn: 3,
    firstDateColumn: 4,
  },
  employees: {
    sheetName: "data_karyawan",
    headerRow: 1,
    columns: {
      store: "store",
      site: "site",
      ci: "ci",
      name: "nama",
      nik: "nik",
      role: "jabatan",
      inchargeStart: "periode-incharge",
      contractEnd: "status",
    },
  },
  shiftCode: {
    sheetName: "shift_code",
    headerRow: 1,
    columns: {
      roster: "roster",
      group: "group",
      timeIn: "time_in",
      timeOut: "time_out",
    },
  },
};

function doGet(e) {
  try {
    const targetDate = parseRequestDate_(e.parameter.date);
    const result = buildScheduleReview_(targetDate);
    return response_(e, {
      ok: true,
      date: toIsoDate_(targetDate),
      shiftCodes: result.shiftCodes,
      stores: result.stores,
      employees: result.employees,
    });
  } catch (error) {
    return response_(e, {
      ok: false,
      error: error.message,
    });
  }
}

function buildScheduleReview_(targetDate) {
  const dates = [];
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  const employeeBook = SpreadsheetApp.openById(CONFIG.employeeSpreadsheetId);
  const employeeMap = readEmployeeMap_(employeeBook);
  const shiftCodeMap = readShiftCodeMap_(employeeBook);
  const scheduleBook = SpreadsheetApp.openById(CONFIG.scheduleSpreadsheetId);
  const storeSet = {};
  const employees = [];

  scheduleBook.getSheets().forEach((sheet) => {
    const store = sheet.getName();
    const parsed = readStoreSchedule_(sheet, store, dates, employeeMap, shiftCodeMap);
    if (parsed.length) {
      parsed.forEach((employee) => {
        if (employee.store) storeSet[employee.store] = true;
      });
      employees.push.apply(employees, parsed);
    }
  });

  return {
    stores: Object.keys(storeSet).sort(),
    shiftCodes: shiftCodeMap,
    employees: employees.sort((a, b) => {
      return a.store.localeCompare(b.store) || a.name.localeCompare(b.name);
    }),
  };
}

function readStoreSchedule_(sheet, store, dates, employeeMap, shiftCodeMap) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const cfg = CONFIG.schedule;
  const dateRow = values[cfg.headerRows.date - 1] || [];

  const targetDate = dates[0];
  const dateColumns = dates.map(d => findDateColumn_(dateRow, d, cfg.firstDateColumn));

  if (dateColumns.every(col => col === -1)) return [];

  const rows = [];
  for (let index = cfg.dataStartRow - 1; index < values.length; index += 1) {
    const row = values[index];
    const nik = clean_(row[cfg.nikColumn - 1]);
    const name = clean_(row[cfg.nameColumn - 1]);
    if (!nik && !name) continue;
    if (looksLikeSummaryRow_(nik, name)) break;

    const employeeKey = nik || name.toUpperCase();
    const employeeData = employeeMap[employeeKey] || {};
    const inchargeStart = employeeData.inchargeStart || "";
    const tenureDays = inchargeStart ? daysBetween_(new Date(inchargeStart), targetDate) : 0;

    const weeklySchedule = dateColumns.map((col, i) => {
      const shift = col === -1 ? "" : clean_(row[col]);
      const info = getShiftInfo_(shift, shiftCodeMap);
      return {
        date: toIsoDate_(dates[i]),
        shift,
        shiftLabel: formatShiftLabel_(shift, info),
        shiftGroup: info.group || "",
        timeIn: info.timeIn || "",
        timeOut: info.timeOut || ""
      };
    });

    const todayShiftObj = weeklySchedule[0];
    const tomorrowShiftObj = weeklySchedule[1];

    rows.push({
      store: employeeData.store || store,
      site: employeeData.site || "",
      ci: employeeData.ci || "",
      nik,
      name,
      role: employeeData.role || clean_(row[cfg.roleColumn - 1]),
      schedule: weeklySchedule,
      todayShift: todayShiftObj.shift,
      todayShiftLabel: todayShiftObj.shiftLabel,
      todayShiftGroup: todayShiftObj.shiftGroup,
      todayTimeIn: todayShiftObj.timeIn,
      todayTimeOut: todayShiftObj.timeOut,
      tomorrowShift: tomorrowShiftObj.shift,
      tomorrowShiftLabel: tomorrowShiftObj.shiftLabel,
      tomorrowShiftGroup: tomorrowShiftObj.shiftGroup,
      tomorrowTimeIn: tomorrowShiftObj.timeIn,
      tomorrowTimeOut: tomorrowShiftObj.timeOut,
      inchargeStart,
      contractEnd: employeeData.contractEnd || "",
      tenureDays,
      tenureLabel: tenureDays ? formatTenure_(tenureDays) : "-",
    });
  }

  return rows;
}

function readEmployeeMap_(book) {
  const cfg = CONFIG.employees;
  const sheet = book.getSheetByName(cfg.sheetName) || book.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = (values[cfg.headerRow - 1] || []).map((value) => clean_(value).toUpperCase());
  const indexes = {};

  Object.keys(cfg.columns).forEach((key) => {
    indexes[key] = headers.indexOf(cfg.columns[key].toUpperCase());
  });

  return values.slice(cfg.headerRow).reduce((acc, row) => {
    const nik = clean_(row[indexes.nik]);
    const name = clean_(row[indexes.name]);
    if (!nik && !name) return acc;

    const record = {
      nik,
      name,
      store: clean_(row[indexes.store]),
      site: clean_(row[indexes.site]),
      ci: clean_(row[indexes.ci]),
      role: clean_(row[indexes.role]),
      inchargeStart: toIsoDateOrBlank_(row[indexes.inchargeStart]),
      contractEnd: parseContractEnd_(row[indexes.contractEnd]),
    };

    if (nik) acc[nik] = record;
    if (name) acc[name.toUpperCase()] = record;
    return acc;
  }, {});
}

function readShiftCodeMap_(book) {
  const cfg = CONFIG.shiftCode;
  const sheet = book.getSheetByName(cfg.sheetName);
  if (!sheet) return {};

  const values = sheet.getDataRange().getDisplayValues();
  const headers = (values[cfg.headerRow - 1] || []).map((value) => clean_(value).toUpperCase());
  const indexes = {};

  Object.keys(cfg.columns).forEach((key) => {
    indexes[key] = headers.indexOf(cfg.columns[key].toUpperCase());
  });

  return values.slice(cfg.headerRow).reduce((acc, row) => {
    const roster = clean_(row[indexes.roster]).toUpperCase();
    if (!roster) return acc;

    acc[roster] = {
      roster,
      group: clean_(row[indexes.group]),
      timeIn: normalizeTime_(row[indexes.timeIn]),
      timeOut: normalizeTime_(row[indexes.timeOut]),
    };
    return acc;
  }, {});
}

function getShiftInfo_(shift, shiftCodeMap) {
  return shiftCodeMap[clean_(shift).toUpperCase()] || {};
}

function formatShiftLabel_(shift, shiftInfo) {
  const code = clean_(shift);
  if (!code) return "";
  if (!shiftInfo.timeIn || !shiftInfo.timeOut) return code;
  return `${code} (${shiftInfo.timeIn}-${shiftInfo.timeOut})`;
}

function findDateColumn_(dateRow, targetDate, firstDateColumn) {
  const targetDay = targetDate.getDate();
  const targetIso = toIsoDate_(targetDate);

  for (let column = firstDateColumn - 1; column < dateRow.length; column += 1) {
    const cell = dateRow[column];
    if (cell instanceof Date && toIsoDate_(cell) === targetIso) return column;
    if (Number(cell) === targetDay) return column;
  }

  return -1;
}

function looksLikeSummaryRow_(nik, name) {
  const text = `${nik} ${name}`.toUpperCase();
  return text.includes("SCHEDULE") || text.includes("OPENING") || text.includes("MIDDLE") || text.includes("CLOSING");
}

function parseRequestDate_(value) {
  if (!value) return new Date();
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error("Format tanggal harus YYYY-MM-DD.");
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addDays_(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween_(startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function formatTenure_(days) {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years && months) return `${years} tahun ${months} bulan`;
  if (years) return `${years} tahun`;
  if (months) return `${months} bulan`;
  return `${days} hari`;
}

function parseContractEnd_(value) {
  const text = clean_(value);
  if (!text || text.toUpperCase() === "PERMANEN") return text;

  const date = parseIndonesianDate_(text);
  if (date) return toIsoDate_(date);

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : toIsoDate_(parsed);
}

function parseIndonesianDate_(value) {
  if (value instanceof Date) return value;

  const text = clean_(value).toLowerCase();
  const months = {
    januari: 0,
    february: 1,
    februari: 1,
    maret: 2,
    march: 2,
    april: 3,
    mei: 4,
    may: 4,
    juni: 5,
    june: 5,
    juli: 6,
    july: 6,
    agustus: 7,
    august: 7,
    september: 8,
    oktober: 9,
    october: 9,
    november: 10,
    desember: 11,
    december: 11,
  };
  const match = text.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/);
  if (!match || months[match[2]] == null) return null;
  return new Date(Number(match[3]), months[match[2]], Number(match[1]));
}

function toIsoDateOrBlank_(value) {
  if (!value) return "";
  if (value instanceof Date) return toIsoDate_(value);
  const indonesianDate = parseIndonesianDate_(value);
  if (indonesianDate) return toIsoDate_(indonesianDate);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? clean_(value) : toIsoDate_(parsed);
}

function normalizeTime_(value) {
  const text = clean_(value);
  if (!text) return "";
  const numberValue = Number(text.replace(",", "."));
  if (Number.isNaN(numberValue)) return text;
  const hours = Math.floor(numberValue);
  const minutes = Math.round((numberValue - hours) * 100);
  return `${String(hours).padStart(2, "0")}.${String(minutes).padStart(2, "0")}`;
}

function toIsoDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function clean_(value) {
  return value == null ? "" : String(value).trim();
}

function response_(e, payload) {
  const callback = clean_(e.parameter.callback);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
