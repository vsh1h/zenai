import httpx
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

URL = os.environ.get("SUPABASE_URL") + "/rest/v1/leads"
KEY = os.environ.get("SUPABASE_KEY")

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

lead_id = str(uuid.uuid4())
payload = {
    "id": lead_id,
    "name": "Diagnostic Lead",
    "email": "diagnostic@test.com",
    "phone": "9999999999",
    "status": "New"
}

print(f"DEBUG: POSTing to {URL}")
try:
    with httpx.Client(timeout=10.0) as client:
        response = client.post(URL, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
