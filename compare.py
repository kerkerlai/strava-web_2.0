import json, csv, math, datetime

with open('data/participants.json') as f:
    p_raw = json.load(f)[1:]
heroes = {r[0].strip(): {"max_hr": 220 - int(r[1])} for r in p_raw if len(r) >= 3}
season_start = datetime.datetime(2026, 7, 27)

sheet_acts = {}
with open('sheet.csv') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        if len(row) < 15: continue
        try:
            aid = row[0]
            if not aid.isdigit(): continue
            name = row[1].strip()
            trimp = float(row[14])
            sheet_acts[aid] = {"name": name, "trimp": trimp, "date": row[2]}
        except:
            pass

with open('data/rawdata_all.json') as f:
    a_raw = json.load(f)[1:]

js_acts = {}
for row in a_raw:
    if len(row) < 10: continue
    aid, name = row[0].strip(), row[1].strip()
    if name not in heroes: continue
    
    date_str = row[2].replace('上午', 'AM').replace('下午', 'PM')
    try:
        dt = datetime.datetime.strptime(date_str, "%Y/%m/%d %p %I:%M:%S")
    except:
        try:
            dt = datetime.datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except: continue
    if dt < season_start: continue
    
    dur = float(row[5]) if row[5] else 0.0
    if dur < 30.0: continue
    avg = float(row[8]) if row[8] else 0.0
    m_hr = heroes[name]["max_hr"]
    
    trimp = 0.0
    if m_hr > 0 and avg > 0:
        ratio = avg / m_hr
        trimp = dur * ratio * math.exp(1.92 * ratio)
        
    js_acts[aid] = {"name": name, "mag": round(trimp * 15)}

sheet_tot_mag = {n: 0 for n in heroes}
for aid, a in sheet_acts.items():
    date_str = a["date"].replace('上午', 'AM').replace('下午', 'PM')
    try:
        dt = datetime.datetime.strptime(date_str, "%Y/%m/%d %p %I:%M:%S")
    except:
        try:
            dt = datetime.datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except: continue
    if dt < season_start: continue
    if a["name"] in sheet_tot_mag:
       sheet_tot_mag[a["name"]] += round(float(a["trimp"]) * 15)

js_tot_mag = {n: 0 for n in heroes}
for aid, a in js_acts.items():
    js_tot_mag[a["name"]] += a["mag"]

print("Name | Sheet Mag | JS Mag")
for name in heroes:
    print(f"{name} | {sheet_tot_mag[name]} | {js_tot_mag[name]}")
