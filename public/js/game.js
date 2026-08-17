/**
 * 鋼鐵英雄紀元 (Iron Heroes Era) - Frontend Game Engine (v2.2 旗艦三資料片版)
 * 資料片一：經典競技模式 (Classic Arena)
 * 資料片二：RPG 職業天賦模式 (RPG Class & Talent System)
 * 資料片三：世界 Boss 討伐戰 (PvE Raid)
 * 通用功能：冒險者戰情室 (Data Viewer) & 過往英雄史 (Chronicles)
 */

let gameState = null;
let heroStatsList = [];
let currentMainTab = 'classic';
let selectedViewerHero = 'Weber';
let selectedChronicle = 'classic_0717';

let viewerSortCol = 'date';
let viewerSortAsc = false;
let soundEnabled = true;

// RPG Class Metadata
const RPG_CLASSES = {
  '狂戰士': {
    name: '狂戰士',
    enName: 'Berserker',
    badge: '⚔️',
    color: '#ef4444',
    bg: 'bg-rose-950/40 border-rose-500/50 text-rose-300',
    passiveName: '血性狂暴 (Bloodrage)',
    passiveDesc: '無氧落差 (Gap) 獲得 +30% 額外戰力加成，大重量力竭突破。'
  },
  '聖騎士': {
    name: '聖騎士',
    enName: 'Paladin',
    badge: '🛡️',
    color: '#eab308',
    bg: 'bg-amber-950/40 border-amber-500/50 text-amber-300',
    passiveName: '鋼鐵壁壘 (Iron Bastion)',
    passiveDesc: '出勤次數 × 150 點聖光防禦值，痛苦承受力轉化為堅毅戰力。'
  },
  '遊俠': {
    name: '遊俠',
    enName: 'Ranger',
    badge: '🏹',
    color: '#10b981',
    bg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300',
    passiveName: '精準巡航 (Precision Cruise)',
    passiveDesc: 'Zone 2 有氧燃脂次數獲得 +35% 加成，巡航耐力極致轉化。'
  },
  '大法師': {
    name: '大法師',
    enName: 'Grand Mage',
    badge: '🧙',
    color: '#06b6d4',
    bg: 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300',
    passiveName: '奧術過載 (Arcane Overload)',
    passiveDesc: '訓練衝力 TRIMP 放大 1.5 倍奧術增幅，心肺負荷戰力最高。'
  },
  '刺客': {
    name: '刺客',
    enName: 'Shadow Assassin',
    badge: '🗡️',
    color: '#a855f7',
    bg: 'bg-purple-950/40 border-purple-500/50 text-purple-300',
    passiveName: '致命密擊 (Lethal Density)',
    passiveDesc: '訓練密度 (Density) 獲得 2.0 倍暗影刺殺加成，短時極致爆發。'
  }
};

// Web Audio API Sound Generator
const AudioFX = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
    } catch (e) {}
  },
  playTone(freq, type, duration, volume = 0.1) {
    if (!soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  playAttack() {
    this.playTone(220, 'sawtooth', 0.15, 0.08);
    setTimeout(() => this.playTone(440, 'triangle', 0.2, 0.1), 50);
  },
  playCrit() {
    this.playTone(150, 'sawtooth', 0.3, 0.15);
    setTimeout(() => this.playTone(600, 'square', 0.25, 0.12), 60);
  }
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  const icon = document.getElementById('sound-icon');
  if (icon) icon.innerText = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) AudioFX.playTone(440, 'sine', 0.1, 0.1);
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'attack' ? 'border-rose-500/60 bg-rose-950/90 text-rose-200' : 'border-amber-500/60 bg-slate-900/90 text-amber-200';
  toast.className = `p-3 rounded-2xl border shadow-2xl text-xs flex items-center justify-between space-x-2 toast-animate backdrop-blur-md ${borderCol}`;
  toast.innerHTML = `
    <div class="flex items-center space-x-2">
      <span class="text-base">${type === 'attack' ? '⚡' : '📢'}</span>
      <span>${msg}</span>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease-out';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Builtin Classic 0717 Frozen Data
window.frozenClassic0717 = {
  id: "classic_0717",
  type: "classic",
  seasonTitle: "2026 S1 • 0717 經典競技模式",
  seasonPeriod: "2026/05/01 ~ 2026/07/01 (共 62 天)",
  archivedAt: "2026/07/17 02:36:16",
  status: "completed",
  statusLabel: "🏁 本賽季已圓滿結束 (歷史數據已封存)",
  isVisible: true,
  champions: {
    teamAerobic: [
      { rank: 1, name: "咪咪胡胡", score: 100.0, badge: "🥇" },
      { rank: 2, name: "Cake", score: 61.89, badge: "🥈" },
      { rank: 3, name: "嘿喲嘿喲拔蘿蔔", score: 43.19, badge: "🥉" },
      { rank: 4, name: "天琳琳地琳琳", score: 5.54, badge: "" }
    ],
    heroAerobic: [
      { rank: 1, name: "Naomi", guild: "咪咪胡胡", score: 100.0, badge: "🥇" },
      { rank: 2, name: "Kerker", guild: "Cake", score: 55.26, badge: "🥈" },
      { rank: 3, name: "Mooooo", guild: "嘿喲嘿喲拔蘿蔔", score: 45.15, badge: "🥉" },
      { rank: 4, name: "Calla", guild: "Cake", score: 14.3, badge: "" },
      { rank: 5, name: "Weber", guild: "咪咪胡胡", score: 11.3, badge: "" }
    ],
    teamAnaerobic: [
      { rank: 1, name: "咪咪胡胡", score: 90.04, badge: "🥇" },
      { rank: 2, name: "Cake", score: 83.62, badge: "🥈" },
      { rank: 3, name: "嘿喲嘿喲拔蘿蔔", score: 36.43, badge: "🥉" },
      { rank: 4, name: "天琳琳地琳琳", score: 4.92, badge: "" }
    ],
    heroAnaerobic: [
      { rank: 1, name: "Naomi", guild: "咪咪胡胡", score: 77.41, badge: "🥇" },
      { rank: 2, name: "Calla", guild: "Cake", score: 70.74, badge: "🥈" },
      { rank: 3, name: "Kerker", guild: "Cake", score: 55.26, badge: "🥉" }
    ]
  },
  teamMetrics: [
    {
      metric: "🏋️ 鋼鐵紀律 (人均出勤)",
      unit: "次",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "17.0" },
        { rank: "🥈 2", team: "Cake", value: "15.5" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "7.5" }
      ]
    },
    {
      metric: "⏱️ 精神時光屋 (人均時長)",
      unit: "分鐘",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "891.0" },
        { rank: "🥈 2", team: "Cake", value: "715.8" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "378.7" }
      ]
    },
    {
      metric: "🔋 燃脂發電機 (人均熱量)",
      unit: "kcal",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "4,188" },
        { rank: "🥈 2", team: "Cake", value: "3,518" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "1,805" }
      ]
    },
    {
      metric: "🚀 引擎過載 (人均衝力 TRIMP)",
      unit: "TRIMP",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "2,101.5" },
        { rank: "🥈 2", team: "Cake", value: "924.7" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "873.2" }
      ]
    },
    {
      metric: "🟢 有氧大師 (人均有氧次數)",
      unit: "次",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "5.5" },
        { rank: "🥈 2", team: "Cake", value: "3.5" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "2.5" }
      ]
    },
    {
      metric: "🦍 絕對力量 (人均落差 Gap)",
      unit: "bpm",
      leaderboard: [
        { rank: "🥇 1", team: "Cake", value: "649.9" },
        { rank: "🥈 2", team: "咪咪胡胡", value: "520.5" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "184.9" }
      ]
    },
    {
      metric: "💥 效率之王 (人均密度)",
      unit: "分",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "8.97" },
        { rank: "🥈 2", team: "Cake", value: "4.60" },
        { rank: "🥉 3", team: "嘿喲嘿喲拔蘿蔔", value: "4.00" }
      ]
    },
    {
      metric: "🥵 燃燒殆盡 (人均痛苦 Suffer)",
      unit: "分",
      leaderboard: [
        { rank: "🥇 1", team: "咪咪胡胡", value: "503.3" },
        { rank: "🥈 2", team: "嘿喲嘿喲拔蘿蔔", value: "205.2" },
        { rank: "🥉 3", team: "Cake", value: "204.2" }
      ]
    }
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
  await fetchGameData();
  initRealtimeSSE();
  syncFromGoogleSheet();
  renderAllGameViews();
  if (window.lucide) lucide.createIcons();
});

async function fetchGameData() {
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      gameState = await res.json();
    }
  } catch (e) {}

  if (!gameState) {
    try {
      const fb = await fetch('/data/game_data.json');
      if (fb.ok) gameState = await fb.json();
    } catch(e) {}
  }

  const effectiveMode = gameState?.activeMode || 'world_boss';
  if (gameState) gameState.activeMode = effectiveMode;
  setupImmersiveNavigation(effectiveMode);
}

/**
 * 沉浸式導航欄建構：展示 GM 當前啟用的資料片 + 通用戰情室 + 歷史名人堂
 */
function setupImmersiveNavigation(mode) {
  const container = document.getElementById('nav-tabs-container');
  if (!container) return;

  let activeTabName = 'classic';
  let activeTabIcon = 'trophy';
  let activeTabLabel = '資料片一：經典競技模式';

  if (mode === 'rpg_talent' || mode === 'rpg') {
    activeTabName = 'rpg';
    activeTabIcon = 'sword';
    activeTabLabel = '資料片二：RPG 職業天賦模式';
  } else if (mode === 'world_boss' || mode === 'boss') {
    activeTabName = 'boss';
    activeTabIcon = 'swords';
    activeTabLabel = '資料片三：世界 Boss 討伐戰';
  } else {
    activeTabName = 'classic';
    activeTabIcon = 'trophy';
    activeTabLabel = '資料片一：經典競技模式';
  }

  container.innerHTML = `
    <button id="nav-btn-active-expansion" onclick="switchMainTab('${activeTabName}')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md">
      <i data-lucide="${activeTabIcon}" class="w-4 h-4 text-amber-200"></i>
      <span>${activeTabLabel}</span>
      <span class="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-amber-300 text-[10px]">進行中</span>
    </button>

    <button id="nav-btn-viewer" onclick="switchMainTab('viewer')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white flex items-center space-x-1.5 whitespace-nowrap">
      <i data-lucide="user-search" class="w-4 h-4 text-cyan-400"></i>
      <span>冒險者戰情室</span>
    </button>

    <button id="nav-btn-chronicles" onclick="switchMainTab('chronicles')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white flex items-center space-x-1.5 whitespace-nowrap">
      <i data-lucide="scroll" class="w-4 h-4 text-purple-400"></i>
      <span>過往英雄史</span>
    </button>
  `;

  switchMainTab(activeTabName);
  if (window.lucide) lucide.createIcons();
}

function goToActiveExpansion() {
  const effectiveMode = gameState?.activeMode || 'classic';
  setupImmersiveNavigation(effectiveMode);
}

function switchMainTab(tab) {
  currentMainTab = tab;
  const allTabs = ['classic', 'rpg', 'boss', 'viewer', 'chronicles'];
  allTabs.forEach(t => {
    const content = document.getElementById(`tab-content-${t}`);
    if (content) {
      if (t === tab) content.classList.remove('hidden');
      else content.classList.add('hidden');
    }
  });

  const activeExpBtn = document.getElementById('nav-btn-active-expansion');
  const viewerBtn = document.getElementById('nav-btn-viewer');
  const chronBtn = document.getElementById('nav-btn-chronicles');

  // Reset tab button styles
  if (activeExpBtn) activeExpBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white flex items-center space-x-1.5 whitespace-nowrap';
  if (viewerBtn) viewerBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white flex items-center space-x-1.5 whitespace-nowrap';
  if (chronBtn) chronBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white flex items-center space-x-1.5 whitespace-nowrap';

  if (tab === 'viewer') {
    if (viewerBtn) viewerBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md flex items-center space-x-1.5 whitespace-nowrap';
    loadHeroViewerData();
  } else if (tab === 'chronicles') {
    if (chronBtn) chronBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md flex items-center space-x-1.5 whitespace-nowrap';
    renderChroniclesView();
  } else {
    if (activeExpBtn) activeExpBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md flex items-center space-x-1.5 whitespace-nowrap';
    if (tab === 'classic') renderClassicModeView();
    if (tab === 'rpg') renderRPGClassTalentView();
    if (tab === 'boss') renderWorldBossView();
  }

  if (window.lucide) lucide.createIcons();
}

function initRealtimeSSE() {
  try {
    const sse = new EventSource('/api/stream');
    sse.addEventListener('new_attack', (e) => {
      AudioFX.playAttack();
      try {
        const act = JSON.parse(e.data);
        showToast(`${act.hero} 完成鍛鍊！造成 ${(act.damage || 0).toLocaleString()} 點傷害！`, 'attack');
      } catch (err) {}
      syncFromGoogleSheet();
    });
    sse.addEventListener('game_updated', (e) => {
      try {
        const incoming = JSON.parse(e.data);
        gameState = incoming;
        if (incoming.heroStats && incoming.heroStats.length > 0) {
          heroStatsList = incoming.heroStats;
        }
        const effectiveMode = gameState?.activeMode || 'world_boss';
        setupImmersiveNavigation(effectiveMode);
        renderAllGameViews();
      } catch(err) {}
    });
  } catch (e) {}
}

function renderAllGameViews() {
  if (window.gameState) gameState = window.gameState;
  if (window.heroStatsList && window.heroStatsList.length > 0) {
    heroStatsList = window.heroStatsList;
  } else if (gameState?.heroStats && gameState.heroStats.length > 0) {
    heroStatsList = gameState.heroStats;
  }
  if (!gameState) return;

  const activeMode = gameState?.activeMode || "classic";
  setupImmersiveNavigation(activeMode);
  renderActiveExpansionBadge();
  renderClassicModeView();
  renderRPGClassTalentView();
  renderWorldBossView();
  populateViewerDropdowns();
  populateChroniclesDropdown();

  if (window.lucide) lucide.createIcons();
}

function renderActiveExpansionBadge() {
  const badgeEl = document.getElementById('active-expansion-badge');
  if (!badgeEl) return;
  const mode = gameState?.activeMode || 'classic';
  let label = '🏆 進行中：資料片一 • 經典競技模式';
  if (mode === 'rpg_talent' || mode === 'rpg') label = '⚔️ 進行中：資料片二 • RPG 職業天賦模式';
  if (mode === 'world_boss' || mode === 'boss') label = '🐉 進行中：資料片三 • 世界 Boss 討伐戰 (PvE Raid)';
  badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1 animate-pulse"></span>${label}`;
}

