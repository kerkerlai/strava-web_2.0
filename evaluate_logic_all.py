import json
import math
from datetime import datetime

with open('data/participants.json') as f:
    p_raw = json.load(f)[1:]
hero_map = {}
for r in p_raw:
    if len(r) >= 3:
        name = r[0].strip()
        hero_map[name] = {"max_hr": 220 - int(r[1]), "guild": r[2].strip()}

with open('data/rawdata_all.json') as f:
    a_raw = json.load(f)[1:]

season_start = datetime(2026, 7, 27)

agg = {n: {"phys": 0, "mag": 0, "max_gap": 0, "valid": 0, "crit": 0} for n in hero_map}

for row in a_raw:
    if len(row) < 10: continue
    name = row[1].strip()
    if name not in hero_map: continue
    date_str = row[2].replace('上午', 'AM').replace('下午', 'PM')
    try:
        dt = datetime.strptime(date_str, "%Y/%m/%d %p %I:%M:%S")
    except:
        try:
            dt = datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except: continue
        
    if dt < season_start: continue
    
    try:
        dur = float(row[5]) if row[5] else 0.0
        avg = float(row[8]) if row[8] else 0.0
        mhr = float(row[9]) if row[9] else 0.0
        cal = float(row[11].replace('*','')) if len(row) > 11 and row[11] else 0.0
    except: continue
    
    if dur < 30.0: continue
    
    trimp = 0.0
    u_mhr = hero_map[name]["max_hr"]
    if u_mhr > 0 and avg > 0:
        ratio = avg / u_mhr
        trimp = dur * ratio * math.exp(1.92 * ratio)
        
    gap = max(0.0, mhr - avg)
    
    phys = round(cal)
    mag = round(trimp * 15)
    
    agg[name]["phys"] += phys
    agg[name]["mag"] += mag
    agg[name]["max_gap"] = max(agg[name]["max_gap"], gap)
    agg[name]["valid"] += 1

print(f"{'Hero':<10} | {'JS TRIMP':<10} ")
for name, m in agg.items():
    if m["valid"] > 0:
        print(f"{name:<10} | {m['mag']:<10} ")
