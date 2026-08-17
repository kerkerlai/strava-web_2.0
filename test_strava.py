import requests
import json
import html

headers = {
    "User-Agent": "Mozilla/5.0",
    "Cookie": "_strava4_session=oipb9oakcd95sfddg89ipb1ln269j5cl",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "text/javascript, application/json, text/html, */*"
}

ath_id = "972959242" # Calla
ym = "202607"

url = f"https://www.strava.com/athletes/{ath_id}/interval?interval={ym}&interval_type=month&chart_type=miles&year_offset=0"
print("URL:", url)
r = requests.get(url, headers=headers)
print("Status:", r.status_code)
if r.status_code == 200:
    idx = r.text.find("data-react-props")
    if idx != -1:
        s_idx = r.text.find("{", idx)
        tag_end = r.text.find(">", idx)
        e_idx = r.text.rfind("}", s_idx, tag_end)
        raw_str = r.text[s_idx : e_idx + 1]
        fixed_str = raw_str.replace(r"\&quot;", r"\&quot;").replace(r"\\&quot;", r"\&quot;")
        clean_json = html.unescape(fixed_str)
        try:
            p = json.loads(clean_json)
            entries = p.get("appContext", {}).get("preFetchedEntries", [])
            acts = [e.get("activity") for e in entries if e.get("activity")]
            print(f"Found {len(acts)} activities in data-react-props")
        except Exception as e:
            print("Failed parsing JSON:", e)
    else:
        print("data-react-props not found in response HTML")
        if len(r.text) < 1000:
            print("Response text:", r.text)
        else:
            print("Response too long, assuming normal HTML.")

