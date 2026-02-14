import urllib.request
import json
import uuid
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    print(f"1. Testing Health Endpoint ({BASE_URL}/health)...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health") as response:
            data = json.loads(response.read().decode())
            print(f"Status: {response.status}")
            print(f"Response: {data}")
            if data.get("status") == "ok":
                return True
    except Exception as e:
        print(f"Failed: {e}")
        return False

def test_sync():
    print(f"\n2. Testing Sync Endpoint ({BASE_URL}/sync)...")
    
   
    client_uuid = str(uuid.uuid4())
    lead_payload = {
        "leads": [
            {
                "id": client_uuid,
                "name": f"API Tester {client_uuid[:4]}",
                "email": f"test_{client_uuid[:8]}@api.com",
                "phone": f"555{client_uuid[:7]}".replace("-", "")[:10],
                "location": "Bandra, Mumbai",
                "intent": "High Interest",
                "status": "New",
               
                "meta_data": {"source": "API Test Script"}
            }
        ]
    }
    
    json_data = json.dumps(lead_payload).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/sync", 
        data=json_data, 
        headers={'Content-Type': 'application/json'}
    )

    try:
        print("   📤 Sending New Lead...")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Response: {data}")
            if data.get("new_records") == 1:
                print("SUCCESS: Lead accepted.")
            else:
                print("WARNING: unexpected record count.")
    except Exception as e:
        print(f"Failed: {e}")
        return

    
    try:
        print("Sending Duplicate Lead...")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Response: {data}")
            if data.get("ignored_duplicates") == 1:
                print("SUCCESS: Duplicate correctly ignored (First-Agent-Wins).")
            else:
                 print("WARNING: Duplicate not blocked?")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":

    print("Waiting for server to start...")
    for i in range(5):
        try:
            with urllib.request.urlopen(f"{BASE_URL}/") as r:
                if r.status == 200:
                    break
        except:
            time.sleep(1)
            print(".", end="", flush=True)
    print("\n")
    
    if test_health():
        test_sync()
    else:
        print("\nServer not healthy/reachable. Is uvicorn running?")
