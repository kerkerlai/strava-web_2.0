/**
 * 鋼鐵英雄紀元 - Supabase Live Synchronizer (v3.0 雲端直連版)
 * 100% 擺脫 Google Sheet，直連 Supabase PostgreSQL 提供毫秒級跨裝置即時同步
 */

const SYNC_CONFIG = {
  pollIntervalSeconds: 30
};

/**
 * 跨瀏覽器高相容繁體中文/標準日期時間解析器 (支援上下午 12/24小時制)
 */
function parseActivityDate(dateStr) {
  if (!dateStr) return null;
  try {
    const s = String(dateStr).trim();
    const isPM = s.includes('下午') || s.toUpperCase().includes('PM');
    const isAM = s.includes('上午') || s.toUpperCase().includes('AM');
    const cleaned = s.replace(/下午|上午|AM|PM/gi, '').trim();

    const parts = cleaned.split(/\s+/);
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';

    const dp = datePart.replace(/-/g, '/').split('/').map(x => parseInt(x, 10));
    if (dp.length < 3 || isNaN(dp[0]) || isNaN(dp[1]) || isNaN(dp[2])) {
      return new Date(cleaned);
    }
    const year = dp[0];
    const month = dp[1] - 1;
    const day = dp[2];

    const tp = timePart.split(':').map(x => parseInt(x, 10));
    let hour = tp[0] || 0;
    const minute = tp[1] || 0;
    const second = tp[2] || 0;

    if (isPM && hour < 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    }

    return new Date(year, month, day, hour, minute, second);
  } catch (e) {
    return null;
  }
}

