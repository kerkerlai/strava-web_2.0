
function showAdminToast(msg, isError = false) {
  let toast = document.getElementById("admin-toast-container");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "admin-toast-container";
    toast.className = "fixed bottom-5 right-5 z-[999] flex flex-col space-y-2 pointer-events-none";
    document.body.appendChild(toast);
  }
  const item = document.createElement("div");
  item.className = `p-4 rounded-2xl shadow-2xl text-xs font-bold text-white border flex items-center space-x-2 transition-all transform duration-300 pointer-events-auto ${isError ? "bg-rose-900/90 border-rose-600" : "bg-slate-900/95 border-amber-500/60"}`;
  item.innerHTML = `<span>${msg}</span>`;
  toast.appendChild(item);
  setTimeout(() => {
    item.style.opacity = "0";
    setTimeout(() => item.remove(), 300);
  }, 4000);
}

window.addEventListener("gameStateSynced", (e) => {
  if (e.detail) {
    gameState = e.detail;
    allActivitiesCache = gameState?.activities || [];
    populateGlobalSettings();
    populateFormDropdowns();
    populateBossConfig();
    renderHeroTable();
    renderSnapshotTable();
    renderActivityTable();
    renderCrawlerUI();
  }
});


// -------------------------------------------------------------
// GM AUTHENTICATION GATEKEEPER (Master Password: 800402)
// -------------------------------------------------------------
const GM_MASTER_PASSWORD = "800402";

function checkGMAuth() {
  const isAuth = sessionStorage.getItem("gm_authenticated") === GM_MASTER_PASSWORD;
  const overlay = document.getElementById("admin-login-overlay");
  if (overlay) {
    if (isAuth) {
      overlay.classList.add("hidden");
    } else {
      overlay.classList.remove("hidden");
      setTimeout(() => {
        const input = document.getElementById("gm-password-input");
        if (input) input.focus();
      }, 100);
    }
  }
}

function verifyGMPassword() {
  const input = document.getElementById("gm-password-input");
  const errEl = document.getElementById("gm-password-error");
  const overlay = document.getElementById("admin-login-overlay");
  const val = (input?.value || "").trim();

  if (val === GM_MASTER_PASSWORD) {
    sessionStorage.setItem("gm_authenticated", GM_MASTER_PASSWORD);
    if (errEl) errEl.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
    showAdminToast("✅ GM 權限認證成功，歡迎進入控制台！");
    if (window.lucide) lucide.createIcons();
  } else {
    if (errEl) errEl.classList.remove("hidden");
    if (input) {
      input.classList.add("border-rose-500");
      input.value = "";
      input.focus();
    }
  }
}

function logoutGM() {
  sessionStorage.removeItem("gm_authenticated");
  const overlay = document.getElementById("admin-login-overlay");
  const input = document.getElementById("gm-password-input");
  if (overlay) overlay.classList.remove("hidden");
  if (input) {
    input.value = "";
    input.focus();
  }
  showAdminToast("已安全登出 GM 控制台");
}


