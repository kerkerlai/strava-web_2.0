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

    const bossMaxHp = bossConfig.maxHp || 350000;
    const bossCurrentHp = Math.max(0, bossMaxHp - totalSeasonDmg);

    const liveClassic = { ...classicConfig, seasonStart: seasonStartStr, seasonEnd: seasonEndStr };
    const liveRpg = { ...rpgConfig, seasonStart: seasonStartStr, seasonEnd: seasonEndStr };
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
