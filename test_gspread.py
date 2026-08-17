import gspread
try:
    gc = gspread.oauth()
    sh = gc.open_by_url("https://docs.google.com/spreadsheets/d/1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY/edit")
    print(sh.title)
except Exception as e:
    print("OAuth error:", e)
    try:
        gc = gspread.service_account()
        sh = gc.open_by_url("https://docs.google.com/spreadsheets/d/1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY/edit")
        print("Service account ok:", sh.title)
    except Exception as e2:
        print("Service Account error:", e2)