function cleanNumber(val, defaultVal = 0.0) {
  if (val === undefined || val === null) return defaultVal;
  const str = String(val).replace(/[\*,\s"]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? defaultVal : num;
}

const GUILD_COLOR_MAP = {
  'Cake': { badge: '🍰', color: '#ec4899' },
  '咪咪胡胡': { badge: '🐱', color: '#a855f7' },
  '嘿喲嘿喲拔蘿蔔': { badge: '🥕', color: '#f97316' },
  '天琳琳地琳琳': { badge: '⚡', color: '#3b82f6' },
  '試試看': { badge: '🎯', color: '#10b981' },
  '自由英雄': { badge: '🛡️', color: '#64748b' }
};

/**
 * 計算經典競技模式 (Classic Mode) 八大指標與四冠王數據
 */
function calculateLiveClassicStats(state) {
  const targetState = state || window.gameState || {};
  const heroes = targetState.heroes || [];
  const guilds = targetState.guilds || [];
  const activities = targetState.activities || [];
  const validActs = activities.filter(a => a.isValidAttack !== false && !a.isExcluded);

  const heroDataMap = {};
  heroes.forEach(h => {
    heroDataMap[h.name] = {
      name: h.name,
      guild: h.guild,
      avatar: h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`,
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
    h.density = h.duration > 0 ? Math.round((h.suffer / h.duration) * 100) / 100 : 0;
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

/**
 * 計算 RPG 職業天賦模式 (RPG Talent Mode) 戰力、首席大師與公會羈絆
 */
function calculateLiveRPGStats(state) {
  const targetState = state || window.gameState || {};
  const heroes = targetState.heroes || [];
  const guilds = targetState.guilds || [];
  const activities = targetState.activities || [];
  const validActs = activities.filter(a => a.isValidAttack !== false && !a.isExcluded);

  const heroRpgMap = {};
  heroes.forEach(h => {
    const heroClassKey = h.rpgClass || '狂戰士';
    const cls = (window.RPG_CLASSES && window.RPG_CLASSES[heroClassKey]) || { name: heroClassKey, badge: '⚔️', color: '#ef4444' };
    heroRpgMap[h.name] = {
      name: h.name,
      guild: h.guild,
      avatar: h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.name}`,
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

  const classMasters = {};
  const allClasses = ['狂戰士', '聖騎士', '遊俠', '大法師', '刺客'];
  allClasses.forEach(cName => {
    const candidates = Object.values(heroRpgMap).filter(h => h.rpgClass === cName).sort((a, b) => b.combatPower - a.combatPower);
    classMasters[cName] = candidates[0] || null;
  });

  const guildSynergyList = guilds.map(g => {
    const members = g.members || [];
    const memberHeroes = members.map(m => heroRpgMap[m]).filter(Boolean);
    const rawPower = memberHeroes.reduce((s, h) => s + (h.combatPower || 0), 0);
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

/**
 * 從 Supabase 雲端資料庫同步所有遊戲數據
 */
async function syncFromDatabase() {
  const syncBtn = document.getElementById('sheet-sync-btn') || document.getElementById('sync-db-btn');
  if (syncBtn) {
    syncBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-amber-400"></i><span>同步中...</span>';
    if (window.lucide) lucide.createIcons();
  }

  try {
    // 1. Parallel fetch from Supabase tables
    const [heroesData, activitiesData, configData] = await Promise.all([
      window.supabase.fetch('heroes', 'select=*').catch(() => []),
      window.supabase.fetch('activities', 'select=*').catch(() => []),
      window.supabase.fetch('game_config', 'select=*').catch(() => [])
    ]);

    // Fallback to local game_state if Supabase is completely empty
    if ((!heroesData || heroesData.length === 0) && (!activitiesData || activitiesData.length === 0)) {
      console.warn('[Supabase] 資料庫為空，嘗試載入本地快取...');
      if (window.renderAllGameViews) window.renderAllGameViews();
      return;
    }

    // 2. Parse Config
    const configMap = {};
    (configData || []).forEach(c => { configMap[c.key] = c.value; });

    const activeMode = configMap.active_mode || gameState?.activeMode || 'world_boss';
    const bossConfig = configMap.boss_config || gameState?.boss || {};
    const classicConfig = configMap.classic_config || gameState?.classic || {};
    const rpgConfig = configMap.rpg_config || gameState?.rpg || {};
    const snapshots = configMap.snapshots || gameState?.snapshots || [];

    // Parse Active Season Dates
    let seasonStartStr = "2026/08/12";
    let seasonEndStr = "2026/08/31";

    if (activeMode === 'classic' && classicConfig.seasonStart) {
      seasonStartStr = classicConfig.seasonStart;
      seasonEndStr = classicConfig.seasonEnd || "2026/08/31";
    } else if (activeMode === 'rpg_talent' && rpgConfig.seasonStart) {
      seasonStartStr = rpgConfig.seasonStart;
      seasonEndStr = rpgConfig.seasonEnd || "2026/08/31";
    } else if (bossConfig.seasonStart) {
      seasonStartStr = bossConfig.seasonStart;
      seasonEndStr = bossConfig.seasonEnd || "2026/08/31";
    }

    const seasonStartDate = parseActivityDate(seasonStartStr + " 00:00:00") || new Date(2026, 7, 12);
    const seasonEndDate = parseActivityDate(seasonEndStr + " 23:59:59") || new Date(2026, 7, 31, 23, 59, 59);

    // 3. Parse Heroes & Guilds
    const heroes = [];
    const heroMap = {};
    const guildMembers = {};
    const heroAggregates = {};

    (heroesData || []).forEach(h => {
      const name = h.name;
      const age = h.age || 35;
      const maxHr = h.max_hr || Math.max(120, 220 - age);
      const guild = h.guild || '自由英雄';
      const rpgClass = h.rpg_class || '狂戰士';
      const avatar = h.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=0f172a`;
      const stravaId = h.strava_id || '';

      const heroObj = {
        name,
        age,
        maxHr,
        guild,
        rpgClass,
        avatar,
        stravaId
      };
      heroes.push(heroObj);
      heroMap[name] = heroObj;

      if (!guildMembers[guild]) guildMembers[guild] = [];
      guildMembers[guild].push(name);

      heroAggregates[name] = {
        physDmg: 0,
        magDmg: 0,
        critDmg: 0,
        totalDmg: 0,
        maxGap: 0,
        validCount: 0
      };
    });

    // 4. Parse & Calculate Activities
    const activities = [];

    const physMult = bossConfig?.rules?.physMultiplier || 1.0;
    const magMult = bossConfig?.rules?.magicMultiplier || 15.0;
    const critMult = bossConfig?.rules?.critMultiplier || 100.0;

    (activitiesData || []).forEach(a => {
      const actId = String(a.id);
      const hero = heroMap[a.hero] || { maxHr: 185, guild: '自由英雄' };
      const actDate = parseActivityDate(a.date);
      const inSeason = actDate ? (actDate >= seasonStartDate && actDate <= seasonEndDate) : true;
      const isExcluded = Boolean(a.is_excluded);
      const isManual = Boolean(a.is_manual);

      const duration = cleanNumber(a.duration);
      const distance = cleanNumber(a.distance);
      const elevation = cleanNumber(a.elevation);
      const avgHr = cleanNumber(a.avg_hr);
      const maxHr = cleanNumber(a.max_hr);
      const calories = cleanNumber(a.calories);

      const isValid = (duration >= 30.0) && inSeason && !isExcluded;
      let physDmg = 0;
      let magDmg = 0;
      let gap = Math.max(0, maxHr - avgHr);
      let trimp = 0.0;

      if (hero.maxHr > 0 && avgHr > 0) {
        const ratio = avgHr / hero.maxHr;
        trimp = duration * ratio * Math.exp(1.92 * ratio);
      }

      const isZone2 = (0.60 * hero.maxHr) <= avgHr && avgHr <= (0.75 * hero.maxHr);
      const zoneLabel = isZone2 ? '🟢 有氧燃脂' : (avgHr > 0.75 * hero.maxHr ? '🚀 極限無氧' : '🚶 暖身/恢復');

      if (isValid) {
        physDmg = Math.round(calories * physMult);
        magDmg = Math.round(trimp * magMult);

        if (heroAggregates[a.hero]) {
          heroAggregates[a.hero].physDmg += physDmg;
          heroAggregates[a.hero].magDmg += magDmg;
          heroAggregates[a.hero].maxGap = Math.max(heroAggregates[a.hero].maxGap, gap);
          heroAggregates[a.hero].validCount += 1;
        }
      }

      const singleCritDmg = Math.round(gap * critMult);

      activities.push({
        id: actId,
        hero: a.hero,
        date: a.date,
        time: a.date,
        type: a.type || 'Workout',
        name: a.name || '鍛鍊',
        duration: duration,
        distance: distance,
        elevation: elevation,
        avgHr: avgHr,
        maxHr: maxHr,
        calories: calories,
        isManual: isManual,
        isExcluded: isExcluded,
        guild: hero.guild,
        trimp: Math.round(trimp * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        gapVal: gap,
        isZone2: isZone2,
        zoneLabel: zoneLabel,
        isValidAttack: isValid,
        inSeason: inSeason,
        damage: isValid ? (physDmg + magDmg) : 0,
        physDmg: physDmg,
        magDmg: magDmg,
        critDmg: singleCritDmg
      });
    });

    // 5. Build Hero Stats List (取單次最大 Gap 作為賽季爆擊傷害，並完整累計至總傷害)
    const heroStatsList = heroes.map(h => {
      const heroActs = activities.filter(a => a.hero === h.name && !a.isExcluded);
      const inSeasonActs = heroActs.filter(a => a.inSeason);
      const agg = heroAggregates[h.name] || { physDmg: 0, magDmg: 0, maxGap: 0, validCount: 0 };
      
      // 爆擊傷害：取賽季中單次最大 Gap * critMultiplier (100)
      const heroCritDmg = agg.validCount > 0 ? Math.round(agg.maxGap * critMult) : 0;
      // 英雄總輸出 = 普攻總和 + 魔攻總和 + 最高單次爆擊輸出
      const heroTotalDmg = agg.physDmg + agg.magDmg + heroCritDmg;

      return {
        name: h.name,
        guild: h.guild,
        rpgClass: h.rpgClass,
        age: h.age,
        maxHr: h.maxHr,
        avatar: h.avatar,
        stravaId: h.stravaId,
        score: heroTotalDmg,
        totalDamage: heroTotalDmg,
        physDmg: agg.physDmg,
        magDmg: agg.magDmg,
        critDmg: heroCritDmg,
        maxGap: agg.maxGap,
        validWorkouts: agg.validCount,
        totalDuration: inSeasonActs.reduce((s, a) => s + (a.duration || 0), 0),
        totalCalories: inSeasonActs.reduce((s, a) => s + (a.calories || 0), 0),
        totalTrimp: inSeasonActs.reduce((s, a) => s + (a.trimp || 0), 0),
        zone2Count: inSeasonActs.filter(a => a.isZone2).length
      };
    });

    // 6. Build Guilds List (公會總傷害為所屬英雄總輸出之和)
    const guilds = Object.keys(guildMembers).map(gName => {
      const gHeroes = heroStatsList.filter(h => h.guild === gName);
      const gDmg = gHeroes.reduce((s, h) => s + (h.totalDamage || 0), 0);
      const gValidCount = gHeroes.reduce((s, h) => s + (h.validWorkouts || 0), 0);
      const meta = GUILD_COLOR_MAP[gName] || { badge: '🛡️', color: '#64748b' };
      return {
        name: gName,
        badge: meta.badge,
        color: meta.color,
        members: guildMembers[gName],
        totalDamage: gDmg,
        score: gDmg,
        validWorkouts: gValidCount
      };
    });

    // 7. Calculate Total Server-wide Season Damage
    const totalSeasonPhys = heroStatsList.reduce((s, h) => s + (h.physDmg || 0), 0);
    const totalSeasonMag = heroStatsList.reduce((s, h) => s + (h.magDmg || 0), 0);
    const totalSeasonCrit = heroStatsList.reduce((s, h) => s + (h.critDmg || 0), 0);
    const totalSeasonDmg = totalSeasonPhys + totalSeasonMag + totalSeasonCrit;

    // 8. Pre-calculate Live Classic & RPG Expansion Statistics
    const classicStats = calculateLiveClassicStats({ heroes, guilds, activities: activities.filter(a => a.isValidAttack) });
    const rpgStats = calculateLiveRPGStats({ heroes, guilds, activities: activities.filter(a => a.isValidAttack) });

    const liveClassic = { ...classicConfig, ...classicStats, seasonStart: seasonStartStr, seasonEnd: seasonEndStr };
    const liveRpg = { ...rpgConfig, ...rpgStats, seasonStart: seasonStartStr, seasonEnd: seasonEndStr };
    const liveBoss = {
      ...bossConfig,
      name: bossConfig.name || '🌩️ 墮落雷神・索爾 (Fallen Thor)',
      subtitle: '世界 Boss 討伐戰 (全伺服器合作模式)',
      maxHp: bossMaxHp,
      currentHp: bossCurrentHp,
      seasonStart: seasonStartStr,
      seasonEnd: seasonEndStr,
      avatar: bossConfig.avatar || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      description: bossConfig.description || '索爾受到雷霆魔劍侵蝕陷入瘋狂！全服英雄透過每日嚴格汗水鍛鍊（單次達 30 分鐘），轉化為物理與魔法攻擊！',
      rules: bossConfig.rules || { minDurationMinutes: 30.0, physMultiplier: 1.0, magicMultiplier: 15.0, critMultiplier: 100.0 }
    };

    gameState = {
      activeMode: activeMode,
      seasonStart: seasonStartStr,
      seasonEnd: seasonEndStr,
      boss: liveBoss,
      classic: liveClassic,
      rpg: liveRpg,
      guilds: guilds,
      heroes: heroes,
      activities: activities,
      heroStats: heroStatsList,
      snapshots: snapshots,
      archivedSeasons: snapshots,
      classic0717: gameState?.classic0717 || window.frozenClassic0717,
      summary: {
        totalPhys: totalSeasonPhys,
        totalMag: totalSeasonMag,
        totalCrit: totalSeasonCrit,
        totalDamage: totalSeasonDmg
      }
    };

    window.gameState = gameState;
    window.heroStatsList = heroStatsList;
    window.calculateLiveClassicStats = calculateLiveClassicStats;
    window.calculateLiveRPGStats = calculateLiveRPGStats;
    window.dispatchEvent(new CustomEvent("gameStateSynced", { detail: gameState }));

    if (window.renderAllGameViews) {
      window.renderAllGameViews();
    }

  } catch (err) {
    console.error('Supabase Database Sync Error:', err);
  } finally {
    if (syncBtn) {
      syncBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-emerald-400"></i><span>同步資料庫</span>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

// Global Alias for backwards compatibility
window.syncFromGoogleSheet = syncFromDatabase;
window.syncFromDatabase = syncFromDatabase;

document.addEventListener("DOMContentLoaded", () => {
  syncFromDatabase();
  setInterval(syncFromDatabase, SYNC_CONFIG.pollIntervalSeconds * 1000);
});
