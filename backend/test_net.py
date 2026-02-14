import urllib.request
try:
    url = "https://ltlztydivvcgboodbtjv.supabase.co"
    print(f"Testing connectivity to {url}...")
    with urllib.request.urlopen(url) as response:
        print(f"Status: {response.status}")
        print("Reachable!")
except Exception as e:
    print(f"Unreachable: {e}")
