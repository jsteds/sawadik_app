(function () {
  const STORAGE_KEY = "scheduleReviewApiUrl";
  const state = {
    stores: [],
    roles: [],
    employees: [],
    filteredEmployees: [],
    shiftCodes: {},
    targetDate: new Date(),
  };

  const els = {
    // Topbar
    searchInput: document.getElementById("searchInput"),
    configApiBtn: document.getElementById("configApiBtn"),

    // Sidebar Filters
    storeSelect: document.getElementById("storeSelect"),
    roleSelect: document.getElementById("roleSelect"),
    contractSlider: document.getElementById("contractSlider"),
    contractDaysLabel: document.getElementById("contractDaysLabel"),
    contractDaysLabelDynamic: document.querySelector(".contract-label-dynamic"),

    // Summary Cards
    totalKaryawanVal: document.getElementById("totalKaryawanVal"),
    tokoAktifVal: document.getElementById("tokoAktifVal"),
    inchargeHariIniVal: document.getElementById("inchargeHariIniVal"),
    sisaKontrakVal: document.getElementById("sisaKontrakVal"),
    sisaKontrakBadge: document.querySelector(".card-icon .badge.red"),

    // Roster Tabs & Containers
    rosterTabs: document.getElementById("rosterTabs"),
    tabContents: document.querySelectorAll(".tab-content"),
    rosterMonthLabel: document.getElementById("rosterMonthLabel"),
    rosterMonthLabel2: document.getElementById("rosterMonthLabel2"),
    
    rosterTableHead: document.getElementById("rosterTableHead"),
    rosterTableBody: document.getElementById("rosterTableBody"),

    shiftCodeTableBody: document.getElementById("shiftCodeTableBody"),

    bulananWarning: document.getElementById("bulananWarning"),
    bulananTableContainer: document.getElementById("bulananTableContainer"),
    rosterBulananTableHead: document.getElementById("rosterBulananTableHead"),
    rosterBulananTableBody: document.getElementById("rosterBulananTableBody"),

    chartContainer: document.getElementById("chartContainer"),

    // Bottom sections
    inchargeList: document.getElementById("inchargeList"),
    kontrakTableBody: document.getElementById("kontrakTableBody"),

    // Modal
    apiConfigModal: document.getElementById("apiConfigModal"),
    apiUrlInput: document.getElementById("apiUrlInput"),
    dateInput: document.getElementById("dateInput"),
    loadButton: document.getElementById("loadButton"),
    closeApiBtn: document.getElementById("closeApiBtn")
  };

  init();

  function init() {
    const savedApiUrl = localStorage.getItem(STORAGE_KEY) || "";
    els.apiUrlInput.value = savedApiUrl;
    els.dateInput.value = toInputDate(state.targetDate);

    // Event Listeners
    els.configApiBtn.addEventListener("click", () => els.apiConfigModal.classList.add("is-visible"));
    els.closeApiBtn.addEventListener("click", () => els.apiConfigModal.classList.remove("is-visible"));
    els.loadButton.addEventListener("click", () => {
      els.apiConfigModal.classList.remove("is-visible");
      loadData();
    });

    els.storeSelect.addEventListener("change", applyFilters);
    els.roleSelect.addEventListener("change", applyFilters);
    els.searchInput.addEventListener("input", applyFilters);
    els.contractSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      els.contractDaysLabel.textContent = val;
      els.contractDaysLabelDynamic.textContent = val;
      applyFilters();
    });

    // Tab Switching
    els.rosterTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      
      els.rosterTabs.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.classList.add("text-muted");
      });
      btn.classList.add("active");
      btn.classList.remove("text-muted");

      const tabId = btn.getAttribute("data-tab");
      els.tabContents.forEach(tc => {
        if (tc.id === tabId) {
          tc.classList.add("active");
          tc.style.display = "block";
        } else {
          tc.classList.remove("active");
          tc.style.display = "none";
        }
      });
      
      if (tabId === "tab-chart") renderChart();
    });

    if (savedApiUrl) {
      loadData();
    } else {
      els.apiConfigModal.classList.add("is-visible");
    }
  }

  async function loadData() {
    const apiUrl = els.apiUrlInput.value.trim();
    if (!apiUrl) return;

    localStorage.setItem(STORAGE_KEY, apiUrl);
    state.targetDate = parseDateInput(els.dateInput.value) || new Date();

    setLoading(true);

    try {
      const payload = await requestData(apiUrl, els.dateInput.value);
      if (!payload.ok) throw new Error(payload.error || "API mengembalikan data yang tidak valid.");

      state.stores = payload.stores || [];
      state.shiftCodes = payload.shiftCodes || {};
      state.employees = normalizeEmployees(payload.employees || []);
      fillFilterOptions();
      applyFilters();
      renderShiftCodes();
    } catch (error) {
      console.error(error);
      alert("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function requestData(apiUrl, dateValue) {
    const url = new URL(apiUrl);
    url.searchParams.set("date", dateValue);

    try {
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      return requestJsonp(url);
    }
  }

  function requestJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `scheduleReview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("API timeout."));
      }, 20000);

      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      script.onerror = () => {
        cleanup();
        reject(new Error("Gagal memuat API Apps Script via JSONP."));
      };

      url.searchParams.set("callback", callbackName);
      script.src = url.toString();
      document.head.append(script);
    });
  }

  function normalizeEmployees(rows) {
    const normalized = [];
    state.roles = new Set();

    rows.forEach((row) => {
      const role = clean(row.role);
      if (role) state.roles.add(role);

      let schedule = row.schedule || [];

      const endContractDate = row.contractEnd ? new Date(row.contractEnd) : null;
      let sisaHari = null;
      if (endContractDate && !Number.isNaN(endContractDate.getTime())) {
        sisaHari = Math.ceil((endContractDate - state.targetDate) / 86400000);
      }

      normalized.push({
        store: clean(row.store),
        nik: clean(row.nik),
        name: clean(row.name),
        role: role,
        schedule: schedule,
        inchargeStart: clean(row.inchargeStart),
        contractEnd: clean(row.contractEnd),
        sisaHariKontrak: sisaHari
      });
    });

    state.roles = Array.from(state.roles).sort();
    return normalized;
  }

  function fillFilterOptions() {
    const currentStore = els.storeSelect.value;
    els.storeSelect.innerHTML = `<option value="">Semua Toko</option>`;
    state.stores.forEach(store => {
      const opt = document.createElement("option");
      opt.value = store;
      opt.textContent = store;
      els.storeSelect.append(opt);
    });
    els.storeSelect.value = state.stores.includes(currentStore) ? currentStore : "";

    const currentRole = els.roleSelect.value;
    els.roleSelect.innerHTML = `<option value="">Semua Posisi</option>`;
    state.roles.forEach(role => {
      const opt = document.createElement("option");
      opt.value = role;
      opt.textContent = role;
      els.roleSelect.append(opt);
    });
    els.roleSelect.value = state.roles.includes(currentRole) ? currentRole : "";
  }

  function applyFilters() {
    const store = els.storeSelect.value;
    const role = els.roleSelect.value;
    const query = els.searchInput.value.trim().toLowerCase();
    
    state.filteredEmployees = state.employees.filter(emp => {
      const matchStore = !store || emp.store === store;
      const matchRole = !role || emp.role === role;
      const matchQuery = !query || `${emp.name} ${emp.nik}`.toLowerCase().includes(query);
      return matchStore && matchRole && matchQuery;
    });

    render();
  }

  function render() {
    const activeStores = new Set(state.filteredEmployees.map(e => e.store)).size;
    let inchargeToday = 0;
    const sisaKontrakLimit = parseInt(els.contractSlider.value, 10);
    let expiringContracts = 0;

    const targetIso = toInputDate(state.targetDate);

    state.filteredEmployees.forEach(emp => {
      const todaySched = emp.schedule.find(s => s.date === targetIso);
      const todayShift = todaySched ? todaySched.shift : "";
      if (isWorking(todayShift)) inchargeToday++;
      
      if (emp.sisaHariKontrak !== null && emp.sisaHariKontrak <= sisaKontrakLimit) {
        expiringContracts++;
      }
    });

    // Update Summary
    els.totalKaryawanVal.textContent = state.filteredEmployees.length;
    els.tokoAktifVal.textContent = activeStores;
    els.inchargeHariIniVal.textContent = inchargeToday;
    els.sisaKontrakVal.textContent = expiringContracts;
    els.sisaKontrakBadge.textContent = expiringContracts;
    els.sisaKontrakBadge.style.display = expiringContracts > 0 ? "inline-block" : "none";

    // Set Month Label
    const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
    const monthStr = monthFormatter.format(state.targetDate);
    els.rosterMonthLabel.textContent = monthStr;
    els.rosterMonthLabel2.textContent = monthStr;

    renderMingguanTable();
    renderBulananTable();
    renderInchargeList(targetIso);
    renderKontrakTable(sisaKontrakLimit);
    renderChart();
  }

  // Cari range Senin-Minggu dari minggu targetDate
  function getWeeklyRange(targetDate) {
    const day = targetDate.getDay();
    const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(targetDate.setDate(diffToMonday));
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(toInputDate(addDays(monday, i)));
    }
    return dates;
  }

  function renderMingguanTable() {
    els.rosterTableHead.innerHTML = `
      <th>Foto</th>
      <th>Nama</th>
      <th>Posisi</th>
      <th>Toko</th>
    `;

    const weekDates = getWeeklyRange(new Date(state.targetDate));
    const daysName = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    
    weekDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const dayName = daysName[d.getDay()];
      const dateNum = d.getDate();
      const th = document.createElement("th");
      th.innerHTML = `${dayName}<br><span style="font-size:16px;color:#111">${dateNum}</span>`;
      els.rosterTableHead.appendChild(th);
    });

    els.rosterTableBody.innerHTML = "";

    state.filteredEmployees.forEach(emp => {
      const tr = document.createElement("tr");
      
      tr.innerHTML = `
        <td><div class="emp-avatar" style="background-color: ${stringToColor(emp.name)}">${getInitials(emp.name)}</div></td>
        <td style="font-weight: 500">${escapeHtml(emp.name)}</td>
        <td class="text-muted">${escapeHtml(emp.role)}</td>
        <td>${escapeHtml(emp.store)}</td>
      `;

      // Shifts filter just for this week
      weekDates.forEach(dateStr => {
        const sched = emp.schedule.find(s => s.date === dateStr);
        const shiftCode = sched ? clean(sched.shift) : "";
        const td = document.createElement("td");
        
        if (shiftCode) {
          const shiftType = getShiftType(shiftCode);
          td.innerHTML = `<span class="shift-badge shift-${shiftType}">${escapeHtml(shiftCode)}</span>`;
        } else {
          td.innerHTML = `<span class="shift-badge shift-empty">-</span>`;
        }
        tr.appendChild(td);
      });

      els.rosterTableBody.appendChild(tr);
    });
  }

  function renderBulananTable() {
    // Only show full month if 1 store is selected
    if (!els.storeSelect.value) {
      els.bulananWarning.style.display = "block";
      els.bulananTableContainer.style.display = "none";
      return;
    }

    els.bulananWarning.style.display = "none";
    els.bulananTableContainer.style.display = "block";

    els.rosterBulananTableHead.innerHTML = `
      <th>Nama</th>
      <th>Posisi</th>
    `;

    // Assuming first employee's schedule contains the full month dates
    const monthDates = state.filteredEmployees.length > 0 && state.filteredEmployees[0].schedule.length > 0 
      ? state.filteredEmployees[0].schedule.map(s => s.date)
      : [];

    monthDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const dateNum = d.getDate();
      const th = document.createElement("th");
      th.textContent = dateNum;
      els.rosterBulananTableHead.appendChild(th);
    });

    els.rosterBulananTableBody.innerHTML = "";

    state.filteredEmployees.forEach(emp => {
      const tr = document.createElement("tr");
      
      tr.innerHTML = `
        <td style="font-weight: 500; white-space: nowrap;">${escapeHtml(emp.name)}</td>
        <td class="text-muted" style="white-space: nowrap;">${escapeHtml(emp.role)}</td>
      `;

      monthDates.forEach(dateStr => {
        const sched = emp.schedule.find(s => s.date === dateStr);
        const shiftCode = sched ? clean(sched.shift) : "";
        const td = document.createElement("td");
        
        if (shiftCode) {
          const shiftType = getShiftType(shiftCode);
          td.innerHTML = `<span class="shift-badge shift-${shiftType}" title="${shiftCode}">${escapeHtml(shiftCode)}</span>`;
        } else {
          td.innerHTML = `<span class="shift-badge shift-empty">-</span>`;
        }
        tr.appendChild(td);
      });

      els.rosterBulananTableBody.appendChild(tr);
    });
  }

  function renderShiftCodes() {
    els.shiftCodeTableBody.innerHTML = "";
    const codes = Object.keys(state.shiftCodes).sort();
    if (codes.length === 0) {
      els.shiftCodeTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Tidak ada data roster.</td></tr>`;
      return;
    }
    codes.forEach(code => {
      const info = state.shiftCodes[code];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: bold">${escapeHtml(code)}</td>
        <td>${escapeHtml(info.group || "-")}</td>
        <td>${escapeHtml(info.timeIn || "-")}</td>
        <td>${escapeHtml(info.timeOut || "-")}</td>
      `;
      els.shiftCodeTableBody.appendChild(tr);
    });
  }

  function renderChart() {
    els.chartContainer.innerHTML = "";
    if (state.filteredEmployees.length === 0) return;

    let inchargeCount = 0;
    let offCount = 0;
    const targetIso = toInputDate(state.targetDate);

    state.filteredEmployees.forEach(emp => {
      const sched = emp.schedule.find(s => s.date === targetIso);
      const shift = sched ? sched.shift : "";
      if (!shift) return;
      if (isWorking(shift)) {
        inchargeCount++;
      } else {
        offCount++;
      }
    });

    const total = inchargeCount + offCount;
    if (total === 0) {
      els.chartContainer.innerHTML = "<p class='text-muted'>Data tidak tersedia untuk tanggal ini.</p>";
      return;
    }

    const inchargePct = Math.round((inchargeCount / total) * 100);
    const offPct = Math.round((offCount / total) * 100);

    els.chartContainer.innerHTML = `
      <h3>Grafik Karyawan (Tanggal: ${formatDate(targetIso)})</h3>
      <div class="chart-bar-row">
        <div class="chart-bar-label">Incharge</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${inchargePct}%; background-color: var(--primary);"></div>
        </div>
        <div class="chart-bar-value">${inchargeCount}</div>
      </div>
      <div class="chart-bar-row">
        <div class="chart-bar-label">Off/Libur</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${offPct}%; background-color: var(--red);"></div>
        </div>
        <div class="chart-bar-value">${offCount}</div>
      </div>
    `;
  }

  function renderInchargeList(targetIso) {
    els.inchargeList.innerHTML = "";
    
    const inchargeEmployees = state.filteredEmployees.filter(emp => {
      const sched = emp.schedule.find(s => s.date === targetIso);
      const shift = sched ? sched.shift : "";
      return isWorking(shift);
    }).slice(0, 8);

    if (inchargeEmployees.length === 0) {
      els.inchargeList.innerHTML = `<div class="text-muted" style="grid-column: 1/-1">Tidak ada karyawan incharge hari ini.</div>`;
      return;
    }

    inchargeEmployees.forEach(emp => {
      const sched = emp.schedule.find(s => s.date === targetIso);
      const shift = sched.shift;
      const type = getShiftType(shift);
      const shiftName = type === 'P' ? 'Pagi' : type === 'S' ? 'Siang' : type === 'M' ? 'Malam' : shift;
      
      const div = document.createElement("div");
      div.className = "incharge-card";
      div.innerHTML = `
        <div class="emp-avatar" style="background-color: ${stringToColor(emp.name)}">${getInitials(emp.name)}</div>
        <div class="incharge-info">
          <span class="incharge-store">${escapeHtml(emp.store)}</span>
          <span class="incharge-name">${escapeHtml(emp.name)} • ${escapeHtml(shiftName)}</span>
        </div>
      `;
      els.inchargeList.appendChild(div);
    });
  }

  function renderKontrakTable(sisaKontrakLimit) {
    els.kontrakTableBody.innerHTML = "";
    
    let kontrakEmployees = state.filteredEmployees.filter(emp => emp.contractEnd && emp.sisaHariKontrak !== null);
    // Sort by sisa hari (terkecil dulu)
    kontrakEmployees.sort((a, b) => a.sisaHariKontrak - b.sisaHariKontrak);

    if (kontrakEmployees.length === 0) {
      els.kontrakTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="text-align:center">Belum ada data kontrak kerja.</td></tr>`;
      return;
    }

    kontrakEmployees.forEach(emp => {
      const isWarning = emp.sisaHariKontrak <= sisaKontrakLimit;
      const tr = document.createElement("tr");
      if (isWarning) tr.className = "row-danger";

      const sisaHariText = isWarning ? `${emp.sisaHariKontrak} Hari (Peringatan)` : `${emp.sisaHariKontrak} Hari`;

      tr.innerHTML = `
        <td style="font-weight: 500">${escapeHtml(emp.name)}</td>
        <td class="text-muted">${escapeHtml(emp.role)}</td>
        <td>${escapeHtml(emp.store)}</td>
        <td>${formatDate(emp.inchargeStart)}</td>
        <td>${formatDate(emp.contractEnd)}</td>
        <td style="font-weight: 600">${sisaHariText}</td>
      `;
      els.kontrakTableBody.appendChild(tr);
    });
  }

  // Utils
  function clean(value) {
    return value == null ? "" : String(value).trim();
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    }[char]));
  }

  function parseDateInput(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function toInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\./g, '/');
  }

  function isWorking(shift) {
    const value = clean(shift).toUpperCase();
    return value && value !== "SHOFF" && value !== "OFF" && value !== "-";
  }

  function getShiftType(shift) {
    const s = clean(shift).toUpperCase();
    if (s === "SHOFF" || s === "OFF" || s === "-") return "O";
    // Dummy logic for extracting shift type from code (e.g. M0025 -> M)
    const firstChar = s.charAt(0);
    if (firstChar === 'P' || firstChar === 'S' || firstChar === 'M') return firstChar;
    // Default fallback based on time/group if available, or just random logic for demonstration
    // if 'A' maybe Pagi, if 'F' maybe Malam, etc.
    return "P"; 
  }

  function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 45%)`;
  }

  function setLoading(isLoading) {
    els.loadButton.disabled = isLoading;
    els.loadButton.textContent = isLoading ? "Mengambil..." : "Ambil Data";
  }
})();