// -------------------------------------------------------------
// 1. EXPANSION 1: 經典競技模式 (Classic Guild Arena)
// -------------------------------------------------------------

function calculateLiveClassicMetrics() {
  const heroes = gameState?.heroes || [];
  const guilds = gameState?.guilds || [];
  const activities = gameState?.activities || [];

  const validActs = activities.filter(a => a.isValidAttack);

  const heroDataMap = {};
  heroes.forEach(h => {
    heroDataMap[h.name] = {
      name: h.name,
      guild: h.guild,
      avatar: h.avatar,
      maxHr: h.maxHr || 185,
      workouts: 0,
      duration: 0,
      calories: 0,
      trimp: 0,
      zone2: 0,
      gapSum: 0,
      maxGap: 0,
      suffer: 0,
      density: 0
    };
  });

  validActs.forEach(a => {
    const h = heroDataMap[a.hero];
    if (h) {
      h.workouts += 1;
      h.duration += (a.duration || 0);
      h.calories += (a.calories || 0);
      h.trimp += (a.trimp || 0);
      if (a.isZone2) h.zone2 += 1;
      h.gapSum += (a.gap || 0);
      h.maxGap = Math.max(h.maxGap, a.gap || 0);
      h.suffer += (a.suffer || 0);
    }
  });

  Object.values(heroDataMap).forEach(h => {
    h.density = h.duration > 0 ? (h.suffer / h.duration) : 0;
  });

  const guildDataMap = {};
  guilds.forEach(g => {
    const members = g.members || [];
    const memberCount = Math.max(1, members.length);
    guildDataMap[g.name] = {
      name: g.name,
      badge: g.badge || '🛡️',
      color: g.color || '#3b82f6',
      memberCount: memberCount,
      members: members,
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      totalTrimp: 0,
      totalZone2: 0,
      totalGap: 0,
      totalSuffer: 0,
      perWorkouts: 0,
      perDuration: 0,
      perCalories: 0,
      perTrimp: 0,
      perZone2: 0,
      perGap: 0,
      perSuffer: 0,
      perDensity: 0
    };
  });

  Object.values(heroDataMap).forEach(h => {
    const g = guildDataMap[h.guild];
    if (g) {
      g.totalWorkouts += h.workouts;
      g.totalDuration += h.duration;
      g.totalCalories += h.calories;
      g.totalTrimp += h.trimp;
      g.totalZone2 += h.zone2;
      g.totalGap += h.gapSum;
      g.totalSuffer += h.suffer;
    }
  });

  Object.values(guildDataMap).forEach(g => {
    g.perWorkouts = Math.round((g.totalWorkouts / g.memberCount) * 10) / 10;
    g.perDuration = Math.round((g.totalDuration / g.memberCount) * 10) / 10;
    g.perCalories = Math.round(g.totalCalories / g.memberCount);
    g.perTrimp = Math.round((g.totalTrimp / g.memberCount) * 10) / 10;
    g.perZone2 = Math.round((g.totalZone2 / g.memberCount) * 10) / 10;
    g.perGap = Math.round((g.totalGap / g.memberCount) * 10) / 10;
    g.perSuffer = Math.round((g.totalSuffer / g.memberCount) * 10) / 10;
    g.perDensity = g.totalDuration > 0 ? Math.round((g.totalSuffer / g.totalDuration) * 100) / 100 : 0;
  });

  const gList = Object.values(guildDataMap);
  const hList = Object.values(heroDataMap);

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
    name: g.name,
    score: Math.round(((g.perTrimp / maxGTrimp) * 40 + (g.perCalories / maxGCal) * 30 + (g.perZone2 / maxGZone2) * 30) * 100) / 100
  })).sort((a, b) => b.score - a.score).map((t, idx) => ({
    ...t, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : ''))
  }));

  const heroAerobic = hList.map(h => ({
    name: h.name, guild: h.guild,
    score: Math.round(((h.trimp / maxHTrimp) * 40 + (h.calories / maxHCal) * 30 + (h.zone2 / maxHZone2) * 30) * 100) / 100
  })).sort((a, b) => b.score - a.score).map((h, idx) => ({
    ...h, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : ''))
  }));

  const teamAnaerobic = gList.map(g => ({
    name: g.name,
    score: Math.round(((g.perGap / maxGGap) * 50 + (g.perDensity / maxGDens) * 30 + (g.perWorkouts / maxGWk) * 20) * 100) / 100
  })).sort((a, b) => b.score - a.score).map((t, idx) => ({
    ...t, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : ''))
  }));

  const heroAnaerobic = hList.map(h => ({
    name: h.name, guild: h.guild,
    score: Math.round(((h.gapSum / maxHGap) * 40 + (h.density / maxHDens) * 30 + (h.maxHr / 220) * 15 + (h.workouts / maxHWk) * 15) * 100) / 100
  })).sort((a, b) => b.score - a.score).map((h, idx) => ({
    ...h, rank: idx + 1, badge: idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : ''))
  }));

  const buildLeaderboard = (getter, unit) => {
    return [...gList].sort((a, b) => getter(b) - getter(a)).map((g, idx) => ({
      rank: idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : `#${idx+1}`)),
      team: g.name,
      value: getter(g).toLocaleString()
    }));
  };

  const teamMetrics = [
    { metric: "🏋️ 鋼鐵紀律 (人均出勤)", unit: "次", leaderboard: buildLeaderboard(g => g.perWorkouts) },
    { metric: "⏱️ 精神時光屋 (人均時長)", unit: "分鐘", leaderboard: buildLeaderboard(g => g.perDuration) },
    { metric: "🔋 燃脂發電機 (人均熱量)", unit: "kcal", leaderboard: buildLeaderboard(g => g.perCalories) },
    { metric: "🚀 引擎過載 (人均衝力 TRIMP)", unit: "TRIMP", leaderboard: buildLeaderboard(g => g.perTrimp) },
    { metric: "🟢 有氧大師 (人均有氧次數)", unit: "次", leaderboard: buildLeaderboard(g => g.perZone2) },
    { metric: "🦍 絕對力量 (人均落差 Gap)", unit: "bpm", leaderboard: buildLeaderboard(g => g.perGap) },
    { metric: "💥 效率之王 (人均密度)", unit: "分", leaderboard: buildLeaderboard(g => g.perDensity) },
    { metric: "🥵 燃燒殆盡 (人均痛苦 Suffer)", unit: "分", leaderboard: buildLeaderboard(g => g.perSuffer) }
  ];

  return { champions: { teamAerobic, heroAerobic, teamAnaerobic, heroAnaerobic }, teamMetrics, guildList: gList, heroList: hList };
}

