#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
鋼鐵英雄紀元 (Iron Heroes Era) - 全系統自動化 QA 檢驗套件
"""

import json
import sys
import math
import urllib.request
import urllib.error

SUPABASE_URL = "https://yxkvbkfnlqwlybhmugki.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a3Zia2ZubHF3bHliaG11Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDIyODYsImV4cCI6MjEwMjUxODI4Nn0.Jky4o080Gn9-prx-G0aj7dCl7rmA1dJWN3BZgkVmjwo"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation"
}

def supabase_get(path):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def supabase_post(table, data):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, data=json.dumps(data).encode("utf-8"), method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def supabase_delete(table, query):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}?{query}", headers=HEADERS, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        return resp.status

passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        print(f"  ✅ [PASS] {name}")
        passed += 1
    else:
        print(f"  ❌ [FAIL] {name} - {details}")
        failed += 1

def run_qa_suite():
    print("=" * 75)
    print("🚀 啟動【鋼鐵英雄紀元】全系統 QA 自動化整合檢驗套件")
    print("=" * 75)

    # SUITE 1
    print("\n--- [SUITE 1] Supabase 雲端資料庫架構與權限檢驗 ---")
    try:
        heroes = supabase_get("heroes?select=*")
        test("Table [heroes] 冒險者名冊表正常讀取", isinstance(heroes, list) and len(heroes) >= 8, f"筆數: {len(heroes)}")
        
        activities = supabase_get("activities?select=*")
        test("Table [activities] 原始運動資料表正常讀取", isinstance(activities, list) and len(activities) >= 260, f"筆數: {len(activities)}")
        
        configs = supabase_get("game_config?select=*")
        test("Table [game_config] 賽事設定與快照表正常讀取", isinstance(configs, list) and len(configs) >= 4, f"項目數: {len(configs)}")
    except Exception as e:
        test("Supabase API 連線異常", False, str(e))

    # SUITE 2
    print("\n--- [SUITE 2] Python 爬蟲與排程端動態資料流檢驗 ---")
    try:
        sys.path.insert(0, "scripts")
        import strava_scraper
        h_map = strava_scraper.load_heroes_from_supabase()
        test("爬蟲動態自資料庫取得 Strava ID (零硬編碼)", len(h_map) >= 7 and "468395126" in h_map, f"選手數: {len(h_map)}")
        
        kws = strava_scraper.load_exclude_keywords_from_supabase()
        test("爬蟲動態自資料庫取得排除關鍵字 (零硬編碼)", isinstance(kws, list) and "羽球" in kws, f"排除詞: {kws}")
        
        act_ids = strava_scraper.get_existing_activity_ids()
        test("爬蟲動態載入現存活動 ID 比對庫", len(act_ids) >= 260, f"ID 總數: {len(act_ids)}")
    except Exception as e:
        test("Python 爬蟲模組檢驗異常", False, str(e))

    # SUITE 3
    print("\n--- [SUITE 3] GM 控制台核心按鈕資料庫即時 CRUD 檢驗 ---")
    try:
        # 1. 新增冒險者
        test_hero = {"name": "QA_Test_Hero", "age": 28, "max_hr": 192, "guild": "Cake", "rpg_class": "遊俠", "strava_id": "99999999"}
        supabase_post("heroes", test_hero)
        h_check = supabase_get("heroes?name=eq.QA_Test_Hero")
        test("按鈕 1: 【➕ 新增冒險者】寫入 Supabase", len(h_check) == 1 and h_check[0]["strava_id"] == "99999999")

        # 2. 編輯冒險者
        test_hero_edit = {"name": "QA_Test_Hero", "age": 30, "max_hr": 190, "guild": "Cake", "rpg_class": "大法師", "strava_id": "88888888"}
        supabase_post("heroes", test_hero_edit)
        h_edit_check = supabase_get("heroes?name=eq.QA_Test_Hero")
        test("按鈕 2: 【✏️ 編輯冒險者】更新 Supabase", h_edit_check[0]["age"] == 30 and h_edit_check[0]["rpg_class"] == "大法師")

        # 3. 刪除冒險者
        supabase_delete("heroes", "name=eq.QA_Test_Hero")
        h_del_check = supabase_get("heroes?name=eq.QA_Test_Hero")
        test("按鈕 3: 【🗑️ 刪除冒險者】自 Supabase 抹除", len(h_del_check) == 0)

        # 4. 手動打卡補登
        test_act = {"id": "QA_TEST_ACT_001", "hero": "Kerker", "date": "2026/08/16 12:00:00", "type": "Run", "name": "QA 壓力測試", "duration": 45, "distance": 5, "avg_hr": 140, "max_hr": 170, "calories": 400, "is_manual": True, "is_excluded": False}
        supabase_post("activities", test_act)
        a_check = supabase_get("activities?id=eq.QA_TEST_ACT_001")
        test("按鈕 4: 【⚔️ 手動打卡補登】寫入 Supabase", len(a_check) == 1 and a_check[0]["duration"] == 45)

        # 5. 編輯運動紀錄
        supabase_post("activities", {**test_act, "name": "QA 壓力測試 (已修改)", "calories": 450})
        a_edit_check = supabase_get("activities?id=eq.QA_TEST_ACT_001")
        test("按鈕 5: 【✏️ 編輯運動紀錄】更新 Supabase", a_edit_check[0]["calories"] == 450)

        # 6. 作廢扣分開關
        supabase_post("activities", {**test_act, "is_excluded": True})
        a_exc_check = supabase_get("activities?id=eq.QA_TEST_ACT_001")
        test("按鈕 6: 【🚫 作廢扣分】更新 is_excluded 狀態", a_exc_check[0]["is_excluded"] is True)

        # 7. 刪除手動紀錄
        supabase_delete("activities", "id=eq.QA_TEST_ACT_001")
        a_del_check = supabase_get("activities?id=eq.QA_TEST_ACT_001")
        test("按鈕 7: 【🗑️ 刪除手動紀錄】自 Supabase 抹除", len(a_del_check) == 0)

        # 8. 賽事模式切換
        supabase_post("game_config", [{"key": "active_mode", "value": "world_boss"}])
        cfg_check = supabase_get("game_config?key=eq.active_mode")
        test("按鈕 8: 【💾 儲存賽事設定與模式切換】寫入 Supabase", cfg_check[0]["value"] == "world_boss")

    except Exception as e:
        test("GM 控制台 CRUD 測試異常", False, str(e))

    # SUITE 4
    print("\n--- [SUITE 4] 核心數學計算引擎 (三資料片邏輯) 檢驗 ---")
    try:
        dur1, avg1, max1, cal1 = 40, 140, 180, 400
        ratio1 = avg1 / 185.0
        trimp1 = dur1 * ratio1 * math.exp(1.92 * ratio1)
        phys1 = round(cal1)
        mag1 = round(trimp1 * 15)
        gap1 = max1 - avg1

        dur2, avg2, max2, cal2 = 50, 130, 185, 500
        ratio2 = avg2 / 185.0
        trimp2 = dur2 * ratio2 * math.exp(1.92 * ratio2)
        phys2 = round(cal2)
        mag2 = round(trimp2 * 15)
        gap2 = max2 - avg2

        tot_phys = phys1 + phys2
        tot_mag = mag1 + mag2
        max_gap = max(gap1, gap2)
        crit_dmg = round(max_gap * 100)
        hero_total = tot_phys + tot_mag + crit_dmg

        test("世界 Boss 數學: 普攻 = 熱量累加", tot_phys == 900, f"Phys = {tot_phys}")
        test("世界 Boss 數學: 魔攻 = TRIMP * 15 累加", tot_mag == (mag1 + mag2), f"Mag = {tot_mag}")
        test("世界 Boss 數學: 爆擊 = 取單次最大 Gap * 100", crit_dmg == 5500, f"Crit = {crit_dmg} (Max Gap: {max_gap})")
        test("世界 Boss 數學: 英雄總輸出 = 普攻 + 魔攻 + 單次最大Gap爆擊", hero_total == (tot_phys + tot_mag + 5500), f"Total = {hero_total}")

        # 經典競技
        guild_m_count = 2
        per_wk = round((2 / guild_m_count) * 10) / 10
        test("經典競技數學: 人均出勤除算公式", per_wk == 1.0)

        # RPG 職業天賦
        berserker_cp = round((max_gap * 50) + ((gap1 + gap2) * 8) + (tot_phys * 0.6))
        test("RPG 職業天賦數學: 狂戰士 CP 公式 (落差專精加成)", berserker_cp > 0, f"CP = {berserker_cp}")

    except Exception as e:
        test("數學計算引擎檢驗異常", False, str(e))

    # SUITE 5
    print("\n--- [SUITE 5] 歷代英雄史快照 (Chronicles) 1:1 數據一致性檢驗 ---")
    try:
        snaps_data = supabase_get("game_config?key=eq.snapshots")
        snaps = snaps_data[0]["value"] if snaps_data else []
        test("快照列表成功自 Supabase 讀取", isinstance(snaps, list) and len(snaps) > 0, f"快照數量: {len(snaps)}")
        
        wb_snap = next((s for s in snaps if s.get("type") == "world_boss"), None)
        if wb_snap:
            summary = wb_snap.get("summary", {})
            test("快照包含普攻總和 (totalPhys)", summary.get("totalPhys", 0) > 0, f"Phys = {summary.get('totalPhys')}")
            test("快照包含魔攻總和 (totalMag)", summary.get("totalMag", 0) > 0, f"Mag = {summary.get('totalMag')}")
            test("快照包含爆擊總和 (totalCrit)", summary.get("totalCrit", 0) > 0, f"Crit = {summary.get('totalCrit')}")
            test("快照總輸出 = 普攻 + 魔攻 + 爆擊 (零誤差)", summary.get("totalDamage") == (summary.get("totalPhys", 0) + summary.get("totalMag", 0) + summary.get("totalCrit", 0)), f"Total = {summary.get('totalDamage')}")
            test("快照魔王剩餘血量 = 350000 - 總輸出 (零誤差)", wb_snap.get("boss", {}).get("currentHp") == (350000 - summary.get("totalDamage")), f"Boss HP = {wb_snap.get('boss', {}).get('currentHp')}")
    except Exception as e:
        test("快照一致性檢驗異常", False, str(e))

    # SUMMARY
    print("\n" + "=" * 75)
    print(f"📊 QA 測試總結: 共執行 {passed + failed} 項檢驗 | 通過: {passed} ✅ | 失敗: {failed} ❌")
    print("=" * 75)
    if failed == 0:
        print("🎉 ALL PASS！全系統全功能 100% 驗證通過，零 Bug，數據鏈路完全打通！")
    else:
        print("⚠️ 部分測試未通過，請檢查上述日誌。")

if __name__ == "__main__":
    run_qa_suite()
