import json
import math
from datetime import datetime

with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/participants.json') as f:
    p_raw = json.load(f)
participants = {}
for row in p_raw[1:]:
    if len(row) >= 3:
        name, age, guild = row[0].strip(), int(row[1]), row[2].strip()
        participants[name] = {
            "name": name,
            "age": age,
            "max_hr": 220 - age,
            "guild": guild
        }

with open('/usr/local/google/home/kerkerlai/iron-heroes-web/data/rawdata_all.json') as f:
    raw_activities = json.load(f)

header = raw_activities[0]
rows = raw_activities[1:]

boss_max_hp = 350000
total_physical = 0
total_magic = 0
total_crit = 0
total_damage = 0

hero_stats = {name: {"name": name, "guild": p["guild"], "count": 0, "physical": 0, "magic": 0, "crit": 0, "total": 0} for name, p in participants.items()}
guild_stats = {}

# Parse date helper
def parse_date(date_str):
    try:
        # e.g. 2026/8/13 下午 8:15:00 or 2026/08/01
        cleaned = date_str.replace('上午', 'AM').replace('下午', 'PM')
        return datetime.strptime(cleaned, "%Y/%m/%d %p %I:%M:%S")
    except Exception:
        try:
            return datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except Exception:
            return None

season_start = datetime(2026, 7, 27)

valid_activities = []
for row in rows:
    if len(row) < 10:
        continue
    act_id, name, time_str, item_type, title, dur_str, dist_str, elev_str, avg_hr_str, max_hr_str = row[:10]
    cal_str = row[11] if len(row) > 11 else "0"
    
    name = name.strip()
    if name not in participants:
        continue

    dt = parse_date(time_str)
    if dt and dt < season_start:
        continue # before World Boss season

    try:
        duration = float(dur_str) if dur_str else 0.0
        avg_hr = float(avg_hr_str) if avg_hr_str else 0.0
        max_hr = float(max_hr_str) if max_hr_str else 0.0
        calories = float(cal_str.replace('*', '').strip()) if cal_str else 0.0
    except Exception:
        continue

    user_max_hr = participants[name]["max_hr"]

    # TRIMP calculation
    if user_max_hr > 0 and avg_hr > 0:
        ratio = avg_hr / user_max_hr
        trimp = duration * ratio * math.exp(1.92 * ratio)
    else:
        trimp = 0.0

    gap = max(0.0, max_hr - avg_hr)
    suffer = ((avg_hr / 150.0) ** 2) * duration if avg_hr > 0 else 0.0
    density = suffer / duration if duration > 0 else 0.0

    # World Boss Damage
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

    hero_stats[name]["count"] += 1
    hero_stats[name]["physical"] += phys_dmg
    hero_stats[name]["magic"] += mag_dmg
    hero_stats[name]["crit"] += crit_dmg
    hero_stats[name]["total"] += dmg

    total_physical += phys_dmg
    total_magic += mag_dmg
    total_crit += crit_dmg
    total_damage += dmg

    valid_activities.append({
        "id": act_id,
        "hero": name,
        "guild": participants[name]["guild"],
        "time": time_str,
        "type": item_type,
        "title": title,
        "duration": duration,
        "avgHr": avg_hr,
        "maxHr": max_hr,
        "calories": calories,
        "trimp": round(trimp, 1),
        "gap": round(gap, 1),
        "damage": dmg,
        "physDmg": phys_dmg,
        "magDmg": mag_dmg,
        "critDmg": crit_dmg
    })

print(f"=== 世界 Boss 戰情報告 (從 2026/07/27 起) ===")
print(f"Boss 總血量: {boss_max_hp:,}")
print(f"全服總傷害: {total_damage:,}")
print(f"剩餘血量: {boss_max_hp - total_damage:,} ({((boss_max_hp - total_damage)/boss_max_hp)*100:.1f}%)")
print(f"普攻 (熱量): {total_physical:,}")
print(f"魔攻 (TRIMP): {total_magic:,}")
print(f"爆擊 (落差): {total_crit:,}")
print(f"\n=== 英雄 MVP 傷害排行 ===")
for rank, (name, s) in enumerate(sorted(hero_stats.items(), key=lambda x: x[1]["total"], reverse=True), 1):
    print(f"#{rank} {name} ({s['guild']}): 總傷 {s['total']:,} | 普攻 {s['physical']:,} | 魔攻 {s['magic']:,} | 爆擊 {s['crit']:,} (運動 {s['count']} 次)")
