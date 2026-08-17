import gspread
import google.auth
credentials, project = google.auth.default(scopes=['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'])
gc = gspread.authorize(credentials)

sh = gc.open_by_key('1gNr8ptE_zjIeZsliaEqddqp5xz3Ir0LT7AkLmnSh3pY')
# find the raw data tab where formulas might live
worksheet = sh.worksheet("Rawdata") 
data = worksheet.get_values(value_render_option="FORMULA")
print("Rawdata headers:")
print(data[0][:17])
print("First row data:")
print(data[1][:17])
