/**
 * 鋼鐵英雄紀元 - Google Sheet Live Synchronizer (v2.0 旗艦版)
 * 支援 Google Sheet 與 Web 端手動補登、GM 異常作廢名單、多資料片即時動態結算之核心引擎
 */

const SHEET_CONFIG = {
  sheetId: '1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY',
  pollIntervalSeconds: 60
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

/**
 * 數值清洗工具 (自動去除 *, 逗號, 引號)
 */
function cleanNumber(val, defaultVal = 0.0) {
  if (val === undefined || val === null) return defaultVal;
  const str = String(val).replace(/[\*,\s"]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? defaultVal : num;
}

/**
 * 健壯的 CSV 解析器 (支援引號內逗號與多行跳脫)
 */
function parseCSV(text) {
  if (!text) return [];
  const rows = [];
  let row = [];
  let inQuotes = false;
  let curr = '';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(curr.trim());
      curr = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(curr.trim());
      if (row.some(cell => cell.length > 0)) {
        rows.push(row.map(cell => cell.replace(/^"|"$/g, '').trim()));
      }
      row = [];
      curr = '';
    } else {
      curr += c;
    }
  }

  if (curr.length > 0 || row.length > 0) {
    row.push(curr.trim());
    if (row.some(cell => cell.length > 0)) {
      rows.push(row.map(cell => cell.replace(/^"|"$/g, '').trim()));
    }
  }

  return rows;
}

async function fetchSheetTab(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch tab: ${sheetName}`);
  const csvText = await res.text();
  return parseCSV(csvText);
}

// Fetch local manual activities from server or localStorage
async function getLocalManualActivities() {
  let manualActs = [];
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const data = await res.json();
      manualActs = (data.activities || []).filter(a => a.id && (String(a.id).startsWith('ACT-') || a.isManual));
    }
  } catch (e) {}

  try {
    const localSaved = JSON.parse(localStorage.getItem('manual_activities') || '[]');
    localSaved.forEach(la => {
      if (!manualActs.some(ma => String(ma.id) === String(la.id))) {
        manualActs.push(la);
      }
    });
  } catch (e) {}

  return manualActs;
}

// Get GM excluded activity IDs
function getExcludedActivityIds() {
  try {
    const localExcluded = JSON.parse(localStorage.getItem('excluded_activity_ids') || '[]');
    return new Set(localExcluded.map(String));
  } catch (e) {
    return new Set();
  }
}

async function syncFromGoogleSheet() {
  const syncBtn = document.getElementById('btn-sheet-sync');
  if (syncBtn) {
    syncBtn.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i><span>同步中...</span>';
    if (window.lucide) lucide.createIcons();
  }

  try {
    const [rawRows, participantRows, controlRows, manualActs] = await Promise.all([
      fetchSheetTab('Rawdata'),
      fetchSheetTab('參賽者名單'),
      fetchSheetTab('控制台').catch(() => []),
      getLocalManualActivities()
    ]);

    // 0. Active Mode (優先採用伺服器與自訂設定)
    let effectiveActiveMode = gameState?.activeMode || 'classic';
    if (!gameState?.activeMode && controlRows && controlRows.length > 1) {
      for (const row of controlRows) {
        if (row[0] && row[0].includes('當前啟用的資料片') && row[1]) {
          const val = row[1].trim();
          if (val.includes('世界 Boss') || val.includes('討伐戰') || val.includes('三')) {
            effectiveActiveMode = 'world_boss';
          } else if (val.includes('職業') || val.includes('天賦') || val.includes('二')) {
            effectiveActiveMode = 'rpg_talent';
          } else if (val.includes('經典') || val.includes('競技') || val.includes('一')) {
            effectiveActiveMode = 'classic';
          }
        }
      }
    }

    // 1. Parse Participants
    const heroes = [];
    const heroMap = {};
    const guildMembers = {};

    for (let i = 1; i < participantRows.length; i++) {
      const row = participantRows[i];
      if (row.length >= 3 && row[0]) {
        const name = row[0].trim();
        const age = cleanNumber(row[1], 35);
        const guild = row[2]?.trim() || '自由英雄';
        const maxHr = Math.max(120, 220 - age);
        const existingHero = (gameState?.heroes || []).find(h => h.name === name);
        const classInSheet = row[3]?.trim();
        let matchedClass = null;
        if (classInSheet) {
          if (classInSheet.includes("狂戰") || classInSheet.includes("戰士")) matchedClass = "狂戰士";
          else if (classInSheet.includes("聖騎") || classInSheet.includes("騎士")) matchedClass = "聖騎士";
          else if (classInSheet.includes("遊俠") || classInSheet.includes("獵人") || classInSheet.includes("弓")) matchedClass = "遊俠";
          else if (classInSheet.includes("法師") || classInSheet.includes("魔導")) matchedClass = "大法師";
          else if (classInSheet.includes("刺客") || classInSheet.includes("盜賊") || classInSheet.includes("影")) matchedClass = "刺客";
        }
        const finalClass = matchedClass || existingHero?.rpgClass || "狂戰士";

        const heroObj = {
          name: name,
          age: age,
          maxHr: maxHr,
          guild: guild,
          rpgClass: finalClass,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=0f172a`
        };
        heroes.push(heroObj);
        heroMap[name] = heroObj;

        if (!guildMembers[guild]) guildMembers[guild] = [];
        guildMembers[guild].push(name);
      }
    }

    // Smart Auto-Discovery from Rawdata
    const allNamesToCheck = [
      ...rawRows.slice(1).map(r => r[1]?.trim()),
      ...manualActs.map(m => m.hero?.trim())
    ];

    allNamesToCheck.forEach(rName => {
      if (rName && !heroMap[rName]) {
        const fallbackHero = {
          name: rName,
          age: 35,
          maxHr: 185,
          guild: '自由英雄',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${rName}&backgroundColor=0f172a`,
          isAutoDiscovered: true
        };
        heroes.push(fallbackHero);
        heroMap[rName] = fallbackHero;
        if (!guildMembers['自由英雄']) guildMembers['自由英雄'] = [];
        guildMembers['自由英雄'].push(rName);
      }
    });

    const guildColors = {
      "咪咪胡胡": "#ec4899",
      "嘿喲嘿喲拔蘿蔔": "#f59e0b",
      "Cake": "#3b82f6",
      "天琳琳地琳琳": "#10b981",
      "自由英雄": "#a855f7"
    };

    const guilds = Object.keys(guildMembers).map(gname => ({
      name: gname,
      color: guildColors[gname] || '#8b5cf6',
      badge: gname === '咪咪胡胡' ? '🐱' : (gname === '嘿喲嘿喲拔蘿蔔' ? '🥕' : (gname === 'Cake' ? '🎂' : (gname === '天琳琳地琳琳' ? '⚡' : '🛡️'))),
      members: guildMembers[gname]
    }));

    const seasonStartStr = localStorage.getItem("iron_heroes_season_start") || gameState?.seasonStart || gameState?.boss?.seasonStart || "2026/08/12";
    const seasonEndStr = localStorage.getItem("iron_heroes_season_end") || gameState?.seasonEnd || gameState?.boss?.seasonEnd || "2026/08/31";
    const seasonStartDate = parseActivityDate(seasonStartStr) || new Date(2026, 6, 27);
    const seasonEndDate = parseActivityDate(seasonEndStr) || new Date(2026, 8, 30, 23, 59, 59);

    const excludedSet = getExcludedActivityIds();

    // 2. Parse Activities & Aggregate Stats
    const activities = [];
    const heroAggregates = {};
    heroes.forEach(h => {
      heroAggregates[h.name] = {
        physDmg: 0,
        magDmg: 0,
        maxGap: 0,
        validCount: 0
      };
    });

    const seenActIds = new Set();

    // Add manual entries first
    manualActs.forEach(m => {
      const actId = String(m.id);
      if (seenActIds.has(actId)) return;
      seenActIds.add(actId);

      const isExcluded = excludedSet.has(actId);
      const hero = heroMap[m.hero] || { maxHr: 185, guild: '自由英雄' };
      const actDate = parseActivityDate(m.date || m.time);
      const inSeason = actDate ? (actDate >= seasonStartDate && actDate <= seasonEndDate) : true;
      const duration = cleanNumber(m.duration);
      const avgHr = cleanNumber(m.avgHr);
      const maxHr = cleanNumber(m.maxHr);
      const calories = cleanNumber(m.calories);

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
        physDmg = Math.round(calories);
        magDmg = Math.round(trimp * 15);

        if (heroAggregates[m.hero]) {
          heroAggregates[m.hero].physDmg += physDmg;
          heroAggregates[m.hero].magDmg += magDmg;
          heroAggregates[m.hero].maxGap = Math.max(heroAggregates[m.hero].maxGap, gap);
          heroAggregates[m.hero].validCount += 1;
        }
      }

      activities.push({
        ...m,
        id: actId,
        isManual: true,
        isExcluded: isExcluded,
        guild: hero.guild,
        duration: duration,
        avgHr: avgHr,
        maxHr: maxHr,
        calories: calories,
        trimp: Math.round(trimp * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        isZone2: isZone2,
        zoneLabel: zoneLabel,
        isValidAttack: isValid,
        inSeason: inSeason,
        damage: physDmg + magDmg,
        physDmg: physDmg,
        magDmg: magDmg,
        gapVal: gap
      });
    });

    // Add Google Sheet entries
    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (row.length < 10) continue;
      const actId = String(row[0]);
      if (seenActIds.has(actId)) continue;
      seenActIds.add(actId);

      const isExcluded = excludedSet.has(actId);
      const name = row[1]?.trim();
      const timeStr = row[2];
      const itemType = row[3] || 'Workout';
      const title = row[4] || '自主鍛鍊';
      const durStr = row[5];
      const distStr = row[6];
      const elevStr = row[7];
      const avgHrStr = row[8];
      const maxHrStr = row[9];
      const calStr = row[11] || '0';

      const hero = heroMap[name];
      if (!hero) continue;

      const actDate = parseActivityDate(timeStr);
      const inSeason = actDate && (actDate >= seasonStartDate && actDate <= seasonEndDate);

      const duration = cleanNumber(durStr);
      const avgHr = cleanNumber(avgHrStr);
      const maxHr = cleanNumber(maxHrStr);
      const calories = cleanNumber(calStr);

      let trimp = 0.0;
      if (hero.maxHr > 0 && avgHr > 0) {
        const ratio = avgHr / hero.maxHr;
        trimp = duration * ratio * Math.exp(1.92 * ratio);
      }

      const gap = Math.max(0.0, maxHr - avgHr);
      const suffer = avgHr > 0 ? Math.pow(avgHr / 150.0, 2) * duration : 0.0;
      const density = duration > 0 ? suffer / duration : 0.0;

      const isZone2 = (0.60 * hero.maxHr) <= avgHr && avgHr <= (0.75 * hero.maxHr);
      const zoneLabel = isZone2 ? '🟢 有氧燃脂' : (avgHr > 0.75 * hero.maxHr ? '🚀 極限無氧' : '🚶 暖身/恢復');

      const isValid = (duration >= 30.0) && inSeason && !isExcluded;
      let physDmg = 0;
      let magDmg = 0;

      if (isValid) {
        physDmg = Math.round(calories);
        magDmg = Math.round(trimp * 15);

        if (heroAggregates[name]) {
          heroAggregates[name].physDmg += physDmg;
          heroAggregates[name].magDmg += magDmg;
          heroAggregates[name].maxGap = Math.max(heroAggregates[name].maxGap, gap);
          heroAggregates[name].validCount += 1;
        }
      }

      activities.push({
        id: actId,
        isManual: false,
        isExcluded: isExcluded,
        hero: name,
        guild: hero.guild,
        date: timeStr.split(' ')[0] || '2026/08/01',
        time: timeStr,
        type: itemType,
        title: title,
        duration: duration,
        distance: cleanNumber(distStr),
        elevation: cleanNumber(elevStr),
        avgHr: avgHr,
        maxHr: maxHr,
        calories: calories,
        trimp: Math.round(trimp * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        suffer: Math.round(suffer * 10) / 10,
        density: Math.round(density * 100) / 100,
        zoneLabel: zoneLabel,
        isZone2: isZone2,
        isValidAttack: isValid,
        inSeason: inSeason,
        damage: physDmg + magDmg,
        physDmg: physDmg,
        magDmg: magDmg,
        gapVal: gap
      });
    }

    // 3. Hero Stats
    let totalSeasonPhys = 0;
    let totalSeasonMag = 0;
    let totalSeasonCrit = 0;
    let totalSeasonDmg = 0;

    heroStatsList = heroes.map(h => {
      const agg = heroAggregates[h.name] || { physDmg: 0, magDmg: 0, maxGap: 0, validCount: 0 };
      const heroActs = activities.filter(a => a.hero === h.name && !a.isExcluded);
      const critDmg = agg.validCount > 0 ? Math.round(agg.maxGap * 100) : 0;
      const totalHeroDmg = agg.physDmg + agg.magDmg + critDmg;

      totalSeasonPhys += agg.physDmg;
      totalSeasonMag += agg.magDmg;
      totalSeasonCrit += critDmg;
      totalSeasonDmg += totalHeroDmg;

      return {
        name: h.name,
        guild: h.guild,
        avatar: h.avatar,
        totalDamage: totalHeroDmg,
        physDmg: agg.physDmg,
        magDmg: agg.magDmg,
        critDmg: critDmg,
        maxGap: agg.maxGap,
        validWorkouts: agg.validCount,
        totalDuration: heroActs.reduce((s, a) => s + (a.duration || 0), 0),
        totalCalories: heroActs.reduce((s, a) => s + (a.calories || 0), 0),
        totalTrimp: heroActs.reduce((s, a) => s + (a.trimp || 0), 0),
        zone2Count: heroActs.filter(a => a.isZone2).length
      };
    });

    const bossMaxHp = gameState?.boss?.maxHp || 350000;
    const bossCurrentHp = Math.max(0, bossMaxHp - totalSeasonDmg);

    gameState = {
      activeMode: effectiveActiveMode,
      boss: {
        name: gameState?.boss?.name || '🌩️ 墮落雷神・索爾 (Fallen Thor)',
        subtitle: '世界 Boss 討伐戰 (全伺服器合作模式)',
        maxHp: bossMaxHp,
        currentHp: bossCurrentHp,
        seasonStart: seasonStartStr,
        seasonEnd: seasonEndStr,
        avatar: gameState?.boss?.avatar || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        description: '索爾受到雷霆魔劍侵蝕陷入瘋狂！全服英雄透過每日嚴格汗水鍛鍊（單次達 30 分鐘），轉化為物理與魔法攻擊！',
        rules: { minDurationMinutes: 30.0, physMultiplier: 1.0, magicMultiplier: 15.0, critMultiplier: 100.0 }
      },
      guilds: guilds,
      heroes: heroes,
      activities: activities,
      classic0717: gameState?.classic0717 || window.frozenClassic0717,
      snapshots: JSON.parse(localStorage.getItem("custom_archived_seasons") || "null") || gameState?.snapshots || gameState?.archivedSeasons || [],
      archivedSeasons: JSON.parse(localStorage.getItem("custom_archived_seasons") || "null") || gameState?.snapshots || gameState?.archivedSeasons || [],
      summary: {
        totalPhys: totalSeasonPhys,
        totalMag: totalSeasonMag,
        totalCrit: totalSeasonCrit,
        totalDamage: totalSeasonDmg
      }
    };

    renderAllGameViews();

    // Persist full synced data to server with calculated boss & heroStats to prevent bounce-back
    try {
      fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: activities,
          heroes: heroes,
          guilds: guilds,
          boss: gameState.boss,
          summary: gameState.summary,
          heroStats: heroStatsList
        })
      }).catch(e => {});
    } catch(e) {}

  } catch (err) {
    console.error('Google Sheet Sync Error:', err);
  } finally {
    if (syncBtn) {
      syncBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-emerald-400"></i><span>同步 Sheet</span>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

setInterval(syncFromGoogleSheet, SHEET_CONFIG.pollIntervalSeconds * 1000);
