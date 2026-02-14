import httpx
import os
from dotenv import load_dotenv

load_dotenv()

URL = os.environ.get("SUPABASE_URL") + "/rest/v1/leads?select=*"
KEY = os.environ.get("SUPABASE_KEY")

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
}

print(f"DEBUG: Fetching all leads from {URL}")
try:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(URL, headers=headers)
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Found {len(data)} leads.")
        for lead in data:
            print(f"- {lead.get('name')} ({lead.get('email') or 'no email'})")
            if "rajesh" in lead.get('name', '').lower():
                 print("FOUND RAJESH!")
except Exception as e:
    print(f"ERROR: {e}")
