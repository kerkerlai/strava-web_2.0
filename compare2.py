import compare
sheet = compare.sheet_acts
js = compare.js_acts

js_keys = set(js.keys())

for aid, a in sheet.items():
    date_str = a["date"].replace('上午', 'AM').replace('下午', 'PM')
    import datetime
    try:
        dt = datetime.datetime.strptime(date_str, "%Y/%m/%d %p %I:%M:%S")
    except:
        try:
            dt = datetime.datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except: continue
    if dt < compare.season_start: continue
    
    if a["name"] == "Kerker":
        if aid not in js_keys:
            print(f"Sheet has Kerker activity {aid} ({a['date']}) not in JS. TRIMP: {a['trimp']}")