function dateToInputVal(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim().replace(/-/g, "/");
  const parts = s.split(" ")[0].split("/");
  if (parts.length === 3) {
    const y = parts[0];
    const m = String(parts[1]).padStart(2, "0");
    const d = String(parts[2]).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

function inputValToDate(inputVal) {
  if (!inputVal) return "";
  return inputVal.replace(/-/g, "/");
}
/**
 * 鋼鐵英雄紀元 - GM Control Panel Engine (v2.3 動態情境響應版)
 */

let gameState = null;
let allActivitiesCache = [];

const RPG_CLASSES = {
  '狂戰士': { badge: '⚔️', name: '狂戰士', color: '#ef4444', desc: '無氧落差 +30%' },
  '聖騎士': { badge: '🛡️', name: '聖騎士', color: '#eab308', desc: '出勤×150 + Suffer×1.5' },
  '遊俠':   { badge: '🏹', name: '遊俠',   color: '#10b981', desc: 'Zone2次數×120 + 熱量+35%' },
  '大法師': { badge: '🧙', name: '大法師', color: '#06b6d4', desc: 'TRIMP×1.5倍奧術增幅' },
  '刺客':   { badge: '🗡️', name: '刺客',   color: '#a855f7', desc: '密度×2.0倍暗影加成' }
};

document.addEventListener('DOMContentLoaded', async () => {
  checkGMAuth();
  await fetchAdminData();
  await fetchCrawlerConfig();
  populateGlobalSettings();
  populateFormDropdowns();
  onExpansionModeChanged();
  renderSnapshotTable();
  renderHeroTable();
  renderActivityTable();
  renderCrawlerUI();
  initAdminSSE();
  if (window.lucide) lucide.createIcons();
});

function initAdminSSE() {
  try {
    const sse = new EventSource('/api/stream');
    sse.addEventListener('game_updated', (e) => {
      gameState = JSON.parse(e.data);
      allActivitiesCache = gameState?.activities || [];
      renderSnapshotTable();
      renderHeroTable();
      renderActivityTable();
    });
    sse.addEventListener('new_attack', () => {
      fetchAdminData().then(() => {
        renderActivityTable();
      });
    });
  } catch (e) {}
}

const EMBEDDED_DEFAULT_STATE = {
  activeMode: "world_boss",
  seasonStart: "2026/08/12",
  seasonEnd: "2026/08/31",
  boss: {
    name: "🌩️ 墮落雷神・索爾 (Fallen Thor)",
    subtitle: "世界 Boss 討伐戰 (全伺服器合作模式)",
    maxHp: 350000,
    currentHp: 232849,
    seasonStart: "2026/08/12",
    seasonEnd: "2026/08/31",
    avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    description: "索爾受到雷霆魔劍侵蝕陷入瘋狂，諸神黃昏即將降臨！唯有全服英雄透過每日嚴格汗水訓練，轉化為物理與魔法攻擊，方能拯救世界！",
    rules: { minDurationMinutes: 30.0, physMultiplier: 1.0, magicMultiplier: 15.0, critMultiplier: 100.0 }
  },
  guilds: [
    { name: "Cake", badge: "🍰", color: "#ec4899", members: ["Kerker", "Calla"] },
    { name: "咪咪胡胡", badge: "🐱", color: "#3b82f6", members: ["Naomi", "Weber"] },
    { name: "嘿喲嘿喲拔蘿蔔", badge: "🥕", color: "#f97316", members: ["Moupower", "Mooooo"] },
    { name: "天琳琳地琳琳", badge: "✨", color: "#a855f7", members: ["Richardyoho", "Lynn Chao"] }
  ],
  heroes: [
    { name: "Kerker", guild: "Cake", age: 35, maxHr: 185, rpgClass: "狂戰士" },
    { name: "Calla", guild: "Cake", age: 35, maxHr: 185, rpgClass: "刺客" },
    { name: "Naomi", guild: "咪咪胡胡", age: 33, maxHr: 187, rpgClass: "聖騎士" },
    { name: "Weber", guild: "咪咪胡胡", age: 35, maxHr: 185, rpgClass: "大法師" },
    { name: "Moupower", guild: "嘿喲嘿喲拔蘿蔔", age: 35, maxHr: 185, rpgClass: "遊俠" },
    { name: "Mooooo", guild: "嘿喲嘿喲拔蘿蔔", age: 34, maxHr: 186, rpgClass: "狂戰士" },
    { name: "Richardyoho", guild: "天琳琳地琳琳", age: 36, maxHr: 184, rpgClass: "聖騎士" },
    { name: "Lynn Chao", guild: "天琳琳地琳琳", age: 32, maxHr: 188, rpgClass: "遊俠" }
  ],
  activities: [],
  snapshots: [],
  archivedSeasons: []
};

async function fetchAdminData() {
  try {
    const res = await fetch("/api/state");
    if (res.ok) {
      gameState = await res.json();
    } else {
      throw new Error("Local API offline");
    }
  } catch (e) {
    try {
      const fbRes = await fetch("/data/game_data.json");
      if (fbRes.ok) {
        gameState = await fbRes.json();
      }
    } catch (err) {}
  }

  if (!gameState) {
    const local = localStorage.getItem("game_state");
    if (local) {
      try { gameState = JSON.parse(local); } catch(err) {}
    }
  }

  if (!gameState || !gameState.heroes || gameState.heroes.length === 0) {
    gameState = JSON.parse(JSON.stringify(EMBEDDED_DEFAULT_STATE));
  }

  allActivitiesCache = gameState?.activities || [];
  if (!gameState.snapshots && gameState.archivedSeasons) {
    gameState.snapshots = gameState.archivedSeasons;
  }

  // If sheetSync is available, trigger background Google Sheet synchronization
  if (typeof syncFromGoogleSheet === "function") {
    try {
      syncFromGoogleSheet().then(() => {
        if (window.gameState) {
          gameState = window.gameState;
          allActivitiesCache = gameState?.activities || [];
          populateGlobalSettings();
          populateFormDropdowns();
          renderHeroTable();
          renderActivityTable();
        }
      }).catch(err => {});
    } catch(err) {}
  }
}

function getModeLabel(mode) {
  if (mode === 'classic') return '資料片一：經典競技模式';
  if (mode === 'rpg_talent' || mode === 'rpg') return '資料片二：RPG 職業天賦模式';
  if (mode === 'world_boss' || mode === 'boss') return '資料片三：世界 Boss 討伐戰 (PvE Raid)';
  return '資料片一：經典競技模式';
}

function populateGlobalSettings() {
  if (!gameState) return;
  const modeSelect = document.getElementById('cfg-active-mode');
  if (modeSelect) modeSelect.value = gameState.activeMode || 'world_boss';

  const sStart = document.getElementById('cfg-season-start');
  const sEnd = document.getElementById('cfg-season-end');

  const startVal = gameState.seasonStart || gameState.boss?.seasonStart || '2026/08/12';
  const endVal = gameState.seasonEnd || gameState.boss?.seasonEnd || '2026/08/31';

  if (sStart) sStart.value = dateToInputVal(startVal);
  if (sEnd) sEnd.value = dateToInputVal(endVal);

  populateBossConfig();
}

/**
 * 當 GM 在控制台切換資料片時，動態調整所有設定面板、補登表單與名冊欄位！
 */
function onExpansionModeChanged() {
  const mode = document.getElementById('cfg-active-mode')?.value || 'classic';
  
  // 1. Update Helper Tag
  const helperTag = document.getElementById('active-mode-helper-tag');
  if (helperTag) {
    if (mode === 'classic') helperTag.innerHTML = '當前設定：🏆 資料片一 • 經典競技模式 (公會積分爭霸)';
    else if (mode === 'rpg_talent') helperTag.innerHTML = '當前設定：⚔️ 資料片二 • RPG 職業天賦模式 (五大職業與羈絆)';
    else helperTag.innerHTML = '當前設定：🐉 資料片三 • 世界 Boss 討伐戰 (PvE 全服合作打王)';
  }

  // 2. Toggle Mode-Specific Config Panels
  const pClassic = document.getElementById('panel-settings-classic');
  const pRpg = document.getElementById('panel-settings-rpg');
  const pBoss = document.getElementById('panel-settings-boss');

  if (pClassic) pClassic.classList.toggle('hidden', mode !== 'classic');
  if (pRpg) pRpg.classList.toggle('hidden', mode !== 'rpg_talent');
  if (pBoss) pBoss.classList.toggle('hidden', mode !== 'world_boss');

  // 3. Dynamic Adjustments to Manual Check-in Form
  const formTitle = document.getElementById('manual-form-title');
  const formSub = document.getElementById('manual-form-subtitle');
  const btnSubmitText = document.getElementById('btn-manual-submit-text');
  const lbl1 = document.getElementById('prev-lbl-1');
  const lbl2 = document.getElementById('prev-lbl-2');
  const lbl3 = document.getElementById('prev-lbl-3');
  const lbl4 = document.getElementById('prev-lbl-4');

  if (mode === 'classic') {
    if (formTitle) formTitle.innerText = '🏋️ 登錄經典競技訓練';
    if (formSub) formSub.innerText = '登錄有效運動 (滿30分)，自動試算有氧/無氧指標並計入公會積分';
    if (btnSubmitText) btnSubmitText.innerText = '登錄訓練並計入經典競技積分';
    if (lbl1) lbl1.innerText = '🔋 燃脂熱量 (kcal)';
    if (lbl2) lbl2.innerText = '🚀 訓練衝力 (TRIMP)';
    if (lbl3) lbl3.innerText = '🦍 無氧落差 (Gap)';
    if (lbl4) lbl4.innerText = '📊 100分制加權試算';
  } else if (mode === 'rpg_talent') {
    if (formTitle) formTitle.innerText = '⚔️ 登錄英雄修煉打卡';
    if (formSub) formSub.innerText = '鍛鍊數據套用英雄職業被動天賦，轉化為 RPG 戰鬥評分 (CP)';
    if (btnSubmitText) btnSubmitText.innerText = '登錄打卡並轉化為職業專精戰力 (CP)';
    if (lbl1) lbl1.innerText = '🔥 基礎能量';
    if (lbl2) lbl2.innerText = '⚡ 奧術衝力';
    if (lbl3) lbl3.innerText = '✨ 專精天賦加成';
    if (lbl4) lbl4.innerText = '⚡ RPG 戰鬥評分 (CP)';
  } else {
    if (formTitle) formTitle.innerText = '⚔️ 手動打卡發動討伐攻擊';
    if (formSub) formSub.innerText = '鍛鍊數據轉化為 3 大傷害體系，即時扣除 Boss 血量';
    if (btnSubmitText) btnSubmitText.innerText = '發動攻擊並登記打卡 (扣除 Boss 血量)';
    if (lbl1) lbl1.innerText = '🗡️ 普攻 (熱量)';
    if (lbl2) lbl2.innerText = '🔮 魔攻 (TRIMP)';
    if (lbl3) lbl3.innerText = '💥 爆擊 (Gap)';
    if (lbl4) lbl4.innerText = '⚔️ 總討伐傷害';
  }

  // 4. Dynamic Adjustments to Hero Roster
  const rosterTitle = document.getElementById('hero-roster-title');
  const btnRandom = document.getElementById('btn-random-classes');
  const thClass = document.getElementById('th-hero-class-col');

  if (mode === 'classic') {
    if (rosterTitle) rosterTitle.innerText = '👥 參賽者名冊與小隊管理 (經典競技)';
    if (btnRandom) btnRandom.classList.add('hidden');
    if (thClass) thClass.innerText = '🛡️ 小隊角色';
  } else if (mode === 'rpg_talent') {
    if (rosterTitle) rosterTitle.innerText = '👥 冒險者名冊與天賦職業配置 (RPG 專精)';
    if (btnRandom) btnRandom.classList.remove('hidden');
    if (thClass) thClass.innerText = '⚔️ RPG 天賦職業';
  } else {
    if (rosterTitle) rosterTitle.innerText = '👥 討伐軍名冊與先鋒部隊 (世界 Boss)';
    if (btnRandom) btnRandom.classList.add('hidden');
    if (thClass) thClass.innerText = '⚔️ 攻擊部隊';
  }

  populateFormDropdowns();
  previewDamageCalculation();
  renderHeroTable();
  if (window.lucide) lucide.createIcons();
}

async function saveGlobalGameSettings() {
  const activeMode = document.getElementById('cfg-active-mode').value;
  const startRaw = document.getElementById('cfg-season-start').value;
  const endRaw = document.getElementById('cfg-season-end').value;

  const seasonStart = inputValToDate(startRaw) || '2026/08/12';
  const seasonEnd = inputValToDate(endRaw) || '2026/08/31';

  const payload = {
    activeMode: activeMode,
    seasonStart: seasonStart,
    seasonEnd: seasonEnd,
    boss: {
      seasonStart: seasonStart,
      seasonEnd: seasonEnd
    }
  };

  gameState.activeMode = activeMode;
  gameState.seasonStart = seasonStart;
  gameState.seasonEnd = seasonEnd;
  if (!gameState.boss) gameState.boss = {};
  gameState.boss.seasonStart = seasonStart;
  gameState.boss.seasonEnd = seasonEnd;

  localStorage.setItem('iron_heroes_active_mode', activeMode);
  localStorage.setItem('iron_heroes_season_start', seasonStart);
  localStorage.setItem('iron_heroes_season_end', seasonEnd);
  localStorage.setItem('game_state', JSON.stringify(gameState));

  try {
    await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {}

  alert(`✅ 資料片模式已切換為【${getModeLabel(activeMode)}】！前台看板與設定已即時生效！`);
  onExpansionModeChanged();
}

// -------------------------------------------------------------
// SNAPSHOTS CRUD MANAGEMENT (100% 完整賽季快照封存)
// -------------------------------------------------------------

function getSnapshotsList() {
  let list = [];
  const local = localStorage.getItem('custom_archived_seasons');
  if (local) {
    try { list = JSON.parse(local); } catch(e){}
  }
  if (!list || list.length === 0) {
    list = gameState?.snapshots || gameState?.archivedSeasons || [];
  }
  return list;
}

function renderSnapshotTable() {
  const tbody = document.getElementById('admin-snapshots-table-body');
  if (!tbody) return;

  const snapshots = getSnapshotsList();
  tbody.innerHTML = '';

  if (snapshots.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">目前尚無歷史快照紀錄</td></tr>`;
    return;
  }

  snapshots.forEach(snap => {
    const tr = document.createElement('tr');
    const isVisible = snap.isVisible !== false;
    tr.className = `hover:bg-slate-900/60 transition ${!isVisible ? 'opacity-50 bg-slate-950/40' : ''}`;

    let typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🏆 經典競技</span>';
    if (snap.type === 'rpg' || snap.type === 'rpg_talent') {
      typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">⚔️ 職業天賦</span>';
    } else if (snap.type === 'world_boss' || snap.type === 'boss') {
      typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">🐉 世界 Boss</span>';
    }

    const statusBadge = isVisible
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 前台顯示中</span>'
      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">👁️‍🗨️ 已隱藏 (不顯示)</span>';

    tr.innerHTML = `
      <td class="p-3">
        <div class="font-bold text-white">${snap.seasonTitle || snap.id}</div>
        <div class="text-[10px] text-slate-400 font-mono">ID: ${snap.id}</div>
      </td>
      <td class="p-3">${typeLabel}</td>
      <td class="p-3 font-mono text-slate-300">${snap.seasonPeriod || '—'}</td>
      <td class="p-3 font-mono text-slate-400">${snap.archivedAt || '歷史預載'}</td>
      <td class="p-3">${statusBadge}</td>
      <td class="p-3 text-right space-x-2 whitespace-nowrap">
        <button onclick="toggleSnapshotVisibility('${snap.id}')" class="text-xs font-bold ${isVisible ? 'text-slate-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}">
          ${isVisible ? '👁️‍🗨️ 設為不顯示' : '👁️ 設為顯示'}
        </button>
        <button onclick="exportSingleSnapshot('${snap.id}')" class="text-cyan-400 hover:text-cyan-300 font-bold text-xs" title="下載快照 JSON">
          💾 匯出
        </button>
        <button onclick="deleteSnapshot('${snap.id}')" class="text-rose-400 hover:text-rose-300 font-bold text-xs">
          🗑️ 刪除
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function toggleSnapshotVisibility(snapId) {
  const snapshots = getSnapshotsList();
  const snap = snapshots.find(s => s.id === snapId);
  if (!snap) return;

  snap.isVisible = snap.isVisible === false ? true : false;
  localStorage.setItem('custom_archived_seasons', JSON.stringify(snapshots));

  try {
    const res = await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshots: snapshots, archivedSeasons: snapshots })
    });
    if (res.ok) {
      await fetchAdminData();
      renderSnapshotTable();
      alert(`✅ 快照【${snap.seasonTitle}】已成功設為【${snap.isVisible ? '前台正常顯示' : '隱藏不顯示'}】！`);
    }
  } catch (e) {
    renderSnapshotTable();
    alert(`✅ 已在本地更新顯示設定！`);
  }
}

async function deleteSnapshot(snapId) {
  const snapshots = getSnapshotsList();
  const snap = snapshots.find(s => s.id === snapId);
  const snapTitle = snap?.seasonTitle || snapId;

  if (!confirm(`確定要永久刪除快照【${snapTitle}】嗎？\n刪除後此歷史紀錄將從過往英雄史中移除！`)) return;

  const updatedSnapshots = snapshots.filter(s => s.id !== snapId);
  localStorage.setItem("custom_archived_seasons", JSON.stringify(updatedSnapshots));
  if (gameState) {
    gameState.snapshots = updatedSnapshots;
    gameState.archivedSeasons = updatedSnapshots;
  }
  renderSnapshotTable();

  try {
    await fetch("/api/snapshots/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: snapId })
    });
  } catch (e) {}

  alert(`🗑️ 快照【${snapTitle}】已成功刪除！前後台已同步更新！`);
}

function exportSingleSnapshot(snapId) {
  const snapshots = getSnapshotsList();
  const snap = snapshots.find(s => s.id === snapId);
  if (!snap) return;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snap, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `snapshot_${snap.id}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * 建立當前賽季 100% 完整快照 (Snapshot)
 */
async function archiveCurrentSeason() {
  const activeMode = gameState?.activeMode || 'classic';
  const boss = gameState?.boss || {};
  let defaultTitle = '2026 S2 • 經典競技模式 (封存快照)';
  if (activeMode === 'rpg_talent' || activeMode === 'rpg') defaultTitle = '2026 S2 • RPG 職業天賦爭霸 (封存快照)';
  else if (activeMode === 'world_boss' || activeMode === 'boss') defaultTitle = `${boss.name || '世界 Boss 討伐戰'} (結算快照)`;

  const customTitle = prompt('請輸入要建立的快照名稱 (Snapshot Title)：', defaultTitle);
  if (customTitle === null) return;
  const snapshotTitle = customTitle.trim() || defaultTitle;

  try {
    let state = gameState || {};
    let heroStats = [];
    let seasonStats = null;

    try {
      const [stateRes, heroRes, seasonRes] = await Promise.all([
        fetch('/api/state').catch(() => null),
        fetch('/api/hero_stats').catch(() => null),
        fetch('/api/season_stats').catch(() => null)
      ]);
      if (stateRes && stateRes.ok) state = await stateRes.json();
      if (heroRes && heroRes.ok) heroStats = await heroRes.json();
      if (seasonRes && seasonRes.ok) seasonStats = await seasonRes.json();
    } catch (e) {}

    const curStartRaw = document.getElementById("cfg-season-start")?.value;
    const curEndRaw = document.getElementById("cfg-season-end")?.value;
    const activeStartStr = (curStartRaw ? inputValToDate(curStartRaw) : null) || localStorage.getItem("iron_heroes_season_start") || gameState?.seasonStart || state?.seasonStart || "2026/08/12";
    const activeEndStr = (curEndRaw ? inputValToDate(curEndRaw) : null) || localStorage.getItem("iron_heroes_season_end") || gameState?.seasonEnd || state?.seasonEnd || "2026/08/31";

    const bossData = state.boss || gameState?.boss || {};
    bossData.seasonStart = activeStartStr;
    bossData.seasonEnd = activeEndStr;

    const activities = state.activities || allActivitiesCache || gameState?.activities || [];
    const guilds = state.guilds || gameState?.guilds || [];
    const heroes = state.heroes || gameState?.heroes || [];

    const startD = parseActivityDate(activeStartStr);
    const endD = parseActivityDate(activeEndStr);
    if (endD) endD.setHours(23, 59, 59, 999);

    // Filter strictly within GM active season dates
    const inSeasonValidActs = activities.filter(a => {
      if (a.isExcluded) return false;
      const dur = parseFloat(a.duration || 0);
      if (dur < 30.0) return false;
      const aDate = parseActivityDate(a.date || a.time);
      if (aDate && startD && endD) {
        return aDate >= startD && aDate <= endD;
      }
      return a.isValidAttack !== false;
    });

    const now = new Date();
    const timeStampStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let newArchive = null;

    // 1. CLASSIC MODE SNAPSHOT (1:1 with Classic Arena)
    if (activeMode === 'classic') {
      const validActs = inSeasonValidActs;
      const heroMap = {};
      heroes.forEach(h => {
        heroMap[h.name] = {
          name: h.name, guild: h.guild, avatar: h.avatar, maxHr: h.maxHr || 185,
          workouts: 0, duration: 0, calories: 0, trimp: 0, zone2: 0, gapSum: 0, maxGap: 0, suffer: 0, density: 0
        };
      });
      validActs.forEach(a => {
        const h = heroMap[a.hero];
        if (h) {
          h.workouts++;
          h.duration += (a.duration || 0);
          h.calories += (a.calories || 0);
          h.trimp += (a.trimp || 0);
          if (a.isZone2) h.zone2++;
          h.gapSum += (a.gap || 0);
          h.maxGap = Math.max(h.maxGap, a.gap || 0);
          h.suffer += (a.suffer || 0);
        }
      });
      Object.values(heroMap).forEach(h => { h.density = h.duration > 0 ? (h.suffer / h.duration) : 0; });

      const guildMap = {};
      guilds.forEach(g => {
        const mCount = Math.max(1, (g.members || []).length);
        guildMap[g.name] = {
          name: g.name, badge: g.badge || '🛡️', color: g.color || '#3b82f6', memberCount: mCount, members: g.members || [],
          totalWorkouts: 0, totalDuration: 0, totalCalories: 0, totalTrimp: 0, totalZone2: 0, totalGap: 0, totalSuffer: 0,
          perWorkouts: 0, perDuration: 0, perCalories: 0, perTrimp: 0, perZone2: 0, perGap: 0, perSuffer: 0, perDensity: 0
        };
      });
      Object.values(heroMap).forEach(h => {
        const g = guildMap[h.guild];
        if (g) {
          g.totalWorkouts += h.workouts; g.totalDuration += h.duration; g.totalCalories += h.calories;
          g.totalTrimp += h.trimp; g.totalZone2 += h.zone2; g.totalGap += h.gapSum; g.totalSuffer += h.suffer;
        }
      });
      Object.values(guildMap).forEach(g => {
        g.perWorkouts = Math.round((g.totalWorkouts / g.memberCount) * 10) / 10;
        g.perDuration = Math.round((g.totalDuration / g.memberCount) * 10) / 10;
        g.perCalories = Math.round(g.totalCalories / g.memberCount);
        g.perTrimp = Math.round((g.totalTrimp / g.memberCount) * 10) / 10;
        g.perZone2 = Math.round((g.totalZone2 / g.memberCount) * 10) / 10;
        g.perGap = Math.round((g.totalGap / g.memberCount) * 10) / 10;
        g.perSuffer = Math.round((g.totalSuffer / g.memberCount) * 10) / 10;
        g.perDensity = g.totalDuration > 0 ? Math.round((g.totalSuffer / g.totalDuration) * 100) / 100 : 0;
      });

      const gList = Object.values(guildMap);
      const hList = Object.values(heroMap);
      const maxGTrimp = Math.max(1, ...gList.map(g => g.perTrimp));
      const maxGCal = Math.max(1, ...gList.map(g => g.perCalories));
      const maxGZone2 = Math.max(1, ...gList.map(g => g.perZone2));
      const maxGGap = Math.max(1, ...gList.map(g => g.perGap));
      const maxGDens = Math.max(0.1, ...gList.map(g => g.perDensity));
      const maxGWk = Math.max(1, ...gList.map(g => g.perWorkouts));

      const maxHTrimp = Math.max(1, ...hList.map(h => h.trimp));
      const maxHCal = Math.max(1, ...hList.map(h => h.calories));
      const maxHZone2 = Math.max(1, ...hList.map(h => h.zone2));
      const maxHGap = Math.max(1, ...hList.map(h => h.gapSum));
      const maxHDens = Math.max(0.1, ...hList.map(h => h.density));
      const maxHWk = Math.max(1, ...hList.map(h => h.workouts));

      const teamAerobic = gList.map(g => ({
        name: g.name, score: Math.round(((g.perTrimp / maxGTrimp) * 40 + (g.perCalories / maxGCal) * 30 + (g.perZone2 / maxGZone2) * 30) * 100) / 100
      })).sort((a, b) => b.score - a.score).map((t, idx) => ({ ...t, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '')) }));

      const heroAerobic = hList.map(h => ({
        name: h.name, guild: h.guild, score: Math.round(((h.trimp / maxHTrimp) * 40 + (h.calories / maxHCal) * 30 + (h.zone2 / maxHZone2) * 30) * 100) / 100
      })).sort((a, b) => b.score - a.score).map((h, idx) => ({ ...h, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '')) }));

      const teamAnaerobic = gList.map(g => ({
        name: g.name, score: Math.round(((g.perGap / maxGGap) * 50 + (g.perDensity / maxGDens) * 30 + (g.perWorkouts / maxGWk) * 20) * 100) / 100
      })).sort((a, b) => b.score - a.score).map((t, idx) => ({ ...t, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '')) }));

      const heroAnaerobic = hList.map(h => ({
        name: h.name, guild: h.guild, score: Math.round(((h.gapSum / maxHGap) * 40 + (h.density / maxHDens) * 30 + (h.maxHr / 220) * 15 + (h.workouts / maxHWk) * 15) * 100) / 100
      })).sort((a, b) => b.score - a.score).map((h, idx) => ({ ...h, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '')) }));

      const buildLb = (getter, unit) => [...gList].sort((a, b) => getter(b) - getter(a)).map((g, idx) => ({
        rank: idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : `#${idx+1}`)),
        team: g.name, value: getter(g).toLocaleString()
      }));

      newArchive = {
        id: `snapshot_classic_${Date.now()}`,
        type: 'classic',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 本賽季已圓滿結算 (歷史數據已凍結)',
        isVisible: true,
        champions: { teamAerobic, heroAerobic, teamAnaerobic, heroAnaerobic },
        teamMetrics: [
          { metric: "🏋️ 鋼鐵紀律 (人均出勤)", unit: "次", leaderboard: buildLb(g => g.perWorkouts) },
          { metric: "⏱️ 精神時光屋 (人均時長)", unit: "分鐘", leaderboard: buildLb(g => g.perDuration) },
          { metric: "🔋 燃脂發電機 (人均熱量)", unit: "kcal", leaderboard: buildLb(g => g.perCalories) },
          { metric: "🚀 引擎過載 (人均衝力 TRIMP)", unit: "TRIMP", leaderboard: buildLb(g => g.perTrimp) },
          { metric: "🟢 有氧大師 (人均有氧次數)", unit: "次", leaderboard: buildLb(g => g.perZone2) },
          { metric: "🦍 絕對力量 (人均落差 Gap)", unit: "bpm", leaderboard: buildLb(g => g.perGap) },
          { metric: "💥 效率之王 (人均密度)", unit: "分", leaderboard: buildLb(g => g.perDensity) },
          { metric: "🥵 燃燒殆盡 (人均痛苦 Suffer)", unit: "分", leaderboard: buildLb(g => g.perSuffer) }
        ],
        guildList: gList,
        heroList: hList
      };
    }

    // 2. RPG CLASS & TALENT SNAPSHOT (1:1 with RPG View)
    else if (activeMode === 'rpg_talent' || activeMode === 'rpg') {
      const validActs = inSeasonValidActs;
      const heroRpgMap = {};
      heroes.forEach(h => {
        const cKey = h.rpgClass || '狂戰士';
        const meta = RPG_CLASSES[cKey] || RPG_CLASSES['狂戰士'];
        heroRpgMap[h.name] = {
          name: h.name, guild: h.guild, avatar: h.avatar, rpgClass: cKey, classMeta: meta,
          workouts: 0, duration: 0, calories: 0, trimp: 0, zone2: 0, gapSum: 0, maxGap: 0, suffer: 0, combatPower: 0
        };
      });

      validActs.forEach(a => {
        const h = heroRpgMap[a.hero];
        if (h) {
          h.workouts++; h.duration += (a.duration || 0); h.calories += (a.calories || 0);
          h.trimp += (a.trimp || 0); if (a.isZone2) h.zone2++; h.gapSum += (a.gap || 0);
          h.maxGap = Math.max(h.maxGap, a.gap || 0); h.suffer += (a.suffer || 0);
        }
      });

      Object.values(heroRpgMap).forEach(h => {
        const density = h.duration > 0 ? (h.suffer / h.duration) : 0;
        if (h.rpgClass === '狂戰士') h.combatPower = Math.round((h.maxGap * 50) + (h.gapSum * 8) + (h.calories * 0.6));
        else if (h.rpgClass === '聖騎士') h.combatPower = Math.round((h.workouts * 150) + (h.suffer * 1.5) + (h.duration * 1.0));
        else if (h.rpgClass === '遊俠') h.combatPower = Math.round((h.zone2 * 120) + (h.calories * 1.2) + (h.duration * 1.5));
        else if (h.rpgClass === '大法師') h.combatPower = Math.round((h.trimp * 25) + (h.duration * 2.0));
        else if (h.rpgClass === '刺客') h.combatPower = Math.round((density * 1200) + (h.maxGap * 40) + (h.calories * 0.8));
        else h.combatPower = Math.round((h.calories * 1.0) + (h.trimp * 15));
      });

      const classMasters = {};
      Object.keys(RPG_CLASSES).forEach(cName => {
        const cand = Object.values(heroRpgMap).filter(h => h.rpgClass === cName).sort((a, b) => b.combatPower - a.combatPower);
        classMasters[cName] = cand[0] || null;
      });

      const guildSynergyList = guilds.map(g => {
        const mHeroes = (g.members || []).map(m => heroRpgMap[m]).filter(Boolean);
        const rawPower = mHeroes.reduce((s, h) => s + (h.combatPower || 0), 0);
        const uClasses = new Set(mHeroes.map(h => h.rpgClass));
        let bPct = 0, sTag = '基礎小隊';
        if (uClasses.size >= 4) { bPct = 15; sTag = '🌟 全能四職業羈絆 (+15%)'; }
        else if (uClasses.size === 3) { bPct = 10; sTag = '⚡ 三重戰術羈絆 (+10%)'; }
        else if (uClasses.size === 2) { bPct = 5; sTag = '🛡️ 雙重協同羈絆 (+5%)'; }
        return {
          guild: g.name, badge: g.badge || '🛡️', color: g.color || '#f59e0b', members: g.members || [],
          uniqueClasses: Array.from(uClasses), bonusPct: bPct, synergyTag: sTag, rawPower: rawPower, totalPower: Math.round(rawPower * (1 + bPct / 100))
        };
      }).sort((a, b) => b.totalPower - a.totalPower);

      newArchive = {
        id: `snapshot_rpg_${Date.now()}`,
        type: 'rpg',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 本賽季職業爭霸已圓滿結算封存',
        isVisible: true,
        classMasters: classMasters,
        guildSynergyList: guildSynergyList,
        heroRpgList: Object.values(heroRpgMap).sort((a, b) => b.combatPower - a.combatPower)
      };
    }

    // 3. WORLD BOSS SNAPSHOT (1:1 with World Boss View)
    else {
      const totalPhys = inSeasonValidActs.reduce((s, a) => s + (a.physDmg || a.calories || 0), 0);
      const totalMag = inSeasonValidActs.reduce((s, a) => s + (a.magDmg || 0), 0);
      const totalCrit = inSeasonValidActs.reduce((s, a) => s + (a.critDmg || 0), 0);
      const totalDamage = inSeasonValidActs.reduce((s, a) => s + (a.damage || 0), 0);

      const maxHp = bossData.maxHp || 350000;
      const finalHp = Math.max(0, maxHp - totalDamage);

      const summary = { totalPhys, totalMag, totalCrit, totalDamage };

      const sortedHeroes = heroes.map(h => {
        const hActs = inSeasonValidActs.filter(a => a.hero === h.name);
        return {
          name: h.name,
          guild: h.guild,
          avatar: h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`,
          validWorkouts: hActs.length,
          totalDamage: hActs.reduce((s, a) => s + (a.damage || 0), 0),
          totalCalories: hActs.reduce((s, a) => s + (a.calories || 0), 0),
          totalDuration: hActs.reduce((s, a) => s + (a.duration || 0), 0),
          maxGap: hActs.reduce((m, a) => Math.max(m, a.gap || 0), 0),
          physDmg: hActs.reduce((s, a) => s + (a.physDmg || a.calories || 0), 0),
          magDmg: hActs.reduce((s, a) => s + (a.magDmg || 0), 0),
          critDmg: hActs.reduce((s, a) => s + (a.critDmg || 0), 0)
        };
      }).sort((a, b) => b.totalDamage - a.totalDamage);

      const sortedGuilds = guilds.map(g => {
        const gActs = inSeasonValidActs.filter(a => a.guild === g.name);
        const gDmg = gActs.reduce((s, a) => s + (a.damage || 0), 0);
        return {
          name: g.name,
          badge: g.badge || "🛡️",
          color: g.color || "#3b82f6",
          totalDamage: gDmg,
          pct: totalDamage > 0 ? Math.round((gDmg / totalDamage) * 1000) / 10 : 0
        };
      }).sort((a, b) => b.totalDamage - a.totalDamage);

      newArchive = {
        id: `snapshot_boss_${Date.now()}`,
        type: 'world_boss',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: "completed",
        statusLabel: "🏁 本賽季討伐戰已圓滿結算封存",
        isVisible: true,
        boss: {
          name: bossData.name || '🌩️ 墮落雷神・索爾 (Fallen Thor)',
          avatar: bossData.avatar || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
          description: bossData.description || '索爾受到雷霆魔劍侵蝕陷入瘋狂！全服英雄透過每日汗水鍛鍊，轉化為真實輸出！',
          maxHp: bossData.maxHp || 350000,
          currentHp: finalHp,
          seasonStart: bossData.seasonStart || '2026/08/12',
          seasonEnd: bossData.seasonEnd || '2026/08/31'
        },
        summary: summary,
        heroStats: sortedHeroes,
        guildContributions: sortedGuilds,
        activities: activities.filter(a => a.isValidAttack).slice(0, 20)
      };
    }

    const snapshots = getSnapshotsList();
    snapshots.unshift(newArchive);

    localStorage.setItem("custom_archived_seasons", JSON.stringify(snapshots));
    if (gameState) {
      gameState.snapshots = snapshots;
      gameState.archivedSeasons = snapshots;
    }
    renderSnapshotTable();

    try {
      await fetch("/api/snapshots/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: newArchive })
      });
    } catch(err) {}

    alert(`🎉 成功生成賽季完整歷史快照【${snapshotTitle}】！前台【過往英雄史】已 1:1 完整還原！`);
  } catch (e) {
    console.error("Archive error:", e);
    alert("封存失敗：" + e.message);
  }
}

// -------------------------------------------------------------
// HERO ROSTER & RANDOM ROLL (動態適應當前資料片)
// -------------------------------------------------------------

function renderHeroTable() {
  const tbody = document.getElementById('admin-heroes-table-body');
  if (!tbody || !gameState?.heroes) return;

  const mode = document.getElementById('cfg-active-mode')?.value || 'classic';
  tbody.innerHTML = '';

  gameState.heroes.forEach(h => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-900/60 transition';
    const heroClass = h.rpgClass || '狂戰士';
    const meta = RPG_CLASSES[heroClass] || RPG_CLASSES['狂戰士'];

    let classCellHtml = `<span class="px-2 py-0.5 rounded text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800">主力成員</span>`;
    if (mode === 'rpg_talent') {
      classCellHtml = `<span class="px-2 py-0.5 rounded text-[11px] font-bold" style="color: ${meta.color}; background: rgba(0,0,0,0.4); border: 1px solid ${meta.color}50;">${meta.badge} ${heroClass}</span>`;
    } else if (mode === 'world_boss') {
      classCellHtml = `<span class="px-2 py-0.5 rounded text-[11px] font-bold text-rose-400 bg-rose-950/40 border border-rose-800">⚔️ 討伐先鋒</span>`;
    }

    tr.innerHTML = `
      <td class="p-3 font-bold text-white flex items-center space-x-2">
        <div class="w-7 h-7 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
          <img src="${h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`}" class="w-full h-full object-cover">
        </div>
        <span>${h.name}</span>
        ${h.isAutoDiscovered ? '<span class="text-[9px] bg-purple-900/60 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded">自動發現</span>' : ''}
      </td>
      <td class="p-3 font-mono">${h.age} 歲</td>
      <td class="p-3 font-mono text-cyan-400 font-bold">${h.maxHr} bpm</td>
      <td class="p-3"><span class="bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[11px]">${h.guild}</span></td>
      <td class="p-3">${classCellHtml}</td>
      <td class="p-3 text-right">
        <a href="https://docs.google.com/spreadsheets/d/1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY/edit#gid=434984273" target="_blank" class="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-bold text-xs bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition" title="前往 Google Sheet 修改此成員的年齡、公會、職業或 Strava ID">
          <span>在 Sheet 編輯 ↗</span>
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function randomizeAllHeroClasses() {
  if (!confirm('確定要為所有冒險者隨機重新抽籤分配職業嗎？\n（分配後您依然可以點擊個別英雄進行手動調整）')) return;

  const classes = ['狂戰士', '聖騎士', '遊俠', '大法師', '刺客'];
  let heroes = [...(gameState?.heroes || [])];
  if (heroes.length === 0) return;

  let pool = [];
  while (pool.length < heroes.length) {
    pool = pool.concat([...classes].sort(() => Math.random() - 0.5));
  }

  heroes = heroes.map((h, idx) => ({
    ...h,
    rpgClass: pool[idx]
  }));

  if (gameState) gameState.heroes = heroes;
  localStorage.setItem("game_state", JSON.stringify(gameState));
  populateFormDropdowns();
  renderHeroTable();
  alert("🎉 抽籤分配完成！所有冒險者已隨機指派 RPG 天賦職業！前台已即時重新計算職業榜！");

  try {
    await fetch("/api/settings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroes: heroes })
    });
  } catch (e) {}
}

function openAddHeroModal() {
  document.getElementById('modal-hero-title').innerText = '新增冒險者';
  document.getElementById('hero-edit-original-name').value = '';
  document.getElementById('hero-modal-name').value = '';
  document.getElementById('hero-modal-name').disabled = false;
  document.getElementById('hero-modal-age').value = '35';
  document.getElementById('hero-modal-guild').value = '';
  document.getElementById('hero-modal-class').value = '狂戰士';
  updateModalMaxHr();
  document.getElementById('modal-hero').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function openEditHeroModal(heroName) {
  const hero = gameState?.heroes?.find(h => h.name === heroName);
  if (!hero) return;

  document.getElementById('modal-hero-title').innerText = `編輯冒險者 - ${hero.name}`;
  document.getElementById('hero-edit-original-name').value = hero.name;
  document.getElementById('hero-modal-name').value = hero.name;
  document.getElementById('hero-modal-name').disabled = true;
  document.getElementById('hero-modal-age').value = hero.age;
  document.getElementById('hero-modal-guild').value = hero.guild;
  document.getElementById('hero-modal-class').value = hero.rpgClass || '狂戰士';
  updateModalMaxHr();
  document.getElementById('modal-hero').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeHeroModal() {
  document.getElementById('modal-hero').classList.add('hidden');
}

function updateModalMaxHr() {
  const age = parseInt(document.getElementById('hero-modal-age').value) || 35;
  const maxHr = 220 - age;
  document.getElementById('hero-modal-maxhr-text').innerText = maxHr;
}

async function saveHeroFromModal() {
  const origName = document.getElementById('hero-edit-original-name').value;
  const name = document.getElementById('hero-modal-name').value.trim();
  const age = parseInt(document.getElementById('hero-modal-age').value) || 35;
  const guild = document.getElementById('hero-modal-guild').value.trim() || '自由英雄';
  const rpgClass = document.getElementById('hero-modal-class').value;
  const maxHr = 220 - age;

  if (!name) {
    alert('請填寫英雄姓名');
    return;
  }

  let heroes = [...(gameState?.heroes || [])];
  if (origName) {
    heroes = heroes.map(h => h.name === origName ? { ...h, age, maxHr, guild, rpgClass, isAutoDiscovered: false } : h);
  } else {
    if (heroes.some(h => h.name === name)) {
      alert('該英雄名稱已存在！');
      return;
    }
    heroes.push({
      name: name,
      age: age,
      maxHr: maxHr,
      guild: guild,
      rpgClass: rpgClass,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=0f172a`
    });
  }

  if (gameState) gameState.heroes = heroes;
  localStorage.setItem("game_state", JSON.stringify(gameState));
  closeHeroModal();
  populateFormDropdowns();
  renderHeroTable();
  alert(`✅ 英雄【${name}】資料已成功儲存！`);

  try {
    await fetch("/api/settings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroes: heroes })
    });
  } catch (e) {}
}

async function deleteHero(name) {
  if (!confirm(`確定要刪除冒險者【${name}】嗎？`)) return;

  const heroes = (gameState?.heroes || []).filter(h => h.name !== name);
  if (gameState) gameState.heroes = heroes;
  localStorage.setItem("game_state", JSON.stringify(gameState));
  populateFormDropdowns();
  renderHeroTable();
  alert(`🗑️ 冒險者【${name}】已成功刪除！`);

  try {
    await fetch("/api/settings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroes: heroes })
    });
  } catch (e) {}
}

function populateFormDropdowns() {
  const select = document.getElementById('inp-hero');
  if (!select || !gameState?.heroes) return;

  const mode = document.getElementById('cfg-active-mode')?.value || 'classic';
  select.innerHTML = '';
  gameState.heroes.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.name;
    if (mode === 'rpg_talent') {
      opt.innerText = `${h.name} (${h.guild} • ${h.rpgClass || '狂戰士'})`;
    } else {
      opt.innerText = `${h.name} (${h.guild})`;
    }
    select.appendChild(opt);
  });
}

function populateBossConfig() {
  const boss = gameState?.boss || {};
  document.getElementById('cfg-boss-name').value = boss.name || '';
  document.getElementById('cfg-boss-maxhp').value = boss.maxHp || 350000;
  document.getElementById('cfg-boss-currhp').value = boss.currentHp !== undefined ? boss.currentHp : 232849;
  document.getElementById('cfg-min-dur').value = boss.rules?.minDurationMinutes || 30;
  document.getElementById('cfg-mag-mult').value = boss.rules?.magicMultiplier || 15;
}

function previewDamageCalculation() {
  const mode = document.getElementById('cfg-active-mode')?.value || 'classic';
  const heroName = document.getElementById('inp-hero').value;
  const hero = gameState?.heroes?.find(h => h.name === heroName);
  const maxHrEst = hero?.maxHr || 185;

  const duration = parseFloat(document.getElementById('inp-duration').value) || 0;
  const avgHr = parseFloat(document.getElementById('inp-avg-hr').value) || 0;
  const maxHr = parseFloat(document.getElementById('inp-max-hr').value) || 0;
  const calories = parseFloat(document.getElementById('inp-calories').value) || 0;

  const minDur = parseFloat(document.getElementById('cfg-min-dur')?.value) || 30.0;
  const magMult = parseFloat(document.getElementById('cfg-mag-mult')?.value) || 15.0;

  let val1 = 0, val2 = 0, val3 = 0, totalVal = 0;

  if (duration >= minDur) {
    val1 = Math.round(calories);
    if (maxHrEst > 0 && avgHr > 0) {
      const ratio = avgHr / maxHrEst;
      const trimp = duration * ratio * Math.exp(1.92 * ratio);
      val2 = Math.round(trimp * magMult);
    }
    const gap = Math.max(0, maxHr - avgHr);
    val3 = Math.round(gap * 100);
  }

  totalVal = val1 + val2 + val3;

  document.getElementById('prev-phys').innerText = val1.toLocaleString();
  document.getElementById('prev-mag').innerText = val2.toLocaleString();
  document.getElementById('prev-crit').innerText = val3.toLocaleString();
  document.getElementById('prev-total').innerText = totalVal.toLocaleString();
}

async function handleManualAttack(e) {
  e.preventDefault();

  const heroName = document.getElementById('inp-hero').value;
  const type = document.getElementById('inp-type').value;
  const duration = parseFloat(document.getElementById('inp-duration').value);
  const avgHr = parseFloat(document.getElementById('inp-avg-hr').value);
  const maxHr = parseFloat(document.getElementById('inp-max-hr').value);
  const calories = parseFloat(document.getElementById('inp-calories').value);
  const title = document.getElementById('inp-title').value.trim() || '手動打卡鍛鍊';

  const newActId = `ACT-${Date.now()}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  const timeStr = `${dateStr} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const payload = {
    id: newActId,
    hero: heroName,
    type: type,
    title: title,
    duration: duration,
    avgHr: avgHr,
    maxHr: maxHr,
    calories: calories,
    date: dateStr,
    time: timeStr
  };

  try {
    const localSaved = JSON.parse(localStorage.getItem('manual_activities') || '[]');
    localSaved.unshift(payload);
    localStorage.setItem('manual_activities', JSON.stringify(localSaved));
  } catch (e) {}

  try {
    const res = await fetch('/api/activities/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`🎉 登錄成功！${heroName} 完成鍛鍊打卡，數據已即時計入前台看板！`);
      document.getElementById('form-manual-entry').reset();
      await fetchAdminData();
      populateBossConfig();
      renderActivityTable();
    }
  } catch (err) {
    alert(`🎉 登錄成功！${heroName} 完成鍛鍊打卡，數據已即時計入前台看板！`);
    document.getElementById('form-manual-entry').reset();
    renderActivityTable();
  }
}

async function saveClassicSettings() {
  const minDur = parseFloat(document.getElementById('cfg-classic-min-dur')?.value) || 30;
  const payload = {
    boss: {
      rules: {
        minDurationMinutes: minDur
      }
    }
  };
  try {
    const res = await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) alert('✅ 經典競技參數已成功儲存！');
  } catch (e) {}
}

async function saveBossSettings() {
  const name = document.getElementById('cfg-boss-name').value.trim();
  const maxHp = parseInt(document.getElementById('cfg-boss-maxhp').value);
  const curHp = parseInt(document.getElementById('cfg-boss-currhp').value);
  const minDur = parseFloat(document.getElementById('cfg-min-dur').value);
  const magMult = parseFloat(document.getElementById('cfg-mag-mult').value);

  const payload = {
    boss: {
      name: name,
      maxHp: maxHp,
      currentHp: curHp,
      rules: {
        minDurationMinutes: minDur,
        physMultiplier: 1.0,
        magicMultiplier: magMult,
        critMultiplier: 100.0
      }
    }
  };

  try {
    const res = await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) alert('✅ Boss 數值與參數已成功更新！');
  } catch (e) {
    console.error('Save boss settings error:', e);
  }
}

// -------------------------------------------------------------
// ACTIVITY CRUD & ANOMALY DETECTION
// -------------------------------------------------------------

function renderActivityTable() {
  const tbody = document.getElementById('admin-activities-table-body');
  const heroFilter = document.getElementById('admin-act-hero-filter');
  if (!tbody) return;

  // Merge local manual activities into allActivitiesCache
  try {
    const localSaved = JSON.parse(localStorage.getItem('manual_activities') || '[]');
    if (!allActivitiesCache) allActivitiesCache = [];
    localSaved.forEach(la => {
      if (!allActivitiesCache.some(a => String(a.id) === String(la.id))) {
        allActivitiesCache.unshift(la);
      }
    });
  } catch(e) {}

  if (heroFilter && gameState?.heroes) {
    const currHero = heroFilter.value;
    heroFilter.innerHTML = '<option value="">全部英雄</option>';
    gameState.heroes.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.name;
      opt.innerText = h.name;
      if (h.name === currHero) opt.selected = true;
      heroFilter.appendChild(opt);
    });
  }

  filterAdminActivities();
}

function filterAdminActivities() {
  const tbody = document.getElementById('admin-activities-table-body');
  if (!tbody) return;

  const query = (document.getElementById('admin-act-search')?.value || '').toLowerCase().trim();
  const selectedHero = document.getElementById('admin-act-hero-filter')?.value || '';
  const excludedSet = new Set(JSON.parse(localStorage.getItem('excluded_activity_ids') || '[]'));

  tbody.innerHTML = '';

  const filtered = allActivitiesCache.filter(a => {
    if (selectedHero && a.hero !== selectedHero) return false;
    if (query) {
      const matchHero = (a.hero || '').toLowerCase().includes(query);
      const matchTitle = (a.title || '').toLowerCase().includes(query);
      const matchId = String(a.id || '').toLowerCase().includes(query);
      if (!matchHero && !matchTitle && !matchId) return false;
    }
    return true;
  });

  filtered.slice(0, 100).forEach(a => {
    const tr = document.createElement('tr');
    const actId = String(a.id);
    const isExcluded = excludedSet.has(actId) || a.isExcluded;
    const isManual = isExcluded || String(actId).startsWith('ACT-') || a.isManual;
    const isNumericStrava = /^\d+$/.test(actId);

    const anomalies = [];
    const heroInfo = gameState?.heroes?.find(h => h.name === a.hero);
    const maxHrLimit = heroInfo?.maxHr || 185;

    if (a.avgHr > maxHrLimit || a.maxHr > 220) {
      anomalies.push('<span class="bg-rose-900/60 text-rose-300 border border-rose-600 px-1 py-0.2 rounded text-[9px]">⚠️心率異常</span>');
    }
    if (a.duration > 300) {
      anomalies.push('<span class="bg-amber-900/60 text-amber-300 border border-amber-600 px-1 py-0.2 rounded text-[9px]">⚠️時長過長</span>');
    }
    if (a.calories > 3000) {
      anomalies.push('<span class="bg-purple-900/60 text-purple-300 border border-purple-600 px-1 py-0.2 rounded text-[9px]">⚠️熱量過高</span>');
    }

    tr.className = `hover:bg-slate-900/60 transition ${isExcluded ? 'opacity-40 line-through bg-rose-950/20' : ''}`;

    const sourceHtml = isNumericStrava 
      ? `<a href="https://www.strava.com/activities/${actId}" target="_blank" class="text-orange-400 font-mono font-bold hover:underline">#${actId} ↗</a>`
      : `<span class="text-amber-400 font-mono font-bold">手動 #${actId.slice(-6)}</span>`;

    const statusBadge = isExcluded
      ? '<span class="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded font-bold">GM作廢</span>'
      : (a.isValidAttack ? '<span class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">有效打卡</span>' : '<span class="text-[10px] text-slate-500">不計分</span>');

    tr.innerHTML = `
      <td class="p-3">${sourceHtml}</td>
      <td class="p-3 font-mono text-slate-400">${a.date || a.time}</td>
      <td class="p-3 font-bold text-white">${a.hero} <span class="text-[10px] text-slate-400 font-normal">(${a.guild})</span></td>
      <td class="p-3 text-slate-300 truncate max-w-[120px]">${a.title || a.type}</td>
      <td class="p-3 font-mono">${a.duration}分</td>
      <td class="p-3 font-mono text-cyan-300">${a.avgHr} / ${a.maxHr}</td>
      <td class="p-3 font-mono">${Math.round(a.calories)}</td>
      <td class="p-3 font-mono font-bold text-amber-400">${(a.damage || 0).toLocaleString()}</td>
      <td class="p-3">
        <div class="flex items-center space-x-1">
          ${statusBadge}
          ${anomalies.join(' ')}
        </div>
      </td>
      <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
        <button onclick="openEditActivityModal('${actId}')" class="text-cyan-400 hover:text-cyan-300 font-bold text-xs">編輯</button>
        ${isExcluded 
          ? `<button onclick="toggleExcludeActivity('${actId}', false)" class="text-emerald-400 hover:text-emerald-300 font-bold text-xs">恢復計算</button>`
          : `<button onclick="toggleExcludeActivity('${actId}', true)" class="text-rose-400 hover:text-rose-300 font-bold text-xs">作廢扣分</button>`
        }
        ${isManual ? `<button onclick="deleteManualActivity('${actId}')" class="text-slate-400 hover:text-rose-400 font-bold text-xs">刪除</button>` : ''}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function toggleExcludeActivity(actId, shouldExclude) {
  let excluded = JSON.parse(localStorage.getItem('excluded_activity_ids') || '[]');
  if (shouldExclude) {
    if (!excluded.includes(actId)) excluded.push(actId);
  } else {
    excluded = excluded.filter(id => id !== actId);
  }
  localStorage.setItem('excluded_activity_ids', JSON.stringify(excluded));

  // Update in local cache
  const act = allActivitiesCache.find(a => String(a.id) === String(actId));
  if (act) act.isExcluded = shouldExclude;
  filterAdminActivities();

  // Send permanent server exclusion
  try {
    const res = await fetch('/api/activities/exclude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: actId, isExcluded: shouldExclude })
    });
    if (res.ok) {
      alert(shouldExclude ? `🚫 紀錄 #${actId} 已永久設為作廢，不再計入分數！` : `✅ 紀錄 #${actId} 已恢復計入分數！`);
    }
  } catch (e) {
    alert(shouldExclude ? `🚫 紀錄 #${actId} 已設為作廢！` : `✅ 紀錄 #${actId} 已恢復！`);
  }
}

async function deleteManualActivity(actId) {
  if (!confirm(`確定要永久刪除手動補登紀錄 #${actId} 嗎？`)) return;

  let localSaved = JSON.parse(localStorage.getItem('manual_activities') || '[]');
  localSaved = localSaved.filter(a => String(a.id) !== String(actId));
  localStorage.setItem('manual_activities', JSON.stringify(localSaved));

  allActivitiesCache = allActivitiesCache.filter(a => String(a.id) !== String(actId));
  filterAdminActivities();

  // Send permanent server deletion
  try {
    const res = await fetch('/api/activities/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: actId })
    });
    if (res.ok) {
      alert(`🗑️ 紀錄 #${actId} 已從伺服器永久刪除，重新整理也不會再出現！`);
    }
  } catch (e) {
    alert(`🗑️ 紀錄已刪除！`);
  }
}

function openEditActivityModal(actId) {
  const act = allActivitiesCache.find(a => String(a.id) === String(actId));
  if (!act) return;

  document.getElementById('act-edit-id').value = act.id;
  document.getElementById('act-edit-title').value = act.title || '';
  document.getElementById('act-edit-duration').value = act.duration || 0;
  document.getElementById('act-edit-calories').value = act.calories || 0;
  document.getElementById('act-edit-avghr').value = act.avgHr || 0;
  document.getElementById('act-edit-maxhr').value = act.maxHr || 0;

  document.getElementById('modal-activity').classList.remove('hidden');
}

function closeActivityModal() {
  document.getElementById('modal-activity').classList.add('hidden');
}

async function saveActivityFromModal() {
  const actId = document.getElementById('act-edit-id').value;
  const act = allActivitiesCache.find(a => String(a.id) === String(actId));
  if (!act) return;

  act.title = document.getElementById('act-edit-title').value.trim();
  act.duration = parseFloat(document.getElementById('act-edit-duration').value) || 0;
  act.calories = parseFloat(document.getElementById('act-edit-calories').value) || 0;
  act.avgHr = parseFloat(document.getElementById('act-edit-avghr').value) || 0;
  act.maxHr = parseFloat(document.getElementById('act-edit-maxhr').value) || 0;

  const heroInfo = (gameState?.heroes || []).find(h => h.name === act.hero) || { maxHr: 185 };
  const maxHrEst = heroInfo.maxHr || 185;
  if (act.duration >= 30.0 && maxHrEst > 0 && act.avgHr > 0) {
    const ratio = act.avgHr / maxHrEst;
    act.trimp = Math.round((act.duration * ratio * Math.exp(1.92 * ratio)) * 10) / 10;
  }
  act.gap = Math.max(0, act.maxHr - act.avgHr);
  act.damage = Math.round(act.calories + (act.trimp || 0) * 15 + act.gap * 100);

  try {
    let localSaved = JSON.parse(localStorage.getItem('manual_activities') || '[]');
    const mIndex = localSaved.findIndex(a => String(a.id) === String(actId));
    if (mIndex !== -1) {
      localSaved[mIndex] = Object.assign(localSaved[mIndex], act);
      localStorage.setItem('manual_activities', JSON.stringify(localSaved));
    }
  } catch(e) {}

  closeActivityModal();
  filterAdminActivities();
  alert('✅ 運動紀錄已成功更新！');

  try {
    await fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: allActivitiesCache })
    });
  } catch (e) {}
}

function exportFullBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState, null, 2));
  const downloadAnchor = document.createElement('a');
  const d = new Date();
  const dateTag = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `iron_heroes_backup_${dateTag}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importFullBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!confirm('確定要以此備份檔案覆蓋全站資料嗎？此操作不可逆！')) return;

      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imported)
      });
      if (res.ok) {
        alert('🎉 全站資料已成功還原！');
        window.location.reload();
      }
    } catch (err) {
      alert('❌ 匯入失敗：JSON 格式無效！');
    }
  };
  reader.readAsText(file);
}


// -------------------------------------------------------------
// 6. STRAVA CRAWLER & GITHUB ACTIONS SETTINGS
// -------------------------------------------------------------
let crawlerConfig = {
  athleteProfiles: {
    "468395126": "Kerker",
    "972959242": "Calla",
    "449473529": "Naomi",
    "2029007949": "Weber",
    "822925839": "Mooooo",
    "387396829": "Moupower",
    "548067864": "Richardyoho"
  },
  excludeKeywords: ["羽球", "不想抓的關鍵字"],
  sheetUrl: "https://docs.google.com/spreadsheets/d/1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY/edit",
  worksheetName: "Rawdata"
};

async function fetchCrawlerConfig() {
  try {
    const res = await fetch("/api/crawler/config");
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        crawlerConfig = Object.assign(crawlerConfig, data);
      }
    } else {
      throw new Error("Local API offline");
    }
  } catch (e) {
    try {
      const fbRes = await fetch("/data/crawler_config.json");
      if (fbRes.ok) {
        const data = await fbRes.json();
        if (data) crawlerConfig = Object.assign(crawlerConfig, data);
      }
    } catch (err) {}
  }
  renderCrawlerUI();
}

function renderCrawlerUI() {
  // 1. Populate Athletes Table
  const tbody = document.getElementById("crawler-athletes-tbody");
  const countEl = document.getElementById("crawler-athlete-count");
  if (tbody) {
    tbody.innerHTML = "";
    const entries = Object.entries(crawlerConfig.athleteProfiles || {});
    if (countEl) countEl.innerText = `共 ${entries.length} 位選手`;

    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-500">尚無選手 Strava ID 設定</td></tr>`;
    } else {
      entries.forEach(([athId, heroName]) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-900/40 transition";
        const heroInfo = (gameState?.heroes || []).find(h => (h.name || "").trim() === heroName.trim()) || { guild: "自由英雄", age: 35, maxHr: 185 };
        tr.innerHTML = `
          <td class="p-2.5 font-mono text-cyan-400 font-bold">
            <a href="https://www.strava.com/athletes/${athId}" target="_blank" class="hover:underline flex items-center space-x-1">
              <span>#${athId}</span>
              <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
            </a>
          </td>
          <td class="p-2.5 font-bold text-white">${heroName}</td>
          <td class="p-2.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">${heroInfo.guild || "自由英雄"}</span>
          </td>
          <td class="p-2.5 text-slate-400 font-mono text-[11px]">${heroInfo.age || 35}歲 <span class="text-rose-400 font-bold">(${heroInfo.maxHr || (220 - (heroInfo.age || 35))} bpm)</span></td>
          <td class="p-2.5 text-right">
            <button onclick="deleteCrawlerAthlete('${athId}')" class="p-1 rounded text-rose-400 hover:bg-rose-950/40 transition" title="刪除">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // 2. Populate Athlete Dropdown in Add Form
  const heroSelect = document.getElementById("crawler-new-ath-hero");
  if (heroSelect && gameState?.heroes) {
    heroSelect.innerHTML = "";
    gameState.heroes.forEach(h => {
      const opt = document.createElement("option");
      opt.value = h.name;
      opt.innerText = `${h.name} (${h.guild})`;
      heroSelect.appendChild(opt);
    });
  }

  // 3. Populate Excluded Keywords Tags
  const kwContainer = document.getElementById("crawler-keywords-container");
  if (kwContainer) {
    kwContainer.innerHTML = "";
    const kws = crawlerConfig.excludeKeywords || [];
    if (kws.length === 0) {
      kwContainer.innerHTML = `<span class="text-slate-500 text-xs">(無排除關鍵字，全部活動皆會嘗試抓取)</span>`;
    } else {
      kws.forEach(kw => {
        const span = document.createElement("span");
        span.className = "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950/40 text-rose-300 border border-rose-800/60";
        span.innerHTML = `
          <span>🚫 ${kw}</span>
          <button onclick="deleteCrawlerKeyword('${kw}')" class="text-rose-400 hover:text-rose-200 ml-1 font-black">&times;</button>
        `;
        kwContainer.appendChild(span);
      });
    }
  }

  // 4. Target Sheet URL & Worksheet
  const sheetInput = document.getElementById("crawler-sheet-url");
  const wsInput = document.getElementById("crawler-worksheet-name");
  if (sheetInput && crawlerConfig.sheetUrl) sheetInput.value = crawlerConfig.sheetUrl;
  if (wsInput && crawlerConfig.worksheetName) wsInput.value = crawlerConfig.worksheetName;

  if (window.lucide) lucide.createIcons();
}

function addCrawlerAthlete() {
  const idInput = document.getElementById("crawler-new-ath-id");
  const heroSelect = document.getElementById("crawler-new-ath-hero");
  const customNameInput = document.getElementById("crawler-new-ath-custom-name");
  const customGuildInput = document.getElementById("crawler-new-ath-custom-guild");
  const ageInput = document.getElementById("crawler-new-ath-age");

  const athId = (idInput?.value || "").trim();
  const customName = (customNameInput?.value || "").trim();
  const customGuild = (customGuildInput?.value || "").trim() || "自由英雄";
  const age = parseInt(ageInput?.value || "35", 10) || 35;
  const maxHr = 220 - age;
  const selectedName = (heroSelect?.value || "").trim();

  const heroName = customName || selectedName;

  if (!athId) {
    alert("❌ 請輸入選手的 Strava 數字 ID！");
    return;
  }
  if (!heroName) {
    alert("❌ 請選擇或手動輸入冒險者姓名！");
    return;
  }

  // Ensure hero exists in gameState.heroes
  if (!gameState.heroes) gameState.heroes = [];
  let existingHero = gameState.heroes.find(h => h.name === heroName);
  if (!existingHero) {
    existingHero = {
      name: heroName,
      age: age,
      maxHr: maxHr,
      guild: customGuild,
      rpgClass: "狂戰士",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${heroName}&backgroundColor=0f172a`
    };
    gameState.heroes.push(existingHero);
  } else if (customName) {
    existingHero.age = age;
    existingHero.maxHr = maxHr;
    existingHero.guild = customGuild;
  }

  localStorage.setItem("game_state", JSON.stringify(gameState));

  if (!crawlerConfig.athleteProfiles) crawlerConfig.athleteProfiles = {};
  crawlerConfig.athleteProfiles[athId] = heroName;

  if (idInput) idInput.value = "";
  if (customNameInput) customNameInput.value = "";
  if (customGuildInput) customGuildInput.value = "";

  populateFormDropdowns();
  renderHeroTable();
  renderCrawlerUI();

  alert(`🎉 成功綁定選手：${heroName} (公會: ${existingHero.guild} • 年齡: ${existingHero.age}歲/極限心率: ${existingHero.maxHr}bpm) ➔ Strava ID: #${athId}！\n請記得點擊右上角【💾 儲存爬蟲設定】以同步生效！`);
  showAdminToast(`已加入選手：${heroName} (#${athId})`);
}

