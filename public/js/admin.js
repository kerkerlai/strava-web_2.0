
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
  '狂戰士': { badge: '⚔️', name: '狂戰士', color: '#ef4444', desc: '巔峰落差×50 + 單次落差×8 + 熱量×0.6' },
  '聖騎士': { badge: '🛡️', name: '聖騎士', color: '#eab308', desc: '有效出勤×200 + 總時長×3.5' },
  '遊俠':   { badge: '🏹', name: '遊俠',   color: '#10b981', desc: 'Zone2次數×180 + 熱量×1.2' },
  '大法師': { badge: '🧙', name: '大法師', color: '#06b6d4', desc: 'TRIMP×12 + 熱量×0.5' },
  '刺客':   { badge: '🗡️', name: '刺客',   color: '#a855f7', desc: '單次平均熱量×5 + 單次平均衝力×25' }
};

document.addEventListener('DOMContentLoaded', async () => {
  checkGMAuth();
  if (typeof window.syncFromDatabase === 'function') {
    await window.syncFromDatabase();
  }
  if (!window.gameState || !window.gameState.heroes || window.gameState.heroes.length === 0) {
    await fetchAdminData();
  } else {
    gameState = window.gameState;
    allActivitiesCache = gameState?.activities || [];
  }
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
  if (window.gameState && window.gameState.heroes && window.gameState.heroes.length > 0) {
    gameState = window.gameState;
    allActivitiesCache = gameState?.activities || [];
    return;
  }
  try {
    const res = await fetch("/api/state");
    if (res.ok && !window.gameState) {
      gameState = await res.json();
    } else {
      throw new Error("Local API offline");
    }
  } catch (e) {
    try {
      const fbRes = await fetch("/data/game_data.json");
      if (fbRes.ok && !window.gameState) {
        gameState = await fbRes.json();
      }
    } catch (err) {}
  }

  if (window.gameState) {
    gameState = window.gameState;
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
}

function getModeLabel(mode) {
  if (mode === 'classic') return '資料片一：經典競技模式';
  if (mode === 'rpg_talent' || mode === 'rpg') return '資料片二：RPG 職業天賦模式';
  if (mode === 'world_boss' || mode === 'boss') return '資料片三：世界 Boss 討伐戰 (PvE Raid)';
  if (mode === 'faction_war') return '資料片四：雙城激戰 (2v2 陣營對抗)';
  if (mode === 'survival') return '資料片五：飢餓法則 (大逃殺生存戰)';
  if (mode === 'base_builder') return '資料片六：鋼鐵要塞 (全服資源養成)';
  if (mode === 'bingo') return '資料片七：戰神拼圖 (九宮格解謎)';
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

  const minDurVal = gameState.summary?.minDurationMinutes || gameState.boss?.rules?.minDurationMinutes || gameState.classic?.minDuration || 30;
  const globalMinDur = document.getElementById('cfg-global-min-dur');
  const classicMinDur = document.getElementById('cfg-classic-min-dur');
  if (globalMinDur) globalMinDur.value = minDurVal;
  if (classicMinDur) classicMinDur.value = minDurVal;

  if (gameState.faction) {
    const f1El = document.getElementById('cfg-faction1-name');
    const f2El = document.getElementById('cfg-faction2-name');
    const fHpEl = document.getElementById('cfg-faction-basehp');
    if (f1El && gameState.faction.f1Name) f1El.value = gameState.faction.f1Name;
    if (f2El && gameState.faction.f2Name) f2El.value = gameState.faction.f2Name;
    if (fHpEl && gameState.faction.baseHp) fHpEl.value = gameState.faction.baseHp;
  }

  if (gameState.survival) {
    const sMaxEl = document.getElementById('cfg-survival-maxhp');
    const sDecEl = document.getElementById('cfg-survival-decay');
    if (sMaxEl && gameState.survival.maxHp) sMaxEl.value = gameState.survival.maxHp;
    if (sDecEl && gameState.survival.decayPerDay) sDecEl.value = gameState.survival.decayPerDay;
  }

  if (gameState.base) {
    const bWoodEl = document.getElementById('cfg-base-wood');
    const bSteelEl = document.getElementById('cfg-base-steel');
    const bManaEl = document.getElementById('cfg-base-mana');
    if (bWoodEl && gameState.base.woodTarget) bWoodEl.value = gameState.base.woodTarget;
    if (bSteelEl && gameState.base.steelTarget) bSteelEl.value = gameState.base.steelTarget;
    if (bManaEl && gameState.base.manaTarget) bManaEl.value = gameState.base.manaTarget;
  }

  if (gameState.bingo) {
    const bgMultEl = document.getElementById('cfg-bingo-multiplier');
    if (bgMultEl && gameState.bingo.multiplier !== undefined) bgMultEl.value = gameState.bingo.multiplier;
  }

  const kwEl = document.getElementById('cfg-exclude-keywords');
  if (kwEl) {
    const kws = Array.isArray(gameState.excludeKeywords) && gameState.excludeKeywords.length > 0
      ? gameState.excludeKeywords
      : ['羽球', 'Badminton'];
    kwEl.value = kws.join(', ');
  }

  populateBossConfig();
  onExpansionModeChanged();
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
    else if (mode === 'world_boss') helperTag.innerHTML = '當前設定：🐉 資料片三 • 世界 Boss 討伐戰 (PvE 全服合作打王)';
    else if (mode === 'faction_war') helperTag.innerHTML = '當前設定：🏰 資料片四 • 雙城激戰 (2v2 陣營攻城戰)';
    else if (mode === 'survival') helperTag.innerHTML = '當前設定：☠️ 資料片五 • 飢餓法則 (荒野大逃殺生存戰)';
    else if (mode === 'base_builder') helperTag.innerHTML = '當前設定：🔨 資料片六 • 鋼鐵要塞 (全服基地養成)';
    else if (mode === 'bingo') helperTag.innerHTML = '當前設定：🧩 資料片七 • 戰神拼圖 (九宮格團隊解謎)';
  }

  // 2. Toggle Mode-Specific Config Panels
  const pClassic = document.getElementById('panel-settings-classic');
  const pRpg = document.getElementById('panel-settings-rpg');
  const pBoss = document.getElementById('panel-settings-boss');

  if (pClassic) pClassic.classList.toggle('hidden', mode !== 'classic');
  if (pRpg) pRpg.classList.toggle('hidden', mode !== 'rpg_talent');
  if (pBoss) pBoss.classList.toggle('hidden', mode !== 'world_boss');
  const pFaction = document.getElementById('panel-settings-faction');
  const pSurvival = document.getElementById('panel-settings-survival');
  const pBase = document.getElementById('panel-settings-base');
  const pBingo = document.getElementById('panel-settings-bingo');
  if (pFaction) pFaction.classList.toggle('hidden', mode !== 'faction_war');
  if (pSurvival) pSurvival.classList.toggle('hidden', mode !== 'survival');
  if (pBase) pBase.classList.toggle('hidden', mode !== 'base_builder');
  if (pBingo) pBingo.classList.toggle('hidden', mode !== 'bingo');

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
    if (formSub) formSub.innerText = '登錄有效運動，自動試算有氧/無氧指標並計入公會積分';
    if (btnSubmitText) btnSubmitText.innerText = '登錄訓練並計入經典競技積分';
    if (lbl1) lbl1.innerText = '🔋 燃脂熱量 (kcal)';
    if (lbl2) lbl2.innerText = '🚀 訓練衝力 (TRIMP)';
    if (lbl3) lbl3.innerText = '🦍 無氧落差 (Gap)';
    if (lbl4) lbl4.innerText = '📊 綜合試算指標';
  } else if (mode === 'rpg_talent') {
    if (formTitle) formTitle.innerText = '⚔️ 登錄英雄修煉打卡';
    if (formSub) formSub.innerText = '鍛鍊數據套用英雄職業被動天賦，轉化為 RPG 戰鬥評分 (CP)';
    if (btnSubmitText) btnSubmitText.innerText = '登錄打卡並轉化為職業專精戰力 (CP)';
    if (lbl1) lbl1.innerText = '🔥 基礎能量';
    if (lbl2) lbl2.innerText = '⚡ 奧術衝力';
    if (lbl3) lbl3.innerText = '✨ 專精天賦加成';
    if (lbl4) lbl4.innerText = '⚡ 單次戰力 (CP)';
  } else if (mode === 'faction_war') {
    if (formTitle) formTitle.innerText = '🏰 登錄陣營攻防戰行動';
    if (formSub) formSub.innerText = '無氧衝力與落差化為攻城砲火，有氧與 Zone2 化為城牆修復值';
    if (btnSubmitText) btnSubmitText.innerText = '發動陣營攻城與修復行動';
    if (lbl1) lbl1.innerText = '🔥 攻城傷害';
    if (lbl2) lbl2.innerText = '🛠️ 城牆修復';
    if (lbl3) lbl3.innerText = '🟢 Zone2 判定';
    if (lbl4) lbl4.innerText = '🏰 戰略總貢獻';
  } else if (mode === 'survival') {
    if (formTitle) formTitle.innerText = '🍖 登錄荒野狩獵與搜刮';
    if (formSub) formSub.innerText = '燃燒熱量補充生命，引擎衝力搜刮荒野物資抵抗每日毒圈衰減';
    if (btnSubmitText) btnSubmitText.innerText = '登錄狩獵並補充荒野生存 HP';
    if (lbl1) lbl1.innerText = '🍖 狩獵補血 (Cal)';
    if (lbl2) lbl2.innerText = '🎒 搜刮物資 (TRIMP×1.5)';
    if (lbl3) lbl3.innerText = '🦍 落差 (Gap)';
    if (lbl4) lbl4.innerText = '❤️ 總回復 HP';
  } else if (mode === 'base_builder') {
    if (formTitle) formTitle.innerText = '🔨 登錄要塞資源採集';
    if (formSub) formSub.innerText = '全服協力採集木材、鋼鐵與魔法原石，升級鐵峰堡壘';
    if (btnSubmitText) btnSubmitText.innerText = '登錄採集並貢獻要塞資源';
    if (lbl1) lbl1.innerText = '🌳 木材 (Cal)';
    if (lbl2) lbl2.innerText = '⚙️ 鋼鐵 (TRIMP)';
    if (lbl3) lbl3.innerText = '🔮 魔法石 (Gap+Z2)';
    if (lbl4) lbl4.innerText = '🏰 資源總產量';
  } else if (mode === 'bingo') {
    if (formTitle) formTitle.innerText = '🧩 登錄戰神拼圖解題訓練';
    if (formSub) formSub.innerText = '精準達成九宮格石板條件（滿60分、Zone2、高落差、高熱量）';
    if (btnSubmitText) btnSubmitText.innerText = '登錄訓練並推進九宮格石板';
    if (lbl1) lbl1.innerText = '🔥 燃燒熱量';
    if (lbl2) lbl2.innerText = '⚙️ 引擎衝力 (TRIMP)';
    if (lbl3) lbl3.innerText = '💥 心率落差 (Gap)';
    if (lbl4) lbl4.innerText = '🧩 解鎖指標數';
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
  } else if (mode === 'faction_war') {
    if (rosterTitle) rosterTitle.innerText = '👥 陣營傭兵名冊與公會編制 (雙城激戰)';
    if (btnRandom) btnRandom.classList.add('hidden');
    if (thClass) thClass.innerText = '🏰 所屬陣營部隊';
  } else if (mode === 'survival') {
    if (rosterTitle) rosterTitle.innerText = '👥 荒野求生者名冊 (飢餓法則)';
    if (btnRandom) btnRandom.classList.add('hidden');
    if (thClass) thClass.innerText = '☠️ 求生者身分';
  } else if (mode === 'base_builder') {
    if (rosterTitle) rosterTitle.innerText = '👥 要塞工程隊名冊 (鋼鐵要塞)';
    if (btnRandom) btnRandom.classList.add('hidden');
    if (thClass) thClass.innerText = '🔨 工程隊職務';
  } else if (mode === 'bingo') {
    if (rosterTitle) rosterTitle.innerText = '👥 遺跡解謎遠征隊名冊 (戰神拼圖)';
    if (btnRandom) btnRandom.classList.add('hidden');
    if (thClass) thClass.innerText = '🧩 遠征隊成員';
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

async function syncAllSettingsToSupabase(customMsg) {
  if (window.dbSyncHealthy === false) {
    if (!confirm("⚠️ 目前雲端資料庫連線異常，強制寫入可能會以預設值覆蓋雲端設定。確定仍要覆寫嗎？")) {
      return;
    }
  }
  const activeMode = document.getElementById('cfg-active-mode')?.value || gameState?.activeMode || 'world_boss';
  const startRaw = document.getElementById('cfg-season-start')?.value || '';
  const endRaw = document.getElementById('cfg-season-end')?.value || '';

  const seasonStart = inputValToDate(startRaw) || gameState?.seasonStart || '2026/08/12';
  const seasonEnd = inputValToDate(endRaw) || gameState?.seasonEnd || '2026/08/31';

  const globalMinDurEl = document.getElementById('cfg-global-min-dur');
  const classicMinDurEl = document.getElementById('cfg-classic-min-dur');
  const minDur = parseFloat(globalMinDurEl?.value || classicMinDurEl?.value) || 30.0;
  if (globalMinDurEl) globalMinDurEl.value = minDur;
  if (classicMinDurEl) classicMinDurEl.value = minDur;

  // Boss Config
  const bossConfig = gameState?.boss || {};
  const bossName = document.getElementById('cfg-boss-name')?.value?.trim();
  const bossMaxHp = parseInt(document.getElementById('cfg-boss-maxhp')?.value);
  const magMult = parseFloat(document.getElementById('cfg-mag-mult')?.value) || 15.0;
  if (bossName) bossConfig.name = bossName;
  if (bossMaxHp > 0) bossConfig.maxHp = bossMaxHp;
  delete bossConfig.currentHp;
  bossConfig.seasonStart = seasonStart;
  bossConfig.seasonEnd = seasonEnd;
  if (!bossConfig.rules) bossConfig.rules = {};
  bossConfig.rules.minDurationMinutes = minDur;
  bossConfig.rules.magicMultiplier = magMult;

  // Classic & RPG Config
  const classicConfig = gameState?.classic || {};
  classicConfig.seasonStart = seasonStart;
  classicConfig.seasonEnd = seasonEnd;
  classicConfig.minDuration = minDur;

  const rpgConfig = gameState?.rpg || {};
  rpgConfig.seasonStart = seasonStart;
  rpgConfig.seasonEnd = seasonEnd;
  rpgConfig.minDuration = minDur;

  // Expansion 4: Faction Config
  const factionConfig = {
    f1Name: document.getElementById('cfg-faction1-name')?.value || gameState?.faction?.f1Name || '🟢 均衡聯盟',
    f2Name: document.getElementById('cfg-faction2-name')?.value || gameState?.faction?.f2Name || '🔴 狂怒部落',
    baseHp: parseInt(document.getElementById('cfg-faction-basehp')?.value) || gameState?.faction?.baseHp || 500000,
    seasonStart: seasonStart,
    seasonEnd: seasonEnd,
    minDuration: minDur
  };

  // Expansion 5: Survival Config (preserve past days' decay if decayPerDay is modified mid-season)
  const prevSurvival = gameState?.survival || {};
  const newMaxHp = parseInt(document.getElementById('cfg-survival-maxhp')?.value) || prevSurvival.maxHp || 10000;
  const newDecayPerDay = parseInt(document.getElementById('cfg-survival-decay')?.value) || prevSurvival.decayPerDay || 500;
  let decayBasePenalty = Number(prevSurvival.decayBasePenalty) || 0;
  let decayUpdatedDate = prevSurvival.decayUpdatedDate || null;

  const prevStart = prevSurvival.seasonStart || gameState?.seasonStart || seasonStart;
  if (prevStart !== seasonStart) {
    // New season start resets segmented decay
    decayBasePenalty = 0;
    decayUpdatedDate = null;
  } else if (prevSurvival.decayPerDay !== undefined && Number(prevSurvival.decayPerDay) !== newDecayPerDay && window.computeHeroSurvival) {
    const curSurv = window.computeHeroSurvival({}, gameState);
    decayBasePenalty = curSurv.currentPenalty;
    const now = new Date();
    decayUpdatedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  const survivalConfig = {
    maxHp: newMaxHp,
    decayPerDay: newDecayPerDay,
    decayBasePenalty: decayBasePenalty,
    decayUpdatedDate: decayUpdatedDate,
    seasonStart: seasonStart,
    seasonEnd: seasonEnd,
    minDuration: minDur
  };

  // Expansion 6: Base Builder Config
  const baseConfig = {
    woodTarget: parseInt(document.getElementById('cfg-base-wood')?.value) || gameState?.base?.woodTarget || 10000,
    steelTarget: parseInt(document.getElementById('cfg-base-steel')?.value) || gameState?.base?.steelTarget || 500,
    manaTarget: parseInt(document.getElementById('cfg-base-mana')?.value) || gameState?.base?.manaTarget || 500,
    seasonStart: seasonStart,
    seasonEnd: seasonEnd,
    minDuration: minDur
  };

  // Expansion 7: Bingo Config
  const bingoConfig = {
    multiplier: parseFloat(document.getElementById('cfg-bingo-multiplier')?.value) || gameState?.bingo?.multiplier || 1.0,
    seasonStart: seasonStart,
    seasonEnd: seasonEnd,
    minDuration: minDur
  };

  await Promise.all([
    window.supabase.insert("game_config", { key: "active_mode", value: activeMode }),
    window.supabase.insert("game_config", { key: "boss_config", value: bossConfig }),
    window.supabase.insert("game_config", { key: "classic_config", value: classicConfig }),
    window.supabase.insert("game_config", { key: "rpg_config", value: rpgConfig }),
    window.supabase.insert("game_config", { key: "faction_config", value: factionConfig }),
    window.supabase.insert("game_config", { key: "survival_config", value: survivalConfig }),
    window.supabase.insert("game_config", { key: "base_config", value: baseConfig }),
    window.supabase.insert("game_config", { key: "bingo_config", value: bingoConfig })
  ]);

  if (gameState) {
    gameState.activeMode = activeMode;
    gameState.seasonStart = seasonStart;
    gameState.seasonEnd = seasonEnd;
    gameState.boss = bossConfig;
    gameState.classic = classicConfig;
    gameState.rpg = rpgConfig;
    gameState.faction = factionConfig;
    gameState.survival = survivalConfig;
    gameState.base = baseConfig;
    gameState.bingo = bingoConfig;
  }

  if (window.syncFromDatabase) await window.syncFromDatabase();
  alert(customMsg || `🎉 資料片模式【${getModeLabel(activeMode)}】與所有遊戲條件參數已成功同步寫入 Supabase！前台看板立即生效！`);
  showAdminToast("✅ 賽事核心參數與資料片條件已成功儲存至雲端！");
  onExpansionModeChanged();
}

async function saveGlobalGameSettings() {
  try {
    await syncAllSettingsToSupabase();
  } catch (e) {
    console.error("Save Global Settings Error:", e);
    alert("❌ 儲存至雲端資料庫異常：" + e.message);
  }
}

// -------------------------------------------------------------
// SNAPSHOTS CRUD MANAGEMENT (100% 完整賽季快照封存)
// -------------------------------------------------------------

function getSnapshotsList() {
  if (gameState?.snapshots && Array.isArray(gameState.snapshots)) {
    return gameState.snapshots;
  }
  return [];
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
    } else if (snap.type === 'faction_war') {
      typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🏰 雙城激戰</span>';
    } else if (snap.type === 'survival') {
      typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/20 text-amber-400 border border-amber-600/30">☠️ 飢餓法則</span>';
    } else if (snap.type === 'base_builder') {
      typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🔨 鋼鐵要塞</span>';
    } else if (snap.type === 'bingo') {
      typeLabel = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">🧩 戰神拼圖</span>';
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
  if (gameState) gameState.snapshots = snapshots;

  try {
    await window.supabase.insert("game_config", { key: "snapshots", value: snapshots });
    if (window.syncFromDatabase) await window.syncFromDatabase();
    renderSnapshotTable();
    showAdminToast(`✅ 快照【${snap.seasonTitle}】已成功設為【${snap.isVisible ? '前台正常顯示' : '隱藏不顯示'}】！`);
  } catch (e) {
    console.error("Toggle Snapshot Visibility Error:", e);
    renderSnapshotTable();
    showAdminToast("❌ 更新失敗：" + e.message, true);
  }
}

async function deleteSnapshot(snapId) {
  const snapshots = getSnapshotsList();
  const snap = snapshots.find(s => s.id === snapId);
  const snapTitle = snap?.seasonTitle || snapId;

  if (!confirm(`確定要從 Supabase 雲端資料庫永久刪除快照【${snapTitle}】嗎？\n刪除後此歷史紀錄將從過往英雄史中移除！`)) return;

  const updatedSnapshots = snapshots.filter(s => s.id !== snapId);
  if (gameState) gameState.snapshots = updatedSnapshots;
  renderSnapshotTable();

  try {
    await window.supabase.insert("game_config", { key: "snapshots", value: updatedSnapshots });
    if (window.syncFromDatabase) await window.syncFromDatabase();
    renderSnapshotTable();
    alert(`🗑️ 快照【${snapTitle}】已成功自 Supabase 雲端資料庫刪除！前後台已同步更新！`);
    showAdminToast(`🗑️ 快照【${snapTitle}】已成功刪除！`);
  } catch (e) {
    console.error("Delete Snapshot Error:", e);
    alert("❌ 刪除失敗：" + e.message);
  }
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
  const activeMode = document.getElementById('cfg-active-mode')?.value || gameState?.activeMode || 'classic';
  if (gameState) gameState.activeMode = activeMode;
  const boss = gameState?.boss || {};
  let defaultTitle = '2026 S2 • 經典競技模式 (封存快照)';
  if (activeMode === 'rpg_talent' || activeMode === 'rpg') defaultTitle = '2026 S2 • RPG 職業天賦爭霸 (封存快照)';
  else if (activeMode === 'world_boss' || activeMode === 'boss') defaultTitle = `${boss.name || '世界 Boss 討伐戰'} (結算快照)`;
  else if (activeMode === 'faction_war') defaultTitle = '2026 S2 • 雙城激戰 (結算快照)';
  else if (activeMode === 'survival') defaultTitle = '2026 S2 • 飢餓法則 (結算快照)';
  else if (activeMode === 'base_builder') defaultTitle = '2026 S2 • 鋼鐵要塞 (結算快照)';
  else if (activeMode === 'bingo') defaultTitle = '2026 S2 • 戰神拼圖 (結算快照)';

  const customTitle = prompt('請輸入要建立的快照名稱 (Snapshot Title)：', defaultTitle);
  if (customTitle === null) return;
  const snapshotTitle = customTitle.trim() || defaultTitle;

  try {
    const curStartRaw = document.getElementById("cfg-season-start")?.value;
    const curEndRaw = document.getElementById("cfg-season-end")?.value;
    const activeStartStr = (curStartRaw ? inputValToDate(curStartRaw) : null) || gameState?.seasonStart || "2026/07/27";
    const activeEndStr = (curEndRaw ? inputValToDate(curEndRaw) : null) || gameState?.seasonEnd || "2026/09/30";

    const now = new Date();
    const timeStampStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let newArchive = null;

    if (activeMode === 'classic') {
      const classicStats = (window.calculateLiveClassicStats ? window.calculateLiveClassicStats(gameState) : null) || gameState?.classic || {};
      newArchive = {
        id: `snapshot_classic_${Date.now()}`,
        type: 'classic',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 本賽季已圓滿結算 (歷史數據已凍結)',
        isVisible: true,
        classicData: classicStats,
        champions: classicStats.champions || {},
        teamMetrics: classicStats.teamMetrics || [],
        guildList: classicStats.guildList || [],
        heroList: classicStats.heroList || []
      };
    } else if (activeMode === 'rpg_talent' || activeMode === 'rpg') {
      const rpgStats = (window.calculateLiveRPGStats ? window.calculateLiveRPGStats(gameState) : null) || gameState?.rpg || {};
      newArchive = {
        id: `snapshot_rpg_${Date.now()}`,
        type: 'rpg',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 本賽季職業爭霸已圓滿結算封存',
        isVisible: true,
        classMasters: rpgStats.classMasters || {},
        guildSynergyList: rpgStats.guildSynergyList || [],
        heroRpgList: rpgStats.heroRpgList || []
      };
    } else if (activeMode === 'faction_war') {
      const guildList = gameState?.guilds || [];
      let faction1 = { name: gameState?.faction?.f1Name || "🟢 均衡聯盟", hp: gameState?.faction?.baseHp || 500000, dmg: 0, repair: 0, guilds: [] };
      let faction2 = { name: gameState?.faction?.f2Name || "🔴 狂怒部落", hp: gameState?.faction?.baseHp || 500000, dmg: 0, repair: 0, guilds: [] };
      guildList.forEach((g, idx) => {
        const targetF = (idx % 2 === 0) ? faction1 : faction2;
        targetF.guilds.push(g.name);
        const gHeroes = (gameState?.heroStats || []).filter(h => h.guild === g.name);
        targetF.dmg += gHeroes.reduce((s, h) => s + (h.totalTrimp || 0), 0) * 10 + gHeroes.reduce((s, h) => s + (h.maxGap || 0), 0) * 100;
        targetF.repair += gHeroes.reduce((s, h) => s + (h.zone2Count || 0), 0) * 5000 + gHeroes.reduce((s, h) => s + (h.totalCalories || 0), 0);
      });
      faction1.currentHp = Math.max(0, faction1.hp - faction2.dmg + faction1.repair);
      faction2.currentHp = Math.max(0, faction2.hp - faction1.dmg + faction2.repair);
      const heroList = JSON.parse(JSON.stringify(gameState?.heroStats || [])).map(h => ({
        ...h,
        siegeDmg: Math.round((h.totalTrimp || 0) * 10 + (h.maxGap || 0) * 100),
        wallRepair: Math.round((h.zone2Count || 0) * 5000 + (h.totalCalories || 0))
      }));
      newArchive = {
        id: `snapshot_faction_${Date.now()}`,
        type: 'faction_war',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 雙城激戰已圓滿結算封存',
        isVisible: true,
        faction1,
        faction2,
        heroList
      };
    } else if (activeMode === 'survival') {
      const survivingHeroes = JSON.parse(JSON.stringify(gameState?.heroStats || [])).map(h => {
        const surv = window.computeHeroSurvival ? window.computeHeroSurvival(h, gameState) : {
          currentHp: 10000, currentPenalty: 0, isDead: false, food: h.totalCalories || 0, scavenge: (h.totalTrimp || 0) * 1.5, survivedDays: 1, daysElapsed: 1, maxHp: 10000, decayPerDay: 500
        };
        return { ...h, ...surv };
      }).sort((a, b) => b.currentHp - a.currentHp);
      newArchive = {
        id: `snapshot_survival_${Date.now()}`,
        type: 'survival',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 飢餓法則生存戰已圓滿結算封存',
        isVisible: true,
        survivalConfig: gameState?.survival || {},
        survivingHeroes
      };
    } else if (activeMode === 'base_builder') {
      const heroList = JSON.parse(JSON.stringify(gameState?.heroStats || []));
      let totalWood = 0, totalSteel = 0, totalMana = 0;
      heroList.forEach(h => {
        totalWood += (h.totalCalories || 0);
        totalSteel += (h.totalTrimp || 0);
        totalMana += (h.maxGap || 0) * 10 + (h.zone2Count || 0) * 50;
      });
      newArchive = {
        id: `snapshot_base_${Date.now()}`,
        type: 'base_builder',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 鋼鐵要塞工程已圓滿結算封存',
        isVisible: true,
        baseConfig: gameState?.base || {},
        totalWood: Math.round(totalWood),
        totalSteel: Math.round(totalSteel),
        totalMana: Math.round(totalMana),
        heroList
      };
    } else if (activeMode === 'bingo') {
      const acts = (gameState?.activities || []).filter(a => a.isValidAttack);
      const m = gameState?.bingo?.multiplier || 1.0;
      const minWearableRequired = Math.max(1, Math.ceil(5 * m));
      const maxManualAllowed = Math.max(1, Math.floor(5 / m));
      const grid = [
        { key: "長征先鋒", desc: `全服累計 ${Math.ceil(10 * m)} 次超過 1 小時的訓練`, ok: acts.filter(a => a.duration >= 60).length >= Math.ceil(10 * m) },
        { key: "燃脂大師", desc: `解鎖 ${Math.ceil(20 * m)} 次完美的 Zone 2 綠色指標`, ok: acts.filter(a => a.isZone2).length >= Math.ceil(20 * m) },
        { key: "心跳超載", desc: `全服累積引擎衝力 TRIMP 破 ${Math.ceil(3000 * m).toLocaleString()}`, ok: acts.reduce((s, a) => s + (a.trimp || 0), 0) >= 3000 * m },
        { key: "爆發限界", desc: `出現 ${Math.ceil(5 * m)} 次落差大於 70 的魔鬼心率訓練`, ok: acts.filter(a => a.gapVal >= 70).length >= Math.ceil(5 * m) },
        { key: "紀律部隊", desc: `伺服器至少有 ${Math.max(1, Math.ceil(3 * m))} 人達成 10 次出勤`, ok: (gameState?.heroStats || []).filter(h => (h.validWorkouts || 0) >= 10).length >= Math.max(1, Math.ceil(3 * m)) },
        { key: "脂肪燃燒者", desc: `全服大熱量！總計燃燒 ${(50000 * m).toLocaleString()} 卡路里`, ok: acts.reduce((s, a) => s + (a.calories || 0), 0) >= 50000 * m },
        { key: "死神擦肩", desc: `尋找 ${Math.max(1, Math.ceil(2 * m))} 名極限 MaxGap 突破 80 的勇者`, ok: (gameState?.heroStats || []).filter(h => (h.maxGap || 0) >= 80).length >= Math.max(1, Math.ceil(2 * m)) },
        { key: "真金不怕火", desc: `全服累積至少 ${minWearableRequired} 次有效訓練，且手動打卡控制在 ${maxManualAllowed} 次內`, ok: acts.length >= minWearableRequired && acts.filter(a => a.isManual).length <= maxManualAllowed },
        { key: "冒險起點", desc: "中央免費贈送的補給空間", ok: true }
      ];
      newArchive = {
        id: `snapshot_bingo_${Date.now()}`,
        type: 'bingo',
        seasonTitle: snapshotTitle,
        seasonPeriod: `${activeStartStr} ~ ${activeEndStr}`,
        archivedAt: timeStampStr,
        status: 'completed',
        statusLabel: '🏁 戰神拼圖已圓滿結算封存',
        isVisible: true,
        multiplier: m,
        grid,
        heroList: JSON.parse(JSON.stringify(gameState?.heroStats || []))
      };
    } else {
      const currentHeroStats = JSON.parse(JSON.stringify(gameState?.heroStats || window.heroStatsList || []));
      currentHeroStats.sort((a, b) => (b.totalDamage || b.score || 0) - (a.totalDamage || a.score || 0));
      const currentGuilds = JSON.parse(JSON.stringify(gameState?.guilds || []));
      currentGuilds.sort((a, b) => (b.totalDamage || b.score || 0) - (a.totalDamage || a.score || 0));
      const currentSummary = JSON.parse(JSON.stringify(gameState?.summary || {}));
      const currentBoss = JSON.parse(JSON.stringify(gameState?.boss || {}));

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
          ...currentBoss,
          seasonStart: activeStartStr,
          seasonEnd: activeEndStr,
          currentHp: currentBoss.currentHp !== undefined ? currentBoss.currentHp : Math.max(0, (currentBoss.maxHp || 350000) - (currentSummary.totalDamage || 0))
        },
        summary: currentSummary,
        heroStats: currentHeroStats,
        guildContributions: currentGuilds,
        activities: (gameState?.activities || []).filter(a => a.isValidAttack).slice(0, 30)
      };
    }

    const snapshots = getSnapshotsList();
    snapshots.unshift(newArchive);

    try {
      await window.supabase.insert("game_config", { key: "snapshots", value: snapshots });
      if (window.syncFromDatabase) await window.syncFromDatabase();
      renderSnapshotTable();
      alert(`🎉 成功生成賽季完整歷史快照【${snapshotTitle}】並同步寫入 Supabase 雲端資料庫！前台【過往英雄史】已永久保存！`);
    } catch (err) {
      console.error("Archive Save Error:", err);
      alert("❌ 封存快照寫入雲端失敗：" + err.message);
    }
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

    const heroesArr = Array.isArray(gameState.heroes) ? gameState.heroes : Object.values(gameState.heroes || {});
  const sortedHeroes = heroesArr.sort((a,b) => {
      let ag = a.guild || '', bg = b.guild || '';
      if(ag !== bg) return ag.localeCompare(bg);
      let ac = a.rpgClass || '', bc = b.rpgClass || '';
      if(ac !== bc) return ac.localeCompare(bc);
      return (a.name||'').localeCompare(b.name||'');
  });
  sortedHeroes.forEach(h => {
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

    const stravaIdDisplay = h.stravaId ? 
      `<a href="https://www.strava.com/athletes/${h.stravaId}" target="_blank" class="font-mono text-cyan-400 font-bold hover:underline">#${h.stravaId} ↗</a>` : 
      `<span class="text-slate-500 italic">未綁定</span>`;

    tr.innerHTML = `
      <td class="p-3 font-bold text-white flex items-center space-x-2">
        <div class="w-7 h-7 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
          <img src="${h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`}" class="w-full h-full object-cover">
        </div>
        <span>${h.name}</span>
      </td>
      <td class="p-3 font-mono">${h.age} 歲</td>
      <td class="p-3 font-mono text-cyan-400 font-bold">${h.maxHr} bpm</td>
      <td class="p-3"><span class="bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[11px]">${h.guild}</span></td>
      <td class="p-3">${classCellHtml}</td>
      <td class="p-3">${stravaIdDisplay}</td>
      <td class="p-3 text-right space-x-1.5">
        <button onclick="openEditHeroModal('${h.name}')" class="px-2.5 py-1 bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900 rounded-lg text-xs font-bold transition">✏️ 編輯</button>
        <button onclick="deleteHero('${h.name}')" class="px-2.5 py-1 bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900 rounded-lg text-xs font-bold transition">🗑️ 刪除</button>
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

  try {
    for (let i = 0; i < heroes.length; i++) {
      const assignedClass = pool[i];
      await window.supabase.update("heroes", `name=eq.${encodeURIComponent(heroes[i].name)}`, {
        rpg_class: assignedClass
      });
    }
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert("🎉 隨機抽籤分配完成！所有冒險者天賦已更新並寫入 Supabase 資料庫！全服即刻生效！");
  } catch (e) {
    console.error("Randomize Classes Error:", e);
    alert("❌ 職業分配失敗：" + e.message);
  }
}

function openAddHeroModal() {
  document.getElementById('modal-hero-title').innerText = '新增冒險者';
  document.getElementById('hero-edit-original-name').value = '';
  document.getElementById('hero-modal-name').value = '';
  document.getElementById('hero-modal-name').disabled = false;
  document.getElementById('hero-modal-age').value = '35';
  document.getElementById('hero-modal-guild').value = '';
  document.getElementById('hero-modal-class').value = '狂戰士';
  const stravaInput = document.getElementById('hero-modal-strava-id');
  if (stravaInput) stravaInput.value = '';
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
  const stravaInput = document.getElementById('hero-modal-strava-id');
  if (stravaInput) stravaInput.value = hero.stravaId || '';
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
  const stravaId = (document.getElementById('hero-modal-strava-id')?.value || "").trim();
  const maxHr = 220 - age;

  if (!name) {
    alert('請填寫英雄姓名');
    return;
  }

  const existingHero = gameState?.heroes?.find(h => h.name === (origName || name));
  const preservedAvatar = existingHero?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a`;

  const heroObj = {
    name: name,
    age: age,
    max_hr: maxHr,
    guild: guild,
    rpg_class: rpgClass,
    strava_id: stravaId,
    avatar: preservedAvatar
  };

  try {
    await window.supabase.insert("heroes", heroObj);
    closeHeroModal();
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert(`🎉 冒險者【${name}】已成功儲存至 Supabase 雲端資料庫！全站即刻同步！`);
    showAdminToast(`已儲存冒險者：${name}`);
  } catch (e) {
    console.error("Save Hero Error:", e);
    alert("❌ 儲存失敗：" + e.message);
  }
}

async function deleteHero(name) {
  if (!confirm(`確定要從 Supabase 雲端資料庫徹底刪除冒險者【${name}】嗎？`)) return;

  try {
    await window.supabase.delete("heroes", `name=eq.${encodeURIComponent(name)}`);
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert(`🗑️ 冒險者【${name}】已成功自雲端資料庫刪除！`);
    showAdminToast(`已刪除冒險者：${name}`);
  } catch (e) {
    console.error("Delete Hero Error:", e);
    alert("❌ 刪除失敗：" + e.message);
  }
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
  const nameEl = document.getElementById('cfg-boss-name');
  const maxHpEl = document.getElementById('cfg-boss-maxhp');
  const currHpEl = document.getElementById('cfg-boss-currhp');
  const minDurEl = document.getElementById('cfg-min-dur');
  const magMultEl = document.getElementById('cfg-mag-mult');

  if (nameEl) nameEl.value = boss.name || '';
  if (maxHpEl) maxHpEl.value = boss.maxHp || 350000;
  if (currHpEl) currHpEl.value = boss.currentHp !== undefined ? boss.currentHp : 232849;
  if (minDurEl) minDurEl.value = boss.rules?.minDurationMinutes || 30;
  if (magMultEl) magMultEl.value = boss.rules?.magicMultiplier || 15;
}

function previewDamageCalculation() {
  const mode = document.getElementById('cfg-active-mode')?.value || 'classic';
  const heroName = document.getElementById('inp-hero')?.value || '';
  const hero = gameState?.heroes?.find(h => h.name === heroName);
  const maxHrEst = hero?.maxHr || 185;
  const rpgClass = hero?.rpgClass || '狂戰士';

  const duration = parseFloat(document.getElementById('inp-duration')?.value) || 0;
  const avgHr = parseFloat(document.getElementById('inp-avg-hr')?.value) || 0;
  const maxHr = parseFloat(document.getElementById('inp-max-hr')?.value) || 0;
  const calories = parseFloat(document.getElementById('inp-calories')?.value) || 0;

  const minDur = parseFloat(document.getElementById('cfg-global-min-dur')?.value || document.getElementById('cfg-min-dur')?.value || document.getElementById('cfg-classic-min-dur')?.value) || 30.0;
  const magMult = parseFloat(document.getElementById('cfg-mag-mult')?.value) || 15.0;

  let val1 = 0, val2 = 0, val3 = 0, totalVal = 0;

  if (duration >= minDur) {
    const ratio = (maxHrEst > 0 && avgHr > 0) ? (avgHr / maxHrEst) : 0;
    const trimp = ratio > 0 ? (duration * ratio * Math.exp(1.92 * ratio)) : 0;
    const gap = Math.max(0, maxHr - avgHr);
    const isZone2 = ratio >= 0.60 && ratio < 0.75;

    if (mode === 'classic') {
      val1 = Math.round(calories);
      val2 = Math.round(trimp * 10) / 10;
      val3 = Math.round(gap);
      totalVal = Math.round(calories + trimp * 10 + gap * 10);
    } else if (mode === 'rpg_talent') {
      val1 = Math.round(calories);
      val2 = Math.round(trimp);
      if (rpgClass === '狂戰士') {
        val3 = Math.round(gap * 8);
        totalVal = Math.round(gap * 8 + calories * 0.6);
      } else if (rpgClass === '聖騎士') {
        val3 = 200;
        totalVal = Math.round(200 + duration * 3.5);
      } else if (rpgClass === '遊俠') {
        val3 = isZone2 ? 180 : 0;
        totalVal = Math.round((isZone2 ? 180 : 0) + calories * 1.2);
      } else if (rpgClass === '大法師') {
        val3 = Math.round(trimp * 12);
        totalVal = Math.round(trimp * 12 + calories * 0.5);
      } else {
        val3 = Math.round(trimp * 25);
        totalVal = Math.round(calories * 5 + trimp * 25);
      }
    } else if (mode === 'faction_war') {
      val1 = Math.round(trimp * 10 + gap * 100);
      val2 = Math.round(calories + (isZone2 ? 5000 : 0));
      val3 = isZone2 ? 1 : 0;
      totalVal = val1 + val2;
    } else if (mode === 'survival') {
      val1 = Math.round(calories);
      val2 = Math.round(trimp * 1.5);
      val3 = Math.round(gap);
      totalVal = val1 + val2;
    } else if (mode === 'base_builder') {
      val1 = Math.round(calories);
      val2 = Math.round(trimp);
      val3 = Math.round(gap * 10 + (isZone2 ? 50 : 0));
      totalVal = val1 + val2 + val3;
    } else if (mode === 'bingo') {
      val1 = Math.round(calories);
      val2 = Math.round(trimp);
      val3 = Math.round(gap);
      let checks = 0;
      if (duration >= 60) checks++;
      if (isZone2) checks++;
      if (gap >= 70) checks++;
      if (calories >= 300) checks++;
      totalVal = checks;
    } else {
      val1 = Math.round(calories);
      val2 = Math.round(trimp * magMult);
      val3 = Math.round(gap * 100);
      totalVal = val1 + val2 + val3;
    }
  }

  const p1 = document.getElementById('prev-phys');
  const p2 = document.getElementById('prev-mag');
  const p3 = document.getElementById('prev-crit');
  const pt = document.getElementById('prev-total');
  if (p1) p1.innerText = val1.toLocaleString();
  if (p2) p2.innerText = val2.toLocaleString();
  if (p3) p3.innerText = val3.toLocaleString();
  if (pt) pt.innerText = totalVal.toLocaleString();
}

async function handleManualAttack(e) {
  e.preventDefault();

  const heroName = document.getElementById('inp-hero').value;
  const type = document.getElementById('inp-type').value;
  const duration = parseFloat(document.getElementById('inp-duration').value) || 0;
  const avgHr = parseFloat(document.getElementById('inp-avg-hr').value) || 0;
  const maxHr = parseFloat(document.getElementById('inp-max-hr').value) || 0;
  const calories = parseFloat(document.getElementById('inp-calories').value) || 0;
  const title = document.getElementById('inp-title').value.trim() || '手動打卡鍛鍊';
  const customDateRaw = document.getElementById('inp-date')?.value || '';

  if (!heroName) { alert('請選擇英雄'); return; }
  if (duration <= 0) { alert('運動時長必須大於 0 分鐘'); return; }

  const newActId = `manual_${Date.now()}`;
  const now = new Date();
  const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const datePart = customDateRaw
    ? inputValToDate(customDateRaw)
    : `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const dateStr = `${datePart} ${timePart}`;

  const actObj = {
    id: newActId,
    hero: heroName,
    date: dateStr,
    type: type,
    name: title,
    duration: duration,
    distance: 0,
    elevation: 0,
    avg_hr: avgHr,
    max_hr: maxHr,
    calories: calories,
    is_manual: true,
    is_excluded: false
  };

  try {
    await window.supabase.insert("activities", actObj);
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert(`🎉 登錄成功！${heroName} 完成鍛鍊打卡，數據已即時同步至 Supabase 雲端資料庫並計入前台看板！`);
    document.getElementById('form-manual-entry').reset();
    previewDamageCalculation();
  } catch (err) {
    console.error("Manual Entry Error:", err);
    alert("❌ 補登失敗：" + err.message);
  }
}

async function saveClassicSettings() {
  const minDur = parseFloat(document.getElementById('cfg-classic-min-dur')?.value) || 30;
  const globalMinDurEl = document.getElementById('cfg-global-min-dur');
  if (globalMinDurEl) globalMinDurEl.value = minDur;

  try {
    await syncAllSettingsToSupabase('✅ 經典競技參數與資料片模式已成功儲存至 Supabase 雲端資料庫！');
  } catch (e) {
    console.error("Save Classic Settings Error:", e);
    alert("❌ 儲存失敗：" + e.message);
  }
}

async function saveBossSettings() {
  try {
    await syncAllSettingsToSupabase('✅ 世界 Boss 血量與討伐參數已成功更新至 Supabase 雲端資料庫！前台看板立即生效！');
  } catch (e) {
    console.error('Save boss settings error:', e);
    alert("❌ 儲存失敗：" + e.message);
  }
}

// -------------------------------------------------------------
// ACTIVITY CRUD & ANOMALY DETECTION (含日期/時長/心率/熱量/傷害欄位排序)
// -------------------------------------------------------------
let adminSortCol = 'date';
let adminSortAsc = false; // 預設最新日期在最上方 (降冪)

function parseAdminActivityTimestamp(dateStr) {
  if (!dateStr) return 0;
  if (typeof window.parseActivityDate === 'function') {
    const d = window.parseActivityDate(dateStr);
    if (d && !isNaN(d.getTime())) return d.getTime();
  }
  const s = String(dateStr).trim().replace(/-/g, '/');
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatAdminActivityDate(dateStr) {
  if (!dateStr) return '—';
  const ts = parseAdminActivityTimestamp(dateStr);
  if (!ts) return dateStr;
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  if (hh === '00' && min === '00' && !String(dateStr).includes(':')) {
    return `${yyyy}/${mm}/${dd}`;
  }
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

function sortAdminActivities(col) {
  if (adminSortCol === col) {
    adminSortAsc = !adminSortAsc;
  } else {
    adminSortCol = col;
    adminSortAsc = false;
  }

  const cols = ['date', 'duration', 'avgHr', 'calories', 'damage'];
  cols.forEach(c => {
    const el = document.getElementById(`admin-sort-${c}`);
    if (el) {
      if (c === adminSortCol) {
        el.innerText = adminSortAsc ? '▲' : '▼';
        el.className = 'text-amber-400 font-bold';
      } else {
        el.innerText = '↕';
        el.className = 'text-slate-600';
      }
    }
  });

  filterAdminActivities();
}

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

  const filtered = (allActivitiesCache || []).filter(a => {
    if (selectedHero && a.hero !== selectedHero) return false;
    if (query) {
      const matchHero = (a.hero || '').toLowerCase().includes(query);
      const matchTitle = (a.title || a.name || '').toLowerCase().includes(query);
      const matchType = (a.type || '').toLowerCase().includes(query);
      const matchId = String(a.id || '').toLowerCase().includes(query);
      if (!matchHero && !matchTitle && !matchType && !matchId) return false;
    }
    return true;
  });

  // Sort BEFORE slicing so all records across all months are ordered properly
  filtered.sort((a, b) => {
    let va = 0, vb = 0;
    if (adminSortCol === 'date') {
      va = parseAdminActivityTimestamp(a.date || a.time);
      vb = parseAdminActivityTimestamp(b.date || b.time);
    } else if (adminSortCol === 'duration') {
      va = Number(a.duration) || 0;
      vb = Number(b.duration) || 0;
    } else if (adminSortCol === 'avgHr') {
      va = Number(a.avgHr) || 0;
      vb = Number(b.avgHr) || 0;
    } else if (adminSortCol === 'calories') {
      va = Number(a.calories) || 0;
      vb = Number(b.calories) || 0;
    } else if (adminSortCol === 'damage') {
      va = Number(a.damage) || 0;
      vb = Number(b.damage) || 0;
    }
    if (va === vb) {
      return String(b.id || '').localeCompare(String(a.id || ''));
    }
    return adminSortAsc ? (va - vb) : (vb - va);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center text-slate-500">查無符合條件的運動打卡紀錄</td></tr>`;
    return;
  }

  filtered.slice(0, 500).forEach(a => {
    const tr = document.createElement('tr');
    const actId = String(a.id);
    const isExcluded = excludedSet.has(actId) || a.isExcluded;
    const isManual = isExcluded || String(actId).startsWith('ACT-') || String(actId).startsWith('manual_') || a.isManual;
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

    const actTitle = a.title || a.name || a.type || '運動';
    const actTypeBadge = a.type && a.type !== actTitle
      ? `<span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded ml-1">${a.type}</span>`
      : '';

    tr.innerHTML = `
      <td class="p-3">${sourceHtml}</td>
      <td class="p-3 font-mono text-slate-300 whitespace-nowrap">${formatAdminActivityDate(a.date || a.time)}</td>
      <td class="p-3 font-bold text-white whitespace-nowrap">${a.hero} <span class="text-[10px] text-slate-400 font-normal">(${a.guild})</span></td>
      <td class="p-3 text-slate-300 max-w-[180px] truncate" title="${actTitle} (${a.type || ''})">${actTitle}${actTypeBadge}</td>
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
  try {
    await window.supabase.update("activities", `id=eq.${encodeURIComponent(actId)}`, { is_excluded: shouldExclude });
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert(shouldExclude ? `🚫 紀錄 #${actId} 已在 Supabase 資料庫設為作廢，不再計入分數！` : `✅ 紀錄 #${actId} 已在 Supabase 資料庫恢復計入分數！`);
  } catch (e) {
    console.error("Toggle Exclude Error:", e);
    alert("❌ 操作失敗：" + e.message);
  }
}

async function deleteManualActivity(actId) {
  if (!confirm(`確定要從 Supabase 雲端資料庫永久刪除紀錄 #${actId} 嗎？`)) return;

  try {
    await window.supabase.delete("activities", `id=eq.${encodeURIComponent(actId)}`);
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert(`🗑️ 紀錄 #${actId} 已從 Supabase 雲端資料庫永久刪除！`);
  } catch (e) {
    console.error("Delete Activity Error:", e);
    alert("❌ 刪除失敗：" + e.message);
  }
}

function openEditActivityModal(actId) {
  const act = allActivitiesCache.find(a => String(a.id) === String(actId));
  if (!act) return;

  document.getElementById('act-edit-id').value = act.id;
  document.getElementById('act-edit-title').value = act.title || act.name || '';
  const dateEl = document.getElementById('act-edit-date');
  if (dateEl) dateEl.value = dateToInputVal(act.date || act.time || '');
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

  const newTitle = document.getElementById('act-edit-title').value.trim();
  const newDateInput = document.getElementById('act-edit-date')?.value || '';
  const newDuration = parseFloat(document.getElementById('act-edit-duration').value) || 0;
  const newCalories = parseFloat(document.getElementById('act-edit-calories').value) || 0;
  const newAvgHr = parseFloat(document.getElementById('act-edit-avghr').value) || 0;
  const newMaxHr = parseFloat(document.getElementById('act-edit-maxhr').value) || 0;

  let newDateStr = act.date || act.time || '';
  if (newDateInput) {
    const formattedDay = inputValToDate(newDateInput);
    const oldParts = String(newDateStr).trim().split(' ');
    newDateStr = oldParts.length > 1 ? `${formattedDay} ${oldParts.slice(1).join(' ')}` : formattedDay;
  }

  act.title = newTitle;
  act.name = newTitle;
  act.date = newDateStr;
  act.time = newDateStr;
  act.duration = newDuration;
  act.calories = newCalories;
  act.avgHr = newAvgHr;
  act.maxHr = newMaxHr;

  try {
    const updatePayload = {
      name: newTitle,
      duration: newDuration,
      calories: newCalories,
      avg_hr: newAvgHr,
      max_hr: newMaxHr
    };
    if (newDateStr) updatePayload.date = newDateStr;
    await window.supabase.update("activities", `id=eq.${encodeURIComponent(actId)}`, updatePayload);
    closeActivityModal();
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert('✅ 運動紀錄已成功更新並同步至 Supabase 雲端資料庫！');
    showAdminToast(`✅ 已更新運動紀錄 #${actId}`);
  } catch (e) {
    console.error("Save Activity Error:", e);
    alert('❌ 更新失敗：' + e.message);
  }
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
      if (!confirm('確定要以此備份檔案還原至 Supabase 雲端資料庫嗎？此操作將更新賽季設定、快照、英雄與運動紀錄！')) return;

      const configWrites = [];
      if (imported.activeMode) configWrites.push(window.supabase.insert("game_config", { key: "active_mode", value: imported.activeMode }));
      if (imported.boss) configWrites.push(window.supabase.insert("game_config", { key: "boss_config", value: imported.boss }));
      if (imported.classic) configWrites.push(window.supabase.insert("game_config", { key: "classic_config", value: imported.classic }));
      if (imported.rpg) configWrites.push(window.supabase.insert("game_config", { key: "rpg_config", value: imported.rpg }));
      if (imported.faction) configWrites.push(window.supabase.insert("game_config", { key: "faction_config", value: imported.faction }));
      if (imported.survival) configWrites.push(window.supabase.insert("game_config", { key: "survival_config", value: imported.survival }));
      if (imported.base) configWrites.push(window.supabase.insert("game_config", { key: "base_config", value: imported.base }));
      if (imported.bingo) configWrites.push(window.supabase.insert("game_config", { key: "bingo_config", value: imported.bingo }));
      if (Array.isArray(imported.snapshots || imported.archivedSeasons)) {
        configWrites.push(window.supabase.insert("game_config", { key: "snapshots", value: imported.snapshots || imported.archivedSeasons }));
      }
      if (Array.isArray(imported.excludeKeywords)) {
        configWrites.push(window.supabase.insert("game_config", { key: "exclude_keywords", value: imported.excludeKeywords }));
      }
      await Promise.all(configWrites);

      if (Array.isArray(imported.heroes) && imported.heroes.length > 0) {
        const heroRows = imported.heroes.map(h => ({
          name: h.name,
          age: h.age || 35,
          max_hr: h.maxHr || h.max_hr || (220 - (h.age || 35)),
          guild: h.guild || '自由英雄',
          rpg_class: h.rpgClass || h.rpg_class || '狂戰士',
          strava_id: h.stravaId || h.strava_id || '',
          avatar: h.avatar || ''
        }));
        await window.supabase.insert("heroes", heroRows);
      }

      if (Array.isArray(imported.activities) && imported.activities.length > 0) {
        const actRows = imported.activities.map(a => ({
          id: String(a.id),
          hero: a.hero || a.heroName,
          date: a.date || a.time || '',
          type: a.type || 'Workout',
          name: a.title || a.name || '運動',
          duration: Number(a.duration) || 0,
          distance: Number(a.distance) || 0,
          elevation: Number(a.elevation) || 0,
          avg_hr: Number(a.avgHr ?? a.avg_hr) || 0,
          max_hr: Number(a.maxHr ?? a.max_hr) || 0,
          calories: Number(a.calories) || 0,
          is_manual: Boolean(a.isManual ?? a.is_manual),
          is_excluded: Boolean(a.isExcluded ?? a.is_excluded)
        }));
        for (let i = 0; i < actRows.length; i += 200) {
          await window.supabase.insert("activities", actRows.slice(i, i + 200));
        }
      }

      if (window.syncFromDatabase) await window.syncFromDatabase();
      alert('🎉 全站備份資料已成功還原至 Supabase 雲端資料庫！');
      window.location.reload();
    } catch (err) {
      console.error("Import Backup Error:", err);
      alert('❌ 匯入失敗：' + (err.message || 'JSON 格式無效！'));
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
2. 點選左側工作流【Strava to Supabase Cloud Crawler】
3. 點選右側藍色【Run workflow】按鈕 ➔ 雲端將在 30 秒內自動爬取並寫入 Supabase 資料庫！

寫入完成後，全體玩家打開網頁即可秒速看到最新戰況！`;
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

async function saveFactionSettings() {
  try {
    await syncAllSettingsToSupabase("🎉 雙城激戰陣營參數與資料片設定已儲存並同步至雲端！前台看板立即生效！");
  } catch (e) {
    alert("儲存失敗: " + e.message);
  }
}

async function saveSurvivalSettings() {
  try {
    await syncAllSettingsToSupabase("🎉 飢餓法則生存參數與資料片設定已儲存並同步至雲端！前台看板立即生效！");
  } catch (e) {
    alert("儲存失敗: " + e.message);
  }
}

async function saveBaseSettings() {
  try {
    await syncAllSettingsToSupabase("🎉 鋼鐵要塞資源門檻與資料片設定已儲存並同步至雲端！前台看板立即生效！");
  } catch (e) {
    alert("儲存失敗: " + e.message);
  }
}

async function saveBingoSettings() {
  try {
    await syncAllSettingsToSupabase("🎉 戰神拼圖難度倍率與資料片設定已儲存並同步至雲端！前台看板立即生效！");
  } catch (e) {
    alert("儲存失敗: " + e.message);
  }
}

async function saveExcludeKeywordsToSupabase() {
  const raw = document.getElementById('cfg-exclude-keywords')?.value || '';
  const kws = raw
    .split(/[,，、\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!gameState) gameState = {};
  gameState.excludeKeywords = kws;

  try {
    await window.supabase.insert("game_config", { key: "exclude_keywords", value: kws });
    if (window.syncFromDatabase) await window.syncFromDatabase();
    alert(`✅ 爬蟲剃除關鍵字已成功儲存至 Supabase 雲端資料庫！\n目前排除清單：${kws.join(', ') || '無'}`);
    showAdminToast("✅ 已更新爬蟲剃除關鍵字設定！");
  } catch (e) {
    console.error("Save Exclude Keywords Error:", e);
    alert("❌ 儲存失敗：" + e.message);
  }
}

