import os
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

supabase: Client = None

if url and key:
  
    supabase = create_client(url, key, options=ClientOptions(postgrest_client_timeout=20))
else:
    print("Warning: Supabase credentials not found in environment variables.")
