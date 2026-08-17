import json
import urllib.request
import urllib.error
import time

SUPABASE_URL = "https://yxkvbkfnlqwlybhmugki.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def post_data(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, headers=HEADERS, data=json.dumps(data).encode("utf-8"), method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"❌ Error inserting into {table}: {e.code} - {e.read().decode('utf-8')}")
        return e.code

def run_migration():
    print("🚀 正在啟動 Supabase 資料庫種子數據遷移...")
    with open("data/supabase_seed.json", "r", encoding="utf-8") as f:
        seed = json.load(f)

    # 1. Migrate Heroes
    heroes = seed.get("heroes", [])
    print(f"👥 正在遷移 {len(heroes)} 位英雄名冊至 Supabase...")
    res_heroes = post_data("heroes", heroes)
    if res_heroes in [200, 201]:
        print(f"✅ 成功遷移 {len(heroes)} 位英雄名冊！")
    else:
        print(f"⚠️ 英雄遷移狀態碼: {res_heroes}")

    # 2. Migrate Activities in batches of 50
    activities = seed.get("activities", [])
    print(f"⚡ 正在遷移 {len(activities)} 筆運動紀錄至 Supabase...")
    batch_size = 50
    for i in range(0, len(activities), batch_size):
        chunk = activities[i:i+batch_size]
        res_act = post_data("activities", chunk)
        if res_act in [200, 201]:
            print(f"  ✅ 已上傳批次 {i+1} ~ {min(i+batch_size, len(activities))} 筆")
        else:
            print(f"  ❌ 批次 {i+1} 上傳失敗: {res_act}")
        time.sleep(0.2)

    # 3. Migrate Game Config
    with open("data/game_state.json", "r", encoding="utf-8") as f:
        gs = json.load(f)

    configs = [
        {"key": "active_mode", "value": gs.get("activeMode", "world_boss")},
        {"key": "boss_config", "value": gs.get("boss", {})},
        {"key": "classic_config", "value": gs.get("classic", {})},
        {"key": "rpg_config", "value": gs.get("rpg", {})},
        {"key": "snapshots", "value": gs.get("snapshots", gs.get("archivedSeasons", []))},
        {"key": "exclude_keywords", "value": ["羽球", "不想抓的關鍵字"]}
    ]
    print(f"⚙️ 正在遷移賽季核心設定至 Supabase...")
    res_cfg = post_data("game_config", configs)
    if res_cfg in [200, 201]:
        print(f"✅ 成功遷移賽季核心設定！")
    else:
        print(f"⚠️ 設定遷移狀態碼: {res_cfg}")

    print("\n🎉 Supabase 資料庫遷移作業全部完成！")

if __name__ == "__main__":
    run_migration()