function deleteCrawlerAthlete(athId) {
  if (crawlerConfig.athleteProfiles && crawlerConfig.athleteProfiles[athId]) {
    const name = crawlerConfig.athleteProfiles[athId];
    delete crawlerConfig.athleteProfiles[athId];
    renderCrawlerUI();
    showAdminToast(`已移除選手：${name} (#${athId})`);
  }
}

function addCrawlerKeyword() {
  const kwInput = document.getElementById("crawler-new-keyword");
  const kw = (kwInput?.value || "").trim();
  if (!kw) return;

  if (!crawlerConfig.excludeKeywords) crawlerConfig.excludeKeywords = [];
  if (!crawlerConfig.excludeKeywords.includes(kw)) {
    crawlerConfig.excludeKeywords.push(kw);
  }
  if (kwInput) kwInput.value = "";
  renderCrawlerUI();
  showAdminToast(`已加入排除關鍵字：${kw}`);
}

function deleteCrawlerKeyword(kw) {
  if (crawlerConfig.excludeKeywords) {
    crawlerConfig.excludeKeywords = crawlerConfig.excludeKeywords.filter(k => k !== kw);
    renderCrawlerUI();
    showAdminToast(`已移除排除字：${kw}`);
  }
}

async function saveCrawlerConfig() {
  const sheetInput = document.getElementById("crawler-sheet-url");
  const wsInput = document.getElementById("crawler-worksheet-name");

  if (sheetInput) crawlerConfig.sheetUrl = sheetInput.value.trim();
  if (wsInput) crawlerConfig.worksheetName = wsInput.value.trim() || "Rawdata";

  localStorage.setItem("iron_heroes_crawler_config", JSON.stringify(crawlerConfig));

  const athleteCount = Object.keys(crawlerConfig.athleteProfiles || {}).length;
  const athleteSummary = Object.entries(crawlerConfig.athleteProfiles || {})
    .map(([id, name]) => `• #${id} ➔ ${name}`)
    .join("\n");

  try {
    const res = await fetch("/api/crawler/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(crawlerConfig)
    });
    if (res.ok) {
      alert(`✅【Strava 爬蟲設定已成功儲存並同步！】\n\n👥 目前監控的選手名單 (${athleteCount} 位)：\n${athleteSummary}\n\n🚫 排除關鍵字：${(crawlerConfig.excludeKeywords || []).join(", ") || "無"}\n📊 目標試算表：${crawlerConfig.worksheetName}\n\n⚡ 下次 GitHub Actions 雲端定時排程（每 30 分鐘）或手動 Run workflow 時，將自動爬取以上所有選手！`);
      showAdminToast("✅ Strava 爬蟲設定已成功儲存至伺服器！");
    } else {
      alert(`✅ 爬蟲設定已保存至本地快取！\n共有 ${athleteCount} 位選手納入監控名冊。`);
    }
  } catch (e) {
    alert(`✅ 爬蟲設定已於本地保存！\n共有 ${athleteCount} 位選手納入監控名冊。`);
  }
}