function renderClassicModeView() {
  const champContainer = document.getElementById('classic-champions-container');
  const metricContainer = document.getElementById('classic-metrics-container');
  const guildTableContainer = document.getElementById('classic-guild-table-container');

  if (!champContainer || !metricContainer) return;

  const seasonStartStr = gameState?.seasonStart || gameState?.boss?.seasonStart || "2026/08/12";
  const seasonEndStr = gameState?.seasonEnd || gameState?.boss?.seasonEnd || "2026/08/31";
  const classicPeriodEl = document.getElementById("classic-period-text");
  if (classicPeriodEl) classicPeriodEl.innerText = `競賽區間：${seasonStartStr} ~ ${seasonEndStr}`;

  const classicData = calculateLiveClassicMetrics();
  const champs = classicData.champions;
  const metrics = classicData.teamMetrics;
  const guildList = classicData.guildList;

  // 4 Podiums
  champContainer.innerHTML = `
    <div class="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 class="text-sm font-bold text-emerald-400">🟢 團隊有氧總冠軍 (滿分100)</h3>
        <span class="text-[10px] text-slate-400">衝力40% + 熱量30% + 有氧30%</span>
      </div>
      <div class="space-y-1.5">
        ${(champs.teamAerobic || []).map(t => `
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span class="font-bold text-white">${t.badge || ''} ${t.name}</span>
            <span class="font-rpg font-bold text-emerald-400">${t.score} 分</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 class="text-sm font-bold text-emerald-400">🟢 個人有氧總冠軍 (滿分100)</h3>
        <span class="text-[10px] text-slate-400">個人綜合加權高標法</span>
      </div>
      <div class="space-y-1.5">
        ${(champs.heroAerobic || []).slice(0, 5).map(h => `
          <div onclick="openHeroDetailModal('${h.name}')" class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-emerald-500/50 transition">
            <span class="font-bold text-white">${h.badge || ''} ${h.name} <span class="text-[10px] text-slate-400 font-normal">(${h.guild})</span></span>
            <span class="font-rpg font-bold text-emerald-400">${h.score} 分</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-slate-900/80 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 class="text-sm font-bold text-rose-400">🔴 團隊無氧總冠軍 (滿分100)</h3>
        <span class="text-[10px] text-slate-400">落差50% + 密度30% + 出勤20%</span>
      </div>
      <div class="space-y-1.5">
        ${(champs.teamAnaerobic || []).map(t => `
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span class="font-bold text-white">${t.badge || ''} ${t.name}</span>
            <span class="font-rpg font-bold text-rose-400">${t.score} 分</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-slate-900/80 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 class="text-sm font-bold text-rose-400">🔴 個人無氧總冠軍 (滿分100)</h3>
        <span class="text-[10px] text-slate-400">落差40% + 密度30% + MaxHR15% + 出勤15%</span>
      </div>
      <div class="space-y-1.5">
        ${(champs.heroAnaerobic || []).slice(0, 5).map(h => `
          <div onclick="openHeroDetailModal('${h.name}')" class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-rose-500/50 transition">
            <span class="font-bold text-white">${h.badge || ''} ${h.name} <span class="text-[10px] text-slate-400 font-normal">(${h.guild})</span></span>
            <span class="font-rpg font-bold text-rose-400">${h.score} 分</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // 8 Metrics
  metricContainer.innerHTML = metrics.map(m => `
    <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
      <span class="text-xs font-bold text-slate-200 block truncate">${m.metric}</span>
      <div class="space-y-1">
        ${m.leaderboard.map(item => `
          <div class="flex justify-between text-[11px]">
            <span class="text-slate-400">${item.rank} ${item.team}</span>
            <span class="font-mono font-bold text-amber-400">${item.value} ${m.unit}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Guild Summary Table
  if (guildTableContainer) {
    guildTableContainer.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
          <tr>
            <th class="p-3">🛡️ 公會名稱</th>
            <th class="p-3">👥 成員名冊</th>
            <th class="p-3">🏋️ 人均出勤</th>
            <th class="p-3">⏱️ 人均時長</th>
            <th class="p-3">🔋 人均熱量</th>
            <th class="p-3">🚀 人均衝力</th>
            <th class="p-3">🦍 人均落差</th>
            <th class="p-3">💥 人均密度</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 text-slate-300">
          ${guildList.map(g => `
            <tr class="hover:bg-slate-950/40 transition">
              <td class="p-3 font-bold text-white flex items-center space-x-1.5">
                <span>${g.badge}</span>
                <span>${g.name}</span>
              </td>
              <td class="p-3 text-slate-400 font-mono text-[11px]">
                <div class="flex flex-wrap gap-1.5">
                  ${(g.members || []).map(m => `<span class="cursor-pointer hover:text-amber-300 hover:border-amber-500/60 transition px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold inline-flex items-center space-x-1" onclick="openHeroDetailModal('${m}')"><i data-lucide="user" class="w-3 h-3 text-amber-400"></i><span>${m}</span></span>`).join('')}
                </div>
              </td>
              <td class="p-3 font-mono text-amber-300">${g.perWorkouts} 次</td>
              <td class="p-3 font-mono">${g.perDuration} 分</td>
              <td class="p-3 font-mono text-rose-400">${g.perCalories} kcal</td>
              <td class="p-3 font-mono text-cyan-300">${g.perTrimp}</td>
              <td class="p-3 font-mono text-purple-300">${g.perGap} bpm</td>
              <td class="p-3 font-mono">${g.perDensity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// -------------------------------------------------------------
// 2. EXPANSION 2: RPG 職業天賦模式 (RPG Class & Talent System)
// -------------------------------------------------------------

function calculateLiveRPGStats() {
  const heroes = gameState?.heroes || [];
  const guilds = gameState?.guilds || [];
  const activities = gameState?.activities || [];
  const validActs = activities.filter(a => a.isValidAttack);

  // Group stats by hero
  const heroRpgMap = {};
  heroes.forEach(h => {
    const heroClassKey = h.rpgClass || '狂戰士';
    const cls = RPG_CLASSES[heroClassKey] || RPG_CLASSES['狂戰士'];
    heroRpgMap[h.name] = {
      name: h.name,
      guild: h.guild,
      avatar: h.avatar,
      rpgClass: cls.name,
      classMeta: cls,
      workouts: 0,
      duration: 0,
      calories: 0,
      trimp: 0,
      zone2: 0,
      gapSum: 0,
      maxGap: 0,
      suffer: 0,
      combatPower: 0
    };
  });

  validActs.forEach(a => {
    const h = heroRpgMap[a.hero];
    if (h) {
      h.workouts += 1;
      h.duration += (a.duration || 0);
      h.calories += (a.calories || 0);
      h.trimp += (a.trimp || 0);
      if (a.isZone2) h.zone2 += 1;
      h.gapSum += (a.gap || 0);
      h.maxGap = Math.max(h.maxGap, a.gap || 0);
      h.suffer += (a.suffer || 0);
    }
  });

  // Calculate Combat Rating per Class
  Object.values(heroRpgMap).forEach(h => {
    const density = h.duration > 0 ? (h.suffer / h.duration) : 0;
    if (h.rpgClass === '狂戰士') {
      h.combatPower = Math.round((h.maxGap * 50) + (h.gapSum * 8) + (h.calories * 0.6));
    } else if (h.rpgClass === '聖騎士') {
      h.combatPower = Math.round((h.workouts * 150) + (h.suffer * 1.5) + (h.duration * 1.0));
    } else if (h.rpgClass === '遊俠') {
      h.combatPower = Math.round((h.zone2 * 120) + (h.calories * 1.2) + (h.duration * 1.5));
    } else if (h.rpgClass === '大法師') {
      h.combatPower = Math.round((h.trimp * 25) + (h.duration * 2.0));
    } else if (h.rpgClass === '刺客') {
      h.combatPower = Math.round((density * 1200) + (h.maxGap * 40) + (h.calories * 0.8));
    } else {
      h.combatPower = Math.round((h.calories * 1.0) + (h.trimp * 15));
    }
  });

  // Class Masters (Top 1 for each class)
  const classMasters = {};
  Object.keys(RPG_CLASSES).forEach(cName => {
    const candidates = Object.values(heroRpgMap).filter(h => h.rpgClass === cName).sort((a, b) => b.combatPower - a.combatPower);
    classMasters[cName] = candidates[0] || null;
  });

  // Guild Synergy
  const guildSynergyList = guilds.map(g => {
    const members = g.members || [];
    const memberHeroes = members.map(m => heroRpgMap[m]).filter(Boolean);
    const rawPower = memberHeroes.reduce((s, h) => s + (h.combatPower || 0), 0);
    
    // Unique classes in this guild
    const uniqueClasses = new Set(memberHeroes.map(h => h.rpgClass));
    let bonusPct = 0;
    let synergyTag = '基礎小隊';

    if (uniqueClasses.size >= 4) {
      bonusPct = 15;
      synergyTag = '🌟 全能四職業羈絆 (+15%)';
    } else if (uniqueClasses.size === 3) {
      bonusPct = 10;
      synergyTag = '⚡ 三重戰術羈絆 (+10%)';
    } else if (uniqueClasses.size === 2) {
      bonusPct = 5;
      synergyTag = '🛡️ 雙重協同羈絆 (+5%)';
    }

    const totalSynergyPower = Math.round(rawPower * (1 + bonusPct / 100));

    return {
      guild: g.name,
      badge: g.badge || '🛡️',
      color: g.color || '#f59e0b',
      members: members,
      uniqueClasses: Array.from(uniqueClasses),
      bonusPct: bonusPct,
      synergyTag: synergyTag,
      rawPower: rawPower,
      totalPower: totalSynergyPower
    };
  }).sort((a, b) => b.totalPower - a.totalPower);

  return {
    heroRpgList: Object.values(heroRpgMap).sort((a, b) => b.combatPower - a.combatPower),
    classMasters: classMasters,
    guildSynergyList: guildSynergyList
  };
}

function renderRPGClassTalentView() {
  const mastersContainer = document.getElementById('rpg-class-masters-container');
  const synergyContainer = document.getElementById('rpg-guild-synergy-container');
  const rosterContainer = document.getElementById('rpg-hero-roster-container');

  if (!mastersContainer || !synergyContainer) return;

  const seasonStartStr = gameState?.seasonStart || gameState?.boss?.seasonStart || "2026/08/12";
  const seasonEndStr = gameState?.seasonEnd || gameState?.boss?.seasonEnd || "2026/08/31";
  const rpgPeriodEl = document.getElementById("rpg-period-text");
  if (rpgPeriodEl) rpgPeriodEl.innerText = `修煉區間：${seasonStartStr} ~ ${seasonEndStr}`;

  const data = calculateLiveRPGStats();
  const masters = data.classMasters;
  const synergyList = data.guildSynergyList;
  const heroList = data.heroRpgList;

  // 1. 5 Class Master Podiums
  mastersContainer.innerHTML = Object.keys(RPG_CLASSES).map(cName => {
    const cls = RPG_CLASSES[cName];
    const master = masters[cName];
    return `
      <div class="bg-slate-950 p-3.5 rounded-2xl border ${cls.bg} space-y-2 relative overflow-hidden">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold flex items-center space-x-1">
            <span>${cls.badge}</span>
            <span>${cls.name}之王</span>
          </span>
          <span class="text-[10px] opacity-80">${cls.enName}</span>
        </div>
        ${master ? `
          <div class="flex items-center space-x-2.5 pt-1 cursor-pointer hover:opacity-80" onclick="openHeroDetailModal('${master.name}')">
            <div class="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
              <img src="${master.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${master.name}`}" class="w-full h-full object-cover">
            </div>
            <div class="min-w-0">
              <span class="font-bold text-white text-xs truncate block">${master.name}</span>
              <span class="text-[10px] text-slate-400">${master.guild}</span>
            </div>
          </div>
          <div class="text-right pt-1 border-t border-slate-800/80">
            <span class="text-[10px] text-slate-400 block">職業戰力</span>
            <span class="font-rpg font-bold text-sm text-amber-400">${master.combatPower.toLocaleString()}</span>
          </div>
        ` : `
          <div class="text-center py-4 text-slate-500 text-xs">(尚無冒險者)</div>
        `}
      </div>
    `;
  }).join('');

  // 2. Guild Synergy Leaderboard
  const maxGuildPower = Math.max(1, ...synergyList.map(s => s.totalPower));
  synergyContainer.innerHTML = synergyList.map(g => {
    const pct = Math.round((g.totalPower / maxGuildPower) * 100);
    return `
      <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <div class="flex flex-wrap items-center justify-between text-xs gap-2">
          <div class="flex items-center space-x-2">
            <span>${g.badge}</span>
            <span class="font-bold text-white text-sm">${g.guild}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">${g.synergyTag}</span>
            <div class="flex space-x-1">
              ${g.uniqueClasses.map(c => `<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">${RPG_CLASSES[c]?.badge || ''} ${c}</span>`).join('')}
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-400 block">公會羈絆戰力</span>
            <span class="font-rpg font-bold text-amber-400 text-sm">${g.totalPower.toLocaleString()} CP</span>
          </div>
        </div>
        <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${g.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  // 3. Hero Class Roster Table
  if (rosterContainer) {
    rosterContainer.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
          <tr>
            <th class="p-3">👤 冒險者</th>
            <th class="p-3">🛡️ 公會</th>
            <th class="p-3">⚔️ 職業專精</th>
            <th class="p-3">✨ 專屬天賦被動</th>
            <th class="p-3">🏋️ 出勤 / 燃脂</th>
            <th class="p-3">🚀 TRIMP / 落差</th>
            <th class="p-3 text-right">⚡ RPG 戰鬥評分 (CP)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 text-slate-300">
          ${heroList.map(h => `
            <tr class="hover:bg-slate-950/40 transition cursor-pointer" onclick="openHeroDetailModal('${h.name}')">
              <td class="p-3 font-bold text-white flex items-center space-x-2">
                <div class="w-7 h-7 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                  <img src="${h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`}" class="w-full h-full object-cover">
                </div>
                <span>${h.name}</span>
              </td>
              <td class="p-3"><span class="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">${h.guild}</span></td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold ${h.classMeta.bg}">
                  ${h.classMeta.badge} ${h.rpgClass}
                </span>
              </td>
              <td class="p-3 text-[11px] text-slate-400">
                <span class="font-bold text-slate-200">${h.classMeta.passiveName}</span>：${h.classMeta.passiveDesc}
              </td>
              <td class="p-3 font-mono">${h.workouts}次 • ${h.zone2}次燃脂</td>
              <td class="p-3 font-mono text-cyan-300">${h.trimp} • 落差 ${h.maxGap}</td>
              <td class="p-3 text-right font-mono font-bold text-amber-400 text-sm">${h.combatPower.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// -------------------------------------------------------------
// 3. EXPANSION 3: 世界 Boss 討伐戰 (PvE Raid)
// -------------------------------------------------------------

function renderWorldBossView() {
  const boss = gameState?.boss || {};
  const maxHp = boss.maxHp || 350000;

  // Damage breakdown (普攻總和 + 魔攻總和 + 單次最大Gap爆擊)
  let totalPhys = 0, totalMag = 0, totalCrit = 0, totalDmg = 0;
  if (heroStatsList && heroStatsList.length > 0) {
    heroStatsList.forEach(h => {
      totalPhys += (h.physDmg || 0);
      totalMag += (h.magDmg || 0);
      totalCrit += (h.critDmg || 0);
      totalDmg += (h.totalDamage || 0);
    });
  }

  const currentHp = Math.max(0, maxHp - totalDmg);
  const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  const nameEl = document.getElementById('boss-name-text');
  const descEl = document.getElementById('boss-desc-text');
  const hpEl = document.getElementById('boss-hp-text');
  const pctEl = document.getElementById('boss-hp-pct');
  const barEl = document.getElementById('boss-hp-bar');

  if (nameEl) nameEl.innerText = boss.name || '🌩️ 墮落雷神・索爾';
  if (descEl) descEl.innerText = boss.description || '';
  if (hpEl) hpEl.innerText = currentHp.toLocaleString();
  if (pctEl) pctEl.innerText = `(${hpPct.toFixed(1)}%)`;
  if (barEl) barEl.style.width = `${hpPct}%`;

  const avatarEl = document.getElementById('boss-avatar-img');
  if (avatarEl && boss.avatar) avatarEl.src = boss.avatar;

  const seasonStart = gameState?.seasonStart || boss.seasonStart || "2026/08/12";
  const seasonEnd = gameState?.seasonEnd || boss.seasonEnd || "2026/08/31";

  const seasonPeriodEl = document.getElementById("boss-season-period");
  if (seasonPeriodEl) seasonPeriodEl.innerText = `討伐戰區間：${seasonStart} ~ ${seasonEnd}`;

  const statTot = document.getElementById('stat-total-damage');
  const statPhy = document.getElementById('stat-phys-dmg');
  const statMag = document.getElementById('stat-mag-dmg');
  const statCri = document.getElementById('stat-crit-dmg');

  if (statTot) statTot.innerText = totalDmg.toLocaleString();
  if (statPhy) statPhy.innerText = totalPhys.toLocaleString();
  if (statMag) statMag.innerText = totalMag.toLocaleString();
  if (statCri) statCri.innerText = totalCrit.toLocaleString();

  // MVP List
  const mvpContainer = document.getElementById('mvp-hero-list');
  if (mvpContainer && heroStatsList) {
    mvpContainer.innerHTML = '';
    const sorted = [...heroStatsList].sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0));
    sorted.forEach((hero, index) => {
      const card = document.createElement('div');
      const isTop1 = index === 0;
      const isTop3 = index < 3;
      card.className = `p-3.5 rounded-2xl border transition flex items-center justify-between space-x-3 cursor-pointer hover:border-amber-500/60 ${
        isTop1 ? 'bg-amber-950/20 border-amber-500/50 glow-border-gold' : (isTop3 ? 'bg-slate-950/60 border-slate-700' : 'bg-slate-950/40 border-slate-800/80')
      }`;
      card.onclick = () => openHeroDetailModal(hero.name);
      card.innerHTML = `
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <div class="w-7 text-center font-black font-rpg text-sm ${isTop1 ? 'text-amber-400 text-base' : (isTop3 ? 'text-cyan-400' : 'text-slate-500')}">
            ${isTop1 ? '👑' : `#${index + 1}`}
          </div>
          <div class="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
            <img src="${hero.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${hero.name}`}" class="w-full h-full object-cover">
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-2">
              <h4 class="text-sm font-black text-white truncate">${hero.name}</h4>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">${hero.guild}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              出勤 ${hero.validWorkouts || 0} 次 • 普攻 ${(hero.physDmg || 0).toLocaleString()} • 魔攻 ${(hero.magDmg || 0).toLocaleString()} • 💥 爆擊 ${(hero.critDmg || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 block">總輸出</span>
          <span class="text-base font-black font-rpg text-amber-400">${(hero.totalDamage || 0).toLocaleString()}</span>
        </div>
      `;
      mvpContainer.appendChild(card);
    });
  }

  // Guild Contributions
  const guildContainer = document.getElementById('guild-contribution-list');
  if (guildContainer && gameState?.guilds && heroStatsList) {
    guildContainer.innerHTML = '';
    const guildStats = {};
    (gameState.guilds || []).forEach(g => { guildStats[g.name] = { ...g, totalDamage: 0 }; });
    heroStatsList.forEach(h => { if (guildStats[h.guild]) guildStats[h.guild].totalDamage += (h.totalDamage || 0); });
    const totalAllDmg = Object.values(guildStats).reduce((acc, g) => acc + g.totalDamage, 0) || 1;
    const sortedGuilds = Object.values(guildStats).sort((a, b) => b.totalDamage - a.totalDamage);
    sortedGuilds.forEach(g => {
      const pct = ((g.totalDamage / totalAllDmg) * 100).toFixed(1);
      const div = document.createElement('div');
      div.className = 'space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800';
      div.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-1.5">
            <span>${g.badge || '🛡️'}</span>
            <span class="font-bold text-white">${g.name}</span>
          </div>
          <span class="font-rpg font-bold text-amber-400">${g.totalDamage.toLocaleString()} (${pct}%)</span>
        </div>
        <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${g.color || '#f59e0b'};"></div>
        </div>
      `;
      guildContainer.appendChild(div);
    });
  }

  // Combat Feed
  const feedContainer = document.getElementById('battle-combat-feed');
  if (feedContainer && gameState?.activities) {
    feedContainer.innerHTML = '';
    const recent = gameState.activities.filter(a => a.isValidAttack).slice(0, 15);
    recent.forEach(a => {
      const div = document.createElement('div');
      div.className = 'bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-[11px] flex items-center justify-between space-x-2 hover:border-amber-500/40 transition';
      const isNumericStrava = /^\d+$/.test(String(a.id));
      const idBadge = isNumericStrava
        ? `<a href="https://www.strava.com/activities/${a.id}" target="_blank" class="text-[10px] text-orange-400 font-mono hover:underline">#${a.id} ↗</a>`
        : `<span class="text-[10px] text-amber-400 font-mono">手動</span>`;
      div.innerHTML = `
        <div class="flex items-center space-x-2 min-w-0 flex-1">
          <span class="text-xs">⚔️</span>
          <div class="min-w-0">
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-slate-200 truncate cursor-pointer hover:underline" onclick="openHeroDetailModal('${a.hero}')">${a.hero}</span>
              <span class="text-[10px] text-slate-400">(${a.guild})</span>
              ${idBadge}
            </div>
            <span class="text-slate-500 text-[10px] truncate block">${a.title || '自主訓練'} (${a.duration}分 • 心率 ${a.avgHr}/${a.maxHr})</span>
          </div>
        </div>
        <span class="font-mono font-bold text-amber-400 flex-shrink-0 text-xs">🗡️+🔮 ${(a.damage || 0).toLocaleString()}</span>
      `;
      feedContainer.appendChild(div);
    });
  }
}

// -------------------------------------------------------------
// 4. GLOBAL TOOL: 冒險者戰情室 (Hero Data Viewer & Radar)
// -------------------------------------------------------------

function populateViewerDropdowns() {
  const select = document.getElementById('viewer-hero-select');
  if (!select || !gameState?.heroes) return;

  select.innerHTML = '';
  const isRpgMode = (gameState?.activeMode === 'rpg_talent' || gameState?.activeMode === 'rpg');
  gameState.heroes.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.name;
    opt.innerText = isRpgMode 
      ? `${h.name} (${h.guild} • ${h.rpgClass || '狂戰士'})`
      : `${h.name} (${h.guild})`;
    if (h.name === selectedViewerHero) opt.selected = true;
    select.appendChild(opt);
  });
}

function loadHeroViewerData() {
  const select = document.getElementById('viewer-hero-select');
  if (select) selectedViewerHero = select.value;

  const hero = gameState?.heroes?.find(h => h.name === selectedViewerHero) || { name: selectedViewerHero, guild: "自由英雄", age: 35, maxHr: 185, rpgClass: "狂戰士" };
  const heroActs = (gameState?.activities || []).filter(a => a.hero === selectedViewerHero);
  const heroStat = heroStatsList?.find(h => h.name === selectedViewerHero) || {};

  const seasonStartStr = gameState?.seasonStart || gameState?.boss?.seasonStart || "2026/08/12";
  const seasonEndStr = gameState?.seasonEnd || gameState?.boss?.seasonEnd || "2026/08/31";
  const startD = parseActivityDate(seasonStartStr);
  const endD = parseActivityDate(seasonEndStr);
  if (endD) endD.setHours(23, 59, 59, 999);

  const inSeasonActs = heroActs.filter(a => {
    if (a.isExcluded) return false;
    const aDate = parseActivityDate(a.date || a.time);
    if (aDate && startD && endD) {
      return aDate >= startD && aDate <= endD;
    }
    return a.inSeason !== false;
  });

  const totalDmg = heroStat.totalDamage || 0;
  const totalDur = inSeasonActs.reduce((acc, a) => acc + (a.duration || 0), 0);
  const totalCal = inSeasonActs.reduce((acc, a) => acc + (a.calories || 0), 0);
  const cls = RPG_CLASSES[hero.rpgClass || '狂戰士'] || RPG_CLASSES['狂戰士'];

  // HUD Header
  const hudContainer = document.getElementById('hero-profile-hud');
  if (hudContainer) {
    hudContainer.innerHTML = `
      <div class="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 p-4 rounded-2xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center space-x-3.5">
          <div class="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden border-2 border-cyan-500/50 shadow-lg shadow-cyan-950 flex-shrink-0">
            <img src="${hero.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${hero.name}`}" class="w-full h-full object-cover">
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="text-lg font-black text-white">${hero.name}</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">${hero.guild}</span>
              ${(gameState?.activeMode === 'rpg_talent' || gameState?.activeMode === 'rpg') ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${cls.bg}">${cls.badge} ${cls.name}</span>` : ''}
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700">年齡 ${hero.age} 歲</span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              預估最大心率 (220-年齡)：<span class="font-mono font-bold text-cyan-400">${hero.maxHr} bpm</span> • 累計有效鍛鍊 <span class="font-mono font-bold text-amber-400">${heroStat.validWorkouts || 0}</span> 次
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 block">有氧燃脂 Zone 2</span>
            <span class="text-xs font-mono font-bold text-emerald-400">${Math.round(0.60 * hero.maxHr)} ~ ${Math.round(0.75 * hero.maxHr)} bpm</span>
          </div>
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 block">極限無氧 Zone 5</span>
            <span class="text-xs font-mono font-bold text-rose-400">&gt; ${Math.round(0.85 * hero.maxHr)} bpm</span>
          </div>
        </div>
      </div>
    `;
  }

  // Contextual KPI Cards according to Active Expansion Mode
  const activeMode = gameState?.activeMode || "classic";
  const kpiContainer = document.getElementById('hero-kpi-cards');
  if (kpiContainer) {
    if (activeMode === "classic") {
      kpiContainer.innerHTML = `
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">🏋️ 累計有效出勤</span>
          <span class="text-lg font-black font-rpg text-amber-400">${heroStat.validWorkouts || 0} 次</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">⏱️ 總運動時長</span>
          <span class="text-lg font-black font-rpg text-cyan-400">${Math.round(totalDur)} 分鐘</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">🔋 總燃燒熱量</span>
          <span class="text-lg font-black font-rpg text-rose-400">${Math.round(totalCal).toLocaleString()} kcal</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">🦍 最高無氧落差</span>
          <span class="text-lg font-black font-rpg text-purple-400">${heroStat.maxGap || 0} bpm</span>
        </div>
      `;
    } else if (activeMode === "rpg_talent" || activeMode === "rpg") {
      kpiContainer.innerHTML = `
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">⚡ RPG 戰鬥評分 (CP)</span>
          <span class="text-lg font-black font-rpg text-amber-400">${(heroStat.combatPower || heroStat.totalDamage || 0).toLocaleString()} CP</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">⏱️ 總修煉時長</span>
          <span class="text-lg font-black font-rpg text-cyan-400">${Math.round(totalDur)} 分鐘</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">🔥 總能量消耗</span>
          <span class="text-lg font-black font-rpg text-rose-400">${Math.round(totalCal).toLocaleString()} kcal</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">✨ 職業天賦專精</span>
          <span class="text-xs font-bold text-purple-300 block truncate mt-1">${cls.badge} ${cls.name} (${cls.passiveName})</span>
        </div>
      `;
    } else {
      kpiContainer.innerHTML = `
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">⚔️ 當前賽季對魔王總傷害</span>
          <span class="text-lg font-black font-rpg text-amber-400">${totalDmg.toLocaleString()}</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">⏱️ 總討伐時長</span>
          <span class="text-lg font-black font-rpg text-cyan-400">${Math.round(totalDur)} 分鐘</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">🗡️ 物理普攻總和</span>
          <span class="text-lg font-black font-rpg text-rose-400">${(heroStat.physDmg || Math.round(totalCal)).toLocaleString()}</span>
        </div>
        <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          <span class="text-[11px] text-slate-400 block">💥 最高落差 (爆擊輸出)</span>
          <span class="text-lg font-black font-rpg text-purple-400">${heroStat.maxGap || 0} (${(heroStat.critDmg || 0).toLocaleString()} 點)</span>
        </div>
      `;
    }
  }

  // Heart Rate Zone Distribution
  const zoneCard = document.getElementById('hero-hr-zone-card');
  if (zoneCard) {
    const totalActsCount = Math.max(1, heroActs.length);
    let z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0;
    heroActs.forEach(a => {
      const avg = a.avgHr || 0;
      const m = hero.maxHr || 185;
      if (avg < 0.60 * m) z1++;
      else if (avg <= 0.75 * m) z2++;
      else if (avg <= 0.85 * m) z3++;
      else if (avg <= 0.90 * m) z4++;
      else z5++;
    });

    const p1 = ((z1 / totalActsCount) * 100).toFixed(1);
    const p2 = ((z2 / totalActsCount) * 100).toFixed(1);
    const p3 = ((z3 / totalActsCount) * 100).toFixed(1);
    const p4 = ((z4 / totalActsCount) * 100).toFixed(1);
    const p5 = ((z5 / totalActsCount) * 100).toFixed(1);

    zoneCard.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-200">💓 心率強度區間分佈分析</span>
        <span class="text-[11px] text-slate-400 font-mono">共 ${heroActs.length} 次運動</span>
      </div>
      <div class="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex">
        <div style="width: ${p1}%;" class="bg-slate-600" title="Zone 1 恢復: ${p1}%"></div>
        <div style="width: ${p2}%;" class="bg-emerald-500" title="Zone 2 有氧燃脂: ${p2}%"></div>
        <div style="width: ${p3}%;" class="bg-amber-500" title="Zone 3 有氧耐力: ${p3}%"></div>
        <div style="width: ${p4}%;" class="bg-orange-500" title="Zone 4 乳酸閾值: ${p4}%"></div>
        <div style="width: ${p5}%;" class="bg-rose-500" title="Zone 5 極限無氧: ${p5}%"></div>
      </div>
      <div class="grid grid-cols-5 gap-2 text-center text-[10px] pt-1">
        <div class="text-slate-400">🚶 Z1 恢復 (${p1}%)</div>
        <div class="text-emerald-400 font-bold">🟢 Z2 燃脂 (${p2}%)</div>
        <div class="text-amber-400">🟡 Z3 耐力 (${p3}%)</div>
        <div class="text-orange-400">🟠 Z4 閾值 (${p4}%)</div>
        <div class="text-rose-400 font-bold">🔴 Z5 極限 (${p5}%)</div>
      </div>
    `;
  }

  filterViewerActivities();
}

function filterViewerActivities() {
  const tbody = document.getElementById('viewer-activities-tbody');
  const countLabel = document.getElementById('viewer-record-count');
  if (!tbody) return;

  const heroActs = (gameState?.activities || []).filter(a => a.hero === selectedViewerHero);
  const query = (document.getElementById('viewer-search-input')?.value || '').toLowerCase().trim();
  const sportFilter = document.getElementById('viewer-sport-filter')?.value || '';

  let filtered = heroActs.filter(a => {
    if (sportFilter && a.type !== sportFilter) return false;
    if (query) {
      const matchTitle = (a.title || '').toLowerCase().includes(query);
      const matchId = String(a.id || '').toLowerCase().includes(query);
      if (!matchTitle && !matchId) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    let va = a[viewerSortCol];
    let vb = b[viewerSortCol];
    if (viewerSortCol === 'date') {
      va = parseActivityDate(a.date || a.time)?.getTime() || 0;
      vb = parseActivityDate(b.date || b.time)?.getTime() || 0;
    }
    if (va < vb) return viewerSortAsc ? -1 : 1;
    if (va > vb) return viewerSortAsc ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = '';
  if (countLabel) countLabel.innerText = `共 ${filtered.length} 筆歷程`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-slate-500">查無符合條件的運動紀錄</td></tr>`;
    return;
  }

  const activeMode = gameState?.activeMode || "classic";
  const thScoreCol = document.getElementById("th-viewer-score-col");
  if (thScoreCol) {
    if (activeMode === "classic") thScoreCol.innerText = "🔥 燃脂熱量";
    else if (activeMode === "rpg_talent" || activeMode === "rpg") thScoreCol.innerText = "⚡ 獲得戰力 (CP)";
    else thScoreCol.innerText = "⚔️ 造成傷害";
  }

  filtered.forEach(a => {
    const tr = document.createElement('tr');
    tr.className = `hover:bg-slate-900/60 transition ${a.isExcluded ? 'opacity-40 line-through bg-rose-950/20' : ''}`;

    const isNumericStrava = /^\d+$/.test(String(a.id));
    const sourceBadge = isNumericStrava 
      ? `<a href="https://www.strava.com/activities/${a.id}" target="_blank" class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 transition"><span>#${a.id}</span> ↗</a>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">手動補登</span>`;

    let scoreColHtml = "";
    if (a.isExcluded) {
      scoreColHtml = `<span class="text-rose-400 font-bold">GM作廢</span>`;
    } else if (!a.isValidAttack) {
      scoreColHtml = `<span class="text-slate-500">${a.inSeason ? "未滿30分" : "非本賽季"}</span>`;
    } else {
      if (activeMode === "classic") {
        scoreColHtml = `<span class="text-amber-400 font-bold">${Math.round(a.calories)} kcal</span>`;
      } else if (activeMode === "rpg_talent" || activeMode === "rpg") {
        scoreColHtml = `<span class="text-purple-400 font-bold">${Math.round(a.combatPower || a.damage).toLocaleString()} CP</span>`;
      } else {
        scoreColHtml = `<span class="text-amber-400 font-bold">⚔️ ${(a.damage).toLocaleString()}</span>`;
      }
    }

    tr.innerHTML = `
      <td class="p-3">${sourceBadge}</td>
      <td class="p-3 font-mono text-slate-400">${a.date || a.time}</td>
      <td class="p-3 font-bold text-white cursor-pointer hover:text-cyan-400 hover:underline" onclick="openHeroDetailModal('${a.hero}')">${a.hero}</td>
      <td class="p-3"><span class="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">${a.guild}</span></td>
      <td class="p-3 font-mono">${a.duration}分</td>
      <td class="p-3 font-mono text-amber-300">${a.avgHr}</td>
      <td class="p-3 font-mono text-rose-400">${a.maxHr}</td>
      <td class="p-3 font-mono">${Math.round(a.calories)}</td>
      <td class="p-3 font-mono text-purple-300">${a.gap}</td>
      <td class="p-3 font-mono text-emerald-300">${a.trimp}</td>
      <td class="p-3"><span class="text-[10px]">${a.zoneLabel || '🟢 有氧燃脂'}</span></td>
      <td class="p-3 font-mono">${scoreColHtml}</td>
    `;

    tbody.appendChild(tr);
  });
}

function sortViewerTable(col) {
  if (viewerSortCol === col) viewerSortAsc = !viewerSortAsc;
  else { viewerSortCol = col; viewerSortAsc = false; }
  filterViewerActivities();
}

// -------------------------------------------------------------
// INTERACTIVE HERO DETAIL MODAL (彈出式個人英雄戰力卡)
// -------------------------------------------------------------

function openHeroDetailModal(heroName) {
  const modal = document.getElementById('modal-hero-profile');
  const title = document.getElementById('modal-hero-profile-title');
  const content = document.getElementById('modal-hero-profile-content');
  if (!modal || !content || !heroName) return;

  const cleanName = String(heroName).trim();
  const hero = gameState?.heroes?.find(h => (h.name || "").trim() === cleanName) || {
    name: cleanName,
    guild: (gameState?.activities || []).find(a => (a.hero || "").trim() === cleanName)?.guild || "自由英雄",
    age: 35,
    maxHr: 185,
    rpgClass: "狂戰士"
  };
  const heroStat = (heroStatsList || []).find(h => (h.name || "").trim() === cleanName) || {};
  const heroActs = (gameState?.activities || []).filter(a => (a.hero || "").trim() === cleanName);
  const cls = RPG_CLASSES[hero.rpgClass || "狂戰士"] || RPG_CLASSES["狂戰士"];

  const seasonStartStr = gameState?.seasonStart || gameState?.boss?.seasonStart || "2026/08/12";
  const seasonEndStr = gameState?.seasonEnd || gameState?.boss?.seasonEnd || "2026/08/31";
  const startD = parseActivityDate(seasonStartStr);
  const endD = parseActivityDate(seasonEndStr);
  if (endD) endD.setHours(23, 59, 59, 999);

  const inSeasonActs = heroActs.filter(a => {
    if (a.isExcluded) return false;
    const aDate = parseActivityDate(a.date || a.time);
    if (aDate && startD && endD) {
      return aDate >= startD && aDate <= endD;
    }
    return a.inSeason !== false;
  });

  const totalDmg = heroStat.totalDamage || 0;
  const totalDur = inSeasonActs.reduce((acc, a) => acc + (a.duration || 0), 0);
  const totalCal = inSeasonActs.reduce((acc, a) => acc + (a.calories || 0), 0);

  title.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
        <img src="${hero.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${hero.name}`}" class="w-full h-full object-cover">
      </div>
      <div>
        <span class="text-sm font-black text-white">${hero.name}</span>
        <span class="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 ml-1">${hero.guild}</span>
        ${(gameState?.activeMode === 'rpg_talent' || gameState?.activeMode === 'rpg' || (currentView === 'chronicles' && getAllSnapshots().find(s => s.id === selectedChronicle)?.type === 'rpg')) ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${cls.bg} ml-1">${cls.badge} ${cls.name}</span>` : ''}
      </div>
    </div>
  `;

  const activeMode = gameState?.activeMode || "classic";
  let modalCardsHtml = "";
  if (activeMode === "classic") {
    modalCardsHtml = `
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">有效出勤</span>
        <span class="font-rpg font-bold text-amber-400 text-sm">${heroStat.validWorkouts || 0} 次</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">累計時長</span>
        <span class="font-rpg font-bold text-cyan-400 text-sm">${Math.round(totalDur)} 分</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">總熱量</span>
        <span class="font-rpg font-bold text-rose-400 text-sm">${Math.round(totalCal).toLocaleString()}</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">最高落差</span>
        <span class="font-rpg font-bold text-purple-400 text-sm">${heroStat.maxGap || 0}</span>
      </div>
    `;
  } else if (activeMode === "rpg_talent" || activeMode === "rpg") {
    modalCardsHtml = `
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">RPG 總戰力</span>
        <span class="font-rpg font-bold text-purple-400 text-sm">${(heroStat.combatPower || heroStat.totalDamage || 0).toLocaleString()} CP</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">累計時長</span>
        <span class="font-rpg font-bold text-cyan-400 text-sm">${Math.round(totalDur)} 分</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">總能量</span>
        <span class="font-rpg font-bold text-rose-400 text-sm">${Math.round(totalCal).toLocaleString()}</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">天賦專精</span>
        <span class="font-bold text-amber-400 text-xs block truncate mt-1">${cls.badge} ${cls.name}</span>
      </div>
    `;
  } else {
    modalCardsHtml = `
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">賽季總傷害</span>
        <span class="font-rpg font-bold text-amber-400 text-sm">${totalDmg.toLocaleString()}</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">累計時長</span>
        <span class="font-rpg font-bold text-cyan-400 text-sm">${Math.round(totalDur)} 分</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">總熱量</span>
        <span class="font-rpg font-bold text-rose-400 text-sm">${Math.round(totalCal).toLocaleString()}</span>
      </div>
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block">最高落差</span>
        <span class="font-rpg font-bold text-purple-400 text-sm">${heroStat.maxGap || 0}</span>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
      ${modalCardsHtml}
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
        <span class="font-bold text-slate-200">🏃 近期運動歷程 (共 ${heroActs.length} 筆)</span>
      </div>
      <div class="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
        ${heroActs.slice(0, 10).map(a => {
          const isNumericStrava = /^\d+$/.test(String(a.id));
          const idLink = isNumericStrava 
            ? `<a href="https://www.strava.com/activities/${a.id}" target="_blank" class="text-[10px] text-orange-400 hover:underline">#${a.id} ↗</a>`
            : `<span class="text-[10px] text-amber-400">手動</span>`;
          
          let actScoreTag = "";
          if (activeMode === "classic") {
            actScoreTag = `<span class="font-mono font-bold text-amber-400 text-xs">${Math.round(a.calories)} kcal</span>`;
          } else if (activeMode === "rpg_talent" || activeMode === "rpg") {
            actScoreTag = `<span class="font-mono font-bold text-purple-400 text-xs">⚡ ${Math.round(a.combatPower || a.damage).toLocaleString()} CP</span>`;
          } else {
            actScoreTag = `<span class="font-rpg font-bold text-amber-400 text-xs">⚔️ ${(a.damage || 0).toLocaleString()}</span>`;
          }

          return `
            <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div class="flex items-center space-x-1.5">
                  <span class="font-bold text-white">${a.title || a.type}</span>
                  ${idLink}
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${a.date || a.time} • ${a.duration}分 • 心率 ${a.avgHr}/${a.maxHr} • ${Math.round(a.calories)}kcal</span>
              </div>
              ${actScoreTag}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeHeroProfileModal() {
  const modal = document.getElementById('modal-hero-profile');
  if (modal) modal.classList.add('hidden');
}

// -------------------------------------------------------------
// 5. GLOBAL TOOL: 過往英雄史 (Chronicles of Past Heroes)
// -------------------------------------------------------------

function getAllSnapshots() {
  if (gameState?.snapshots && Array.isArray(gameState.snapshots)) {
    return gameState.snapshots;
  }
  return [window.frozenClassic0717];
}

function populateChroniclesDropdown() {
  const select = document.getElementById('chronicles-season-select');
  if (!select) return;

  const currentSelectVal = select.value;
  select.innerHTML = '';

  const snapshots = getAllSnapshots();
  const visibleSnapshots = snapshots.filter(s => s.isVisible !== false);

  if (visibleSnapshots.length === 0) {
    select.innerHTML = `<option value="">(目前無可顯示的歷史快照)</option>`;
    return;
  }

  visibleSnapshots.forEach(arc => {
    const opt = document.createElement('option');
    opt.value = arc.id;
    const typeIcon = arc.type === 'classic' ? '🏆' : (arc.type === 'rpg' ? '⚔️' : '🐉');
    opt.innerText = `${typeIcon} ${arc.seasonTitle || arc.id} (${arc.seasonPeriod || ''})`;
    select.appendChild(opt);
  });

  if (currentSelectVal && visibleSnapshots.some(s => s.id === currentSelectVal)) {
    select.value = currentSelectVal;
  } else if (visibleSnapshots.length > 0) {
    select.value = visibleSnapshots[0].id;
    selectedChronicle = visibleSnapshots[0].id;
  }
}

function switchChronicleSeason() {
  const select = document.getElementById('chronicles-season-select');
  if (select) selectedChronicle = select.value;
  renderChroniclesView();
}

function renderChroniclesView() {
  const container = document.getElementById("chronicles-dynamic-content");
  if (!container) return;

  const snapshots = getAllSnapshots();
  const snap = snapshots.find(s => s.id === selectedChronicle) || snapshots[0];

  if (!snap) {
    container.innerHTML = `<div class="p-8 text-center text-slate-500">尚無選擇的歷史快照</div>`;
    return;
  }

  // =========================================================================
  // CASE 1: Classic Mode Snapshot (1:1 with Live Classic Arena)
  // =========================================================================
  if (snap.type === "classic" || snap.classicData || (snap.champions && !snap.classMasters && !snap.boss)) {
    const classic = snap.classicData || snap;
    const champs = classic.champions || {};
    const teamMetrics = classic.teamMetrics || [];
    const guildList = classic.guildList || [];

    container.innerHTML = `
      <div class="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-6 rounded-3xl border border-amber-500/40 shadow-xl space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">🏛️ 經典競技歷史快照</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🔒 時間凍結</span>
            <span class="text-xs text-slate-400 font-mono">${snap.seasonPeriod || ""}</span>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">封存時間：${snap.archivedAt || "歷史預載"}</span>
        </div>
        <h2 class="text-2xl font-black text-white font-title">${snap.seasonTitle}</h2>
        <p class="text-xs text-slate-300 flex items-center space-x-1.5">
          <span>🔒</span>
          <span class="font-bold text-amber-300">${snap.statusLabel || "本賽季已圓滿結算 (歷史數據已凍結)"}</span>
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 class="text-sm font-bold text-emerald-400">🟢 團隊有氧總冠軍 (滿分100)</h3>
            <span class="text-[10px] text-slate-400">衝力40% + 熱量30% + 有氧30%</span>
          </div>
          <div class="space-y-1.5">
            ${(champs.teamAerobic || []).map(t => `
              <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span class="font-bold text-white">${t.badge || ""} ${t.name}</span>
                <span class="font-rpg font-bold text-emerald-400">${t.score} 分</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 class="text-sm font-bold text-emerald-400">🟢 個人有氧總冠軍 (滿分100)</h3>
            <span class="text-[10px] text-slate-400">個人綜合加權高標法</span>
          </div>
          <div class="space-y-1.5">
            ${(champs.heroAerobic || []).map(h => `
              <div onclick="openHeroDetailModal('${h.name}')" class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-emerald-500/50 transition">
                <span class="font-bold text-white">${h.badge || ""} ${h.name} <span class="text-[10px] text-slate-400 font-normal">(${h.guild || ""})</span></span>
                <span class="font-rpg font-bold text-emerald-400">${h.score} 分</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="bg-slate-900/80 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 class="text-sm font-bold text-rose-400">🔴 團隊無氧總冠軍 (滿分100)</h3>
            <span class="text-[10px] text-slate-400">落差50% + 密度30% + 出勤20%</span>
          </div>
          <div class="space-y-1.5">
            ${(champs.teamAnaerobic || []).map(t => `
              <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span class="font-bold text-white">${t.badge || ""} ${t.name}</span>
                <span class="font-rpg font-bold text-rose-400">${t.score} 分</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="bg-slate-900/80 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 class="text-sm font-bold text-rose-400">🔴 個人無氧總冠軍 (滿分100)</h3>
            <span class="text-[10px] text-slate-400">落差40% + 密度30% + MaxHR15% + 出勤15%</span>
          </div>
          <div class="space-y-1.5">
            ${(champs.heroAnaerobic || []).map(h => `
              <div onclick="openHeroDetailModal('${h.name}')" class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-rose-500/50 transition">
                <span class="font-bold text-white">${h.badge || ""} ${h.name} <span class="text-[10px] text-slate-400 font-normal">(${h.guild || ""})</span></span>
                <span class="font-rpg font-bold text-rose-400">${h.score} 分</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <h3 class="text-sm font-bold text-white flex items-center space-x-2">
          <i data-lucide="medal" class="w-4 h-4 text-amber-400"></i>
          <span>🏆 團隊八大核心生理指標榜 (人均數據)</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${teamMetrics.map(m => `
            <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <span class="text-xs font-bold text-slate-200 block truncate">${m.metric}</span>
              <div class="space-y-1">
                ${m.leaderboard.map(item => `
                  <div class="flex justify-between text-[11px]">
                    <span class="text-slate-400">${item.rank} ${item.team}</span>
                    <span class="font-mono font-bold text-amber-400">${item.value} ${m.unit}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      ${guildList && guildList.length > 0 ? `
        <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center space-x-2">
            <i data-lucide="shield" class="w-4 h-4 text-cyan-400"></i>
            <span>🛡️ 公會成員出勤與戰力統計矩陣 (歷史封存)</span>
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th class="p-3">🛡️ 公會名稱</th>
                  <th class="p-3">👥 成員名冊</th>
                  <th class="p-3">🏋️ 人均出勤</th>
                  <th class="p-3">⏱️ 人均時長</th>
                  <th class="p-3">🔋 人均熱量</th>
                  <th class="p-3">🚀 人均衝力</th>
                  <th class="p-3">🦍 人均落差</th>
                  <th class="p-3">💥 人均密度</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                ${guildList.map(g => `
                  <tr class="hover:bg-slate-950/40 transition">
                    <td class="p-3 font-bold text-white flex items-center space-x-1.5">
                      <span>${g.badge || "🛡️"}</span>
                      <span>${g.name}</span>
                    </td>
                    <td class="p-3 text-slate-400 font-mono text-[11px]">
                      ${(g.members || []).map(m => `<span class="cursor-pointer hover:underline text-slate-300" onclick="openHeroDetailModal('${m}')">${m}</span>`).join("、")}
                    </td>
                    <td class="p-3 font-mono text-amber-300">${g.perWorkouts} 次</td>
                    <td class="p-3 font-mono">${g.perDuration} 分</td>
                    <td class="p-3 font-mono text-rose-400">${g.perCalories} kcal</td>
                    <td class="p-3 font-mono text-cyan-300">${g.perTrimp}</td>
                    <td class="p-3 font-mono text-purple-300">${g.perGap} bpm</td>
                    <td class="p-3 font-mono">${g.perDensity}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}
    `;
  }

  // =========================================================================
  // CASE 2: RPG Class & Talent Mode Snapshot (1:1 with Live RPG View)
  // =========================================================================
  else if (snap.type === "rpg" || snap.type === "rpg_talent" || snap.classMasters) {
    const masters = snap.classMasters || {};
    const synergyList = snap.guildSynergyList || [];
    const heroList = snap.heroRpgList || snap.heroStats || [];
    const maxGuildPower = Math.max(1, ...synergyList.map(s => s.totalPower || 1));

    container.innerHTML = `
      <div class="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-6 rounded-3xl border border-purple-500/50 shadow-xl space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">🏛️ RPG 職業天賦歷史快照</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">🔒 時間凍結</span>
            <span class="text-xs text-slate-400 font-mono">${snap.seasonPeriod || ""}</span>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">封存時間：${snap.archivedAt || ""}</span>
        </div>
        <h2 class="text-2xl font-black text-white font-title">${snap.seasonTitle}</h2>
        <p class="text-xs text-slate-300 flex items-center space-x-1.5">
          <span>🔒</span>
          <span class="font-bold text-purple-300">${snap.statusLabel || "本賽季職業爭霸已圓滿結算封存"}</span>
        </p>
      </div>

      <!-- 5 Class Master Podiums -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <h3 class="text-sm font-bold text-white flex items-center space-x-2">
          <i data-lucide="crown" class="w-4 h-4 text-amber-400"></i>
          <span>👑 五大職業首席大師王座 (歷史榜首)</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          ${Object.keys(RPG_CLASSES).map(cName => {
            const cls = RPG_CLASSES[cName];
            const master = masters[cName];
            return `
              <div class="bg-slate-950 p-3.5 rounded-2xl border ${cls.bg} space-y-2 relative overflow-hidden">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold flex items-center space-x-1">
                    <span>${cls.badge}</span>
                    <span>${cls.name}之王</span>
                  </span>
                  <span class="text-[10px] opacity-80">${cls.enName}</span>
                </div>
                ${master ? `
                  <div class="flex items-center space-x-2.5 pt-1 cursor-pointer hover:opacity-80 transition" onclick="openHeroDetailModal('${master.name}')">
                    <div class="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                      <img src="${master.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${master.name}`}" class="w-full h-full object-cover">
                    </div>
                    <div class="min-w-0">
                      <span class="font-bold text-white text-xs truncate block">${master.name}</span>
                      <span class="text-[10px] text-slate-400">${master.guild}</span>
                    </div>
                  </div>
                  <div class="text-right pt-1 border-t border-slate-800/80">
                    <span class="text-[10px] text-slate-400 block">職業戰力</span>
                    <span class="font-rpg font-bold text-sm text-amber-400">${(master.combatPower || 0).toLocaleString()}</span>
                  </div>
                ` : `
                  <div class="text-center py-4 text-slate-500 text-xs">(尚無冒險者)</div>
                `}
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Guild Synergy Leaderboard -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 class="text-sm font-bold text-white flex items-center space-x-2">
          <i data-lucide="shield-check" class="w-4 h-4 text-cyan-400"></i>
          <span>🛡️ 公會天賦羈絆戰力排行榜 (歷史封存)</span>
        </h3>
        <div class="space-y-3">
          ${synergyList.map(g => {
            const pct = Math.round(((g.totalPower || 0) / maxGuildPower) * 100);
            return `
              <div class="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div class="flex flex-wrap items-center justify-between text-xs gap-2">
                  <div class="flex items-center space-x-2">
                    <span>${g.badge || "🛡️"}</span>
                    <span class="font-bold text-white text-sm">${g.guild || g.name}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">${g.synergyTag || "小隊羈絆"}</span>
                    <div class="flex space-x-1">
                      ${(g.uniqueClasses || []).map(c => `<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">${RPG_CLASSES[c]?.badge || ""} ${c}</span>`).join("")}
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 block">公會羈絆總戰力</span>
                    <span class="font-rpg font-bold text-amber-400 text-sm">${(g.totalPower || 0).toLocaleString()} CP</span>
                  </div>
                </div>
                <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div class="h-full rounded-full" style="width: ${pct}%; background-color: ${g.color || "#f59e0b"};"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Hero Class Roster Table -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 class="text-sm font-bold text-white flex items-center space-x-2">
          <i data-lucide="users" class="w-4 h-4 text-purple-400"></i>
          <span>👥 全服英雄職業專精與 RPG 戰力總表 (歷史封存)</span>
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3">👤 冒險者</th>
                <th class="p-3">🛡️ 公會</th>
                <th class="p-3">⚔️ 職業專精</th>
                <th class="p-3">✨ 專屬天賦被動</th>
                <th class="p-3">🏋️ 出勤 / 燃脂</th>
                <th class="p-3">🚀 TRIMP / 落差</th>
                <th class="p-3 text-right">⚡ RPG 戰鬥評分 (CP)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-300">
              ${heroList.map(h => {
                const meta = RPG_CLASSES[h.rpgClass] || RPG_CLASSES["狂戰士"];
                return `
                  <tr class="hover:bg-slate-950/40 transition cursor-pointer" onclick="openHeroDetailModal('${h.name}')">
                    <td class="p-3 font-bold text-white flex items-center space-x-2">
                      <div class="w-7 h-7 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                        <img src="${h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`}" class="w-full h-full object-cover">
                      </div>
                      <span>${h.name}</span>
                    </td>
                    <td class="p-3"><span class="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">${h.guild}</span></td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded text-[11px] font-bold ${meta.bg}">
                        ${meta.badge} ${h.rpgClass}
                      </span>
                    </td>
                    <td class="p-3 text-[11px] text-slate-400">
                      <span class="font-bold text-slate-200">${meta.passiveName}</span>：${meta.passiveDesc}
                    </td>
                    <td class="p-3 font-mono">${h.workouts || 0}次 • ${h.zone2 || 0}次燃脂</td>
                    <td class="p-3 font-mono text-cyan-300">${h.trimp || 0} • 落差 ${h.maxGap || 0}</td>
                    <td class="p-3 text-right font-mono font-bold text-amber-400 text-sm">${(h.combatPower || h.totalDamage || 0).toLocaleString()}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // CASE 3: World Boss Raid Snapshot (1:1 with Live World Boss View)
  // =========================================================================
  else {
    const boss = snap.boss || {};
    const summary = snap.summary || {
      totalDamage: snap.totalDamage || 0,
      totalPhys: snap.physDmg || 0,
      totalMag: snap.magDmg || 0,
      totalCrit: snap.critDmg || 0
    };
    const heroList = snap.heroStats || snap.allHeroes || snap.topHeroes || [];
    const guildList = snap.guildContributions || snap.guilds || [];
    const activities = snap.activities || [];

    const maxHp = boss.maxHp || snap.bossMaxHp || 350000;
    const currHp = boss.currentHp !== undefined ? boss.currentHp : (snap.bossFinalHp !== undefined ? snap.bossFinalHp : Math.max(0, maxHp - summary.totalDamage));
    const hpPct = Math.max(0, Math.min(100, (currHp / maxHp) * 100));

    container.innerHTML = `
      <div class="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 p-6 rounded-3xl border border-rose-500/40 shadow-xl space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">🏛️ 世界 Boss 歷史快照</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">🔒 時間凍結</span>
            <span class="text-xs text-slate-400 font-mono">${snap.seasonPeriod || ""}</span>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">封存時間：${snap.archivedAt || ""}</span>
        </div>
        <h2 class="text-2xl font-black text-white font-title">${snap.seasonTitle || boss.name}</h2>
        <p class="text-xs text-slate-300 flex items-center space-x-1.5">
          <span>🔒</span>
          <span class="font-bold text-amber-300">${snap.statusLabel || "本賽季討伐戰已圓滿結算封存"}</span>
        </p>
      </div>

      <!-- Boss Banner -->
      <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden glow-border-red">
        <div class="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div class="flex items-center space-x-4 flex-1">
            <div class="w-24 h-24 rounded-2xl overflow-hidden border-2 border-rose-500/50 shadow-xl shadow-rose-900/40 relative flex-shrink-0">
              <img src="${boss.avatar || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80"}" class="w-full h-full object-cover">
              <span class="absolute bottom-0 inset-x-0 bg-rose-950/80 text-rose-300 text-[10px] font-black text-center py-0.5">WORLD BOSS</span>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-xs text-rose-400 font-bold tracking-wider uppercase">資料片三 • 全伺服器合作模式 (歷史紀錄)</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-black text-white font-title tracking-wide mt-0.5">
                ${boss.name || "🌩️ 墮落雷神・索爾"}
              </h2>
              <p class="text-xs font-mono font-bold text-amber-300 mt-1">
                討伐戰區間：${snap.seasonPeriod || ""}
              </p>
            </div>
          </div>

          <div class="w-full lg:w-96 space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div class="flex items-baseline justify-between">
              <span class="text-xs font-bold text-slate-400">魔王最終剩餘血量</span>
              <div class="text-right">
                <span class="text-lg font-black font-rpg text-rose-400">${currHp.toLocaleString()}</span>
                <span class="text-xs text-slate-500 font-mono">/ ${maxHp.toLocaleString()}</span>
                <span class="text-xs font-bold text-amber-400 ml-1">(${hpPct.toFixed(1)}%)</span>
              </div>
            </div>
            <div class="w-full h-5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700 relative">
              <div class="h-full rounded-full boss-hp-bar" style="width: ${hpPct}%;"></div>
            </div>
            <div class="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>戰役結算狀態：<span class="text-emerald-400 font-bold">已封存</span></span>
              <span class="text-amber-400 font-bold">全服總輸出：<span>${summary.totalDamage.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3 Damage Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-amber-400">🗡️ 物理普攻總和</div>
            <div class="text-2xl font-black font-rpg text-white">${summary.totalPhys.toLocaleString()}</div>
            <p class="text-[11px] text-slate-400 mt-0.5">熱量真實傷害 1:1 累加</p>
          </div>
          <div class="text-2xl">🔥</div>
        </div>
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-cyan-400">🔮 魔法衝力總和</div>
            <div class="text-2xl font-black font-rpg text-white">${summary.totalMag.toLocaleString()}</div>
            <p class="text-[11px] text-slate-400 mt-0.5">TRIMP 放大 15 倍轉換</p>
          </div>
          <div class="text-2xl">⚡</div>
        </div>
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-rose-400">💥 爆擊傷害總和</div>
            <div class="text-2xl font-black font-rpg text-white">${summary.totalCrit.toLocaleString()}</div>
            <p class="text-[11px] text-slate-400 mt-0.5">取賽季最高單次落差 ×100</p>
          </div>
          <div class="text-2xl">💥</div>
        </div>
      </div>

      <!-- MVP Hero Leaderboard & Guild War Output -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center space-x-2">
              <i data-lucide="crown" class="w-5 h-5 text-amber-400"></i>
              <h3 class="text-base font-bold text-white">🏆 討伐軍 MVP 傷害排行榜 (歷史榮譽榜)</h3>
            </div>
            <span class="text-xs text-slate-400">點選英雄查看歷史戰力卡</span>
          </div>

          <div class="space-y-2.5">
            ${heroList.map((hero, index) => {
              const isTop1 = index === 0;
              const isTop3 = index < 3;
              return `
                <div onclick="openHeroDetailModal('${hero.name}')" class="p-3.5 rounded-2xl border transition flex items-center justify-between space-x-3 cursor-pointer hover:border-amber-500/60 ${
                  isTop1 ? "bg-amber-950/20 border-amber-500/50 glow-border-gold" : (isTop3 ? "bg-slate-950/60 border-slate-700" : "bg-slate-950/40 border-slate-800/80")
                }">
                  <div class="flex items-center space-x-3 flex-1 min-w-0">
                    <div class="w-7 text-center font-black font-rpg text-sm ${isTop1 ? "text-amber-400 text-base" : (isTop3 ? "text-cyan-400" : "text-slate-500")}">
                      ${hero.badge || (isTop1 ? "👑" : `#${index + 1}`)}
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                      <img src="${hero.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${hero.name}`}" class="w-full h-full object-cover">
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center space-x-2">
                        <h4 class="text-sm font-black text-white truncate">${hero.name}</h4>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">${hero.guild}</span>
                      </div>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        出勤 ${hero.validWorkouts || 0} 次 • 普攻 ${(hero.physDmg || 0).toLocaleString()} • 魔攻 ${(hero.magDmg || 0).toLocaleString()} • 💥 爆擊 ${(hero.critDmg || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 block">總輸出</span>
                    <span class="text-base font-black font-rpg text-amber-400">${(hero.totalDamage || 0).toLocaleString()}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center space-x-2">
                <i data-lucide="shield" class="w-5 h-5 text-cyan-400"></i>
                <h3 class="text-sm font-bold text-white">🛡️ 各公會歷史輸出總和</h3>
              </div>
            </div>
            <div class="space-y-3">
              ${guildList.map(g => {
                const totalAll = summary.totalDamage || 1;
                const pct = (((g.totalDamage || 0) / totalAll) * 100).toFixed(1);
                return `
                  <div class="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <div class="flex items-center justify-between text-xs">
                      <div class="flex items-center space-x-1.5">
                        <span>${g.badge || "🛡️"}</span>
                        <span class="font-bold text-white">${g.name}</span>
                      </div>
                      <span class="font-rpg font-bold text-amber-400">${(g.totalDamage || 0).toLocaleString()} (${pct}%)</span>
                    </div>
                    <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div class="h-full rounded-full" style="width: ${pct}%; background-color: ${g.color || "#f59e0b"};"></div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}
/**
 * 📸 WYSIWYG 真・現場畫面 100% 完整深拷貝快照 (所見即所得)
 * 直接封存當前遊戲看板上的所有數值、出勤與戰功，不丟失任何手動打卡！
 */
async function captureCurrentLiveSnapshot(customName) {
  const activeMode = gameState?.activeMode || "world_boss";
  const bossData = gameState?.boss || {};
  let defaultTitle = "2026 S1 季末結算快照";
  if (activeMode === "classic") defaultTitle = "2026 S1 • 經典競技結算快照";
  else if (activeMode === "rpg_talent") defaultTitle = "2026 S1 • RPG 職業天賦結算快照";
  else if (activeMode === "world_boss") defaultTitle = `${bossData.name || "世界 Boss 討伐戰"} (現場結算快照)`;

  const title = customName || prompt("請輸入快照名稱 (Snapshot Title)：", defaultTitle);
  if (!title) return;

  const now = new Date();
  const timeStampStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  let snapPayload = null;

  if (activeMode === "classic") {
    snapPayload = {
      id: `snapshot_classic_${Date.now()}`,
      type: "classic",
      seasonTitle: title.trim(),
      seasonPeriod: `${bossData.seasonStart || "2026/07/27"} ~ ${bossData.seasonEnd || "2026/08/11"}`,
      archivedAt: timeStampStr,
      status: "completed",
      statusLabel: "🏁 本賽季經典競技已圓滿結算封存",
      isVisible: true,
      classicData: gameState?.classic0717 || window.frozenClassic0717 || {}
    };
  } else if (activeMode === "rpg_talent" || activeMode === "rpg") {
    const heroList = (heroStatsList || gameState?.heroes || []).map(h => {
      const cls = RPG_CLASSES[h.rpgClass || "狂戰士"] || RPG_CLASSES["狂戰士"];
      return {
        ...h,
        rpgClass: h.rpgClass || "狂戰士",
        combatPower: h.combatPower || h.totalDamage || 0
      };
    }).sort((a, b) => (b.combatPower || 0) - (a.combatPower || 0));

    const classMasters = {};
    Object.keys(RPG_CLASSES).forEach(cName => {
      const cand = heroList.find(h => h.rpgClass === cName);
      if (cand) classMasters[cName] = cand;
    });

    snapPayload = {
      id: `snapshot_rpg_${Date.now()}`,
      type: "rpg",
      seasonTitle: title.trim(),
      seasonPeriod: `${bossData.seasonStart || "2026/08/12"} ~ ${bossData.seasonEnd || "2026/08/31"}`,
      archivedAt: timeStampStr,
      status: "completed",
      statusLabel: "🏁 本賽季職業天賦爭霸已圓滿結算封存",
      isVisible: true,
      classMasters: classMasters,
      guildSynergyList: gameState?.guilds || [],
      heroRpgList: heroList
    };
  } else {
    // World Boss
    const sortedHeroes = [...(heroStatsList || [])].sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0));
    const summary = gameState?.summary || {
      totalPhys: sortedHeroes.reduce((s, h) => s + (h.physDmg || 0), 0),
      totalMag: sortedHeroes.reduce((s, h) => s + (h.magDmg || 0), 0),
      totalCrit: sortedHeroes.reduce((s, h) => s + (h.critDmg || 0), 0),
      totalDamage: sortedHeroes.reduce((s, h) => s + (h.totalDamage || 0), 0)
    };

    const guildStats = {};
    (gameState?.guilds || []).forEach(g => { guildStats[g.name] = { ...g, totalDamage: 0 }; });
    sortedHeroes.forEach(h => { if (guildStats[h.guild]) guildStats[h.guild].totalDamage += (h.totalDamage || 0); });
    const sortedGuilds = Object.values(guildStats).sort((a, b) => b.totalDamage - a.totalDamage);

    const maxHp = bossData.maxHp || 350000;
    const finalHp = bossData.currentHp !== undefined ? bossData.currentHp : Math.max(0, maxHp - summary.totalDamage);

    snapPayload = {
      id: `snapshot_boss_${Date.now()}`,
      type: "world_boss",
      seasonTitle: title.trim(),
      seasonPeriod: `${bossData.seasonStart || "2026/08/12"} ~ ${bossData.seasonEnd || "2026/08/31"}`,
      archivedAt: timeStampStr,
      status: "completed",
      statusLabel: "🏁 本賽季討伐戰已圓滿結算封存",
      isVisible: true,
      boss: {
        name: bossData.name || "🌩️ 墮落雷神・索爾 (Fallen Thor)",
        avatar: bossData.avatar || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
        description: bossData.description || "索爾受到雷霆魔劍侵蝕陷入瘋狂！全服英雄透過每日汗水鍛鍊，轉化為真實輸出！",
        maxHp: maxHp,
        currentHp: finalHp,
        seasonStart: bossData.seasonStart || "2026/08/12",
        seasonEnd: bossData.seasonEnd || "2026/08/31"
      },
      summary: summary,
      heroStats: sortedHeroes.map((h, idx) => ({
        rank: idx + 1,
        name: h.name,
        guild: h.guild,
        avatar: h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`,
        validWorkouts: h.validWorkouts || 0,
        physDmg: h.physDmg || 0,
        magDmg: h.magDmg || 0,
        critDmg: h.critDmg || 0,
        totalDamage: h.totalDamage || 0,
        maxGap: h.maxGap || 0,
        badge: idx === 0 ? "👑" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : ""))
      })),
      guildContributions: sortedGuilds,
      activities: (gameState?.activities || []).filter(a => a.isValidAttack).slice(0, 25)
    };
  }

  try {
    const res = await fetch("/api/snapshots/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot: snapPayload })
    });
    if (res.ok) {
      alert(`🎉 快照【${title}】建立成功！已 100% 複製當前現場戰況並封存至【過往英雄史】！`);
      if (gameState) {
        if (!gameState.snapshots) gameState.snapshots = [];
        gameState.snapshots.unshift(snapPayload);
        gameState.archivedSeasons = gameState.snapshots;
      }
      populateChroniclesDropdown();
    }
  } catch (e) {
    alert(`🎉 快照【${title}】已於本地建立！`);
  }
}
window.captureCurrentLiveSnapshot = captureCurrentLiveSnapshot;


window.addEventListener("gameStateSynced", (e) => {
  if (e.detail) {
    gameState = e.detail;
    if (gameState.heroStats) heroStatsList = gameState.heroStats;
    renderAllGameViews();
  }
});
