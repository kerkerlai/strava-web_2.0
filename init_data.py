import json
import math
from datetime import datetime

# Load participants
with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/participants.json') as f:
    p_raw = json.load(f)

guild_colors = {
    "咪咪胡胡": "#ec4899", # Pink/Rose
    "嘿喲嘿喲拔蘿蔔": "#f59e0b", # Amber/Orange
    "Cake": "#3b82f6", # Blue
    "天琳琳地琳琳": "#10b981" # Emerald
}

heroes = []
for row in p_raw[1:]:
    if len(row) >= 3:
        name, age, guild = row[0].strip(), int(row[1]), row[2].strip()
        heroes.append({
            "name": name,
            "age": age,
            "maxHr": 220 - age,
            "guild": guild,
            "avatar": f"https://api.dicebear.com/7.x/bottts/svg?seed={name}&backgroundColor=0f172a",
            "title": "資深冒險者"
        })

# Load raw activities
with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/rawdata_all.json') as f:
    raw_activities = json.load(f)

def parse_date(date_str):
    try:
        cleaned = date_str.replace('上午', 'AM').replace('下午', 'PM')
        return datetime.strptime(cleaned, "%Y/%m/%d %p %I:%M:%S")
    except Exception:
        try:
            return datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except Exception:
            return None

activities = []
for row in raw_activities[1:]:
    if len(row) < 10:
        continue
    act_id, name, time_str, item_type, title, dur_str, dist_str, elev_str, avg_hr_str, max_hr_str = row[:10]
    cal_str = row[11] if len(row) > 11 else "0"
    
    name = name.strip()
    hero_info = next((h for h in heroes if h["name"] == name), None)
    if not hero_info:
        continue

    try:
        duration = float(dur_str) if dur_str else 0.0
        avg_hr = float(avg_hr_str) if avg_hr_str else 0.0
        max_hr = float(max_hr_str) if max_hr_str else 0.0
        calories = float(cal_str.replace('*', '').strip()) if cal_str else 0.0
    except Exception:
        continue

    user_max_hr = hero_info["maxHr"]
    if user_max_hr > 0 and avg_hr > 0:
        ratio = avg_hr / user_max_hr
        trimp = duration * ratio * math.exp(1.92 * ratio)
    else:
        trimp = 0.0

    gap = max(0.0, max_hr - avg_hr)
    suffer = ((avg_hr / 150.0) ** 2) * duration if avg_hr > 0 else 0.0
    density = suffer / duration if duration > 0 else 0.0

    # Zone 2 check (60% to 75% of max HR)
    is_zone2 = (0.60 * user_max_hr) <= avg_hr <= (0.75 * user_max_hr)
    zone_label = "🟢 有氧燃脂" if is_zone2 else ("🚀 極限無氧" if avg_hr > 0.75 * user_max_hr else "🚶 暖身/恢復")

    # Damage calculation
    if duration >= 30.0:
        phys_dmg = round(calories)
        mag_dmg = round(trimp * 15)
        crit_dmg = round(gap * 100)
        dmg = phys_dmg + mag_dmg + crit_dmg
    else:
        phys_dmg = 0
        mag_dmg = 0
        crit_dmg = 0
        dmg = 0

    activities.append({
        "id": act_id or f"ACT-{len(activities)+1}",
        "hero": name,
        "guild": hero_info["guild"],
        "date": time_str.split(' ')[0] if time_str else "2026/08/01",
        "time": time_str,
        "type": item_type or "Workout",
        "title": title or "自主鍛鍊",
        "duration": duration,
        "distance": float(dist_str) if dist_str else 0.0,
        "elevation": float(elev_str) if elev_str else 0.0,
        "avgHr": avg_hr,
        "maxHr": max_hr,
        "calories": calories,
        "trimp": round(trimp, 1),
        "gap": round(gap, 1),
        "suffer": round(suffer, 1),
        "density": round(density, 2),
        "zoneLabel": zone_label,
        "isZone2": is_zone2,
        "isValidAttack": duration >= 30.0,
        "damage": dmg,
        "physDmg": phys_dmg,
        "magDmg": mag_dmg,
        "critDmg": crit_dmg
    })

game_config = {
    "activeMode": "world_boss", # "world_boss" or "classic"
    "boss": {
        "name": "🌩️ 墮落雷神・索爾 (Fallen Thor)",
        "subtitle": "世界 Boss 討伐戰 (全伺服器合作模式)",
        "maxHp": 350000,
        "currentHp": 232849, # As shown in the Sheet
        "seasonStart": "2026/07/27",
        "seasonEnd": "2026/09/31",
        "avatar": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
        "description": "索爾受到雷霆魔劍侵蝕陷入瘋狂，諸神黃昏即將降臨！唯有全服英雄透過每日嚴格汗水訓練，轉化為物理與魔法攻擊，方能拯救世界！",
        "rules": {
            "minDurationMinutes": 30.0,
            "physMultiplier": 1.0,
            "magicMultiplier": 15.0,
            "critMultiplier": 100.0
        }
    },
    "guilds": [
        {"name": "咪咪胡胡", "color": "#ec4899", "badge": "🐱", "members": ["Naomi", "Weber"]},
        {"name": "嘿喲嘿喲拔蘿蔔", "color": "#f59e0b", "badge": "🥕", "members": ["Mooooo", "Moupower"]},
        {"name": "Cake", "color": "#3b82f6", "badge": "🎂", "members": ["Kerker", "Calla"]},
        {"name": "天琳琳地琳琳", "color": "#10b981", "badge": "⚡", "members": ["Richardyoho", "Lynn Chao"]}
    ],
    "heroes": heroes,
    "activities": activities
}

with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/game_data.json', 'w', encoding='utf-8') as f:
    json.dump(game_config, f, ensure_ascii=False, indent=2)

print(f"Game data initialized successfully with {len(heroes)} heroes and {len(activities)} activities!")