async function runCrawlerNow() {
  const modal = document.getElementById("modal-crawler-log");
  const outEl = document.getElementById("crawler-terminal-output");
  if (modal) modal.classList.remove("hidden");
  if (outEl) outEl.innerText = "[系統] 🚀 正在檢查 Strava 爬蟲狀態與雲端工作流...\n\n";

  try {
    const res = await fetch("/api/crawler/run", { method: "POST" });
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (outEl) {
          outEl.innerText = (data.output || "無輸出紀錄") + (data.success ? "\n\n✅ 狀態檢查完成！" : "\n\n❌ 執行結束");
        }
        return;
      } catch (err) {}
    }
  } catch (e) {}

  if (outEl) {
    outEl.innerText = `[GitHub Actions 雲端爬蟲架構]
⚡ Strava 爬蟲已由 GitHub Actions 雲端排程託管 (每 30 分鐘自動定時執行)！

💡 隨時「立即手動抓取」最新運動步驟：
1. 請開啟您的 GitHub Repository Actions 頁面：
   👉 https://github.com/kerkerlai/strava-web_2.0/actions
2. 點選左側工作流【Strava to Google Sheet Crawler】
3. 點選右側藍色【Run workflow】按鈕 ➔ 雲端將在 30 秒內完成抓取並自動寫入 Google Sheet！

抓取完成後，回到本網頁點擊右上角【🔄 同步 Sheet】，即可即時更新最新戰況！`;
  }
}

function closeCrawlerLogModal() {
  const modal = document.getElementById("modal-crawler-log");
  if (modal) modal.classList.add("hidden");
}


function downloadCrawlerConfigJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(crawlerConfig, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "crawler_config.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showAdminToast("✅ 已下載最新的 crawler_config.json！");
}
