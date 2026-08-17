import os, json, requests, datetime, math
SUPABASE_URL = "https://yxkvbkfnlqwlybhmugki.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

r = requests.get(f"{SUPABASE_URL}/rest/v1/activities?hero=eq.Kerker", headers=SUPABASE_HEADERS)
acts = r.json()

season_start = datetime.datetime(2026, 7, 27)

trimp_js = 0
for a in acts:
    date_str = a["date"].replace('上午', 'AM').replace('下午', 'PM')
    try:
        dt = datetime.datetime.strptime(date_str, "%Y/%m/%d %p %I:%M:%S")
    except:
        try:
            dt = datetime.datetime.strptime(date_str.split(' ')[0], "%Y/%m/%d")
        except: continue
        
    if dt < season_start: continue
    
    dur = float(a["duration"]) if a.get("duration") else 0.0
    if dur < 30.0: continue
    if a.get("is_excluded"): continue
    
    avg = float(a["avg_hr"]) if a.get("avg_hr") else 0.0
    m_hr = 185 # Kerker
    if m_hr > 0 and avg > 0:
        ratio = avg / m_hr
        trimp = dur * ratio * math.exp(1.92 * ratio)
        trimp_js += round(trimp * 15)

print(f"Kerker JS TRIMP * 15 using Supabase Data: {trimp_js}")
