import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def run_sanity_check():
    print("Starting Architect Sanity Check...")
    

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_KEY missing from .env")
        print("   Please cp .env.example .env and fill in your credentials.")
        return

    try:
        supabase: Client = create_client(url, key)
    except Exception as e:
         print(f"ERROR: Failed to initialize Supabase client. {e}")
         return


    try:
        supabase.table("leads").select("id").limit(1).execute()
        print("SUCCESS: Leads table found and accessible.")
    except Exception as e:
        print(f"ERROR: Leads table check failed. Did you run schema.sql? \nDetails: {e}")

  
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if "audio-notes" in bucket_names:
            print("SUCCESS: 'audio-notes' storage bucket found.")
        else:
            print("ERROR: 'audio-notes' bucket not found. Please create it in Supabase Storage.")
    except Exception as e:
        print(f"ERROR: Could not access storage. Check your Service Role Key. \nDetails: {e}")

   
    try:
        test_id_1 = "00000000-0000-0000-0000-000000000001"
        test_id_2 = "00000000-0000-0000-0000-000000000002"
        common_email = "first_touch_test@finideas.com"
        
        
        supabase.table("leads").delete().eq("email", common_email).execute()
        
        
        print("   Inserting Lead 1...")
        lead_1 = {"id": test_id_1, "name": "Agent One Version", "email": common_email, "phone": "12345", "captured_at": "2026-02-14T10:00:00Z", "status": "New"}
        supabase.table("leads").insert(lead_1).execute()
        
       
        print("   Inserting Lead 2 (duplicate)...")
        lead_2 = {"id": test_id_2, "name": "Agent Two Version", "email": common_email, "phone": "12345", "captured_at": "2026-02-14T11:00:00Z", "status": "New"}
        
        try:
            supabase.table("leads").insert(lead_2).execute()
            print("FAILURE: Database allowed a duplicate email/phone!")
            #
            supabase.table("leads").delete().eq("id", test_id_2).execute()
        except Exception as e:
            print("SUCCESS: First-Agent-Wins logic verified (Duplicate blocked).")
     
        res = supabase.table("leads").select("name").eq("email", common_email).limit(1).single().execute()
        if res.data['name'] == "Agent One Version":
            print("SUCCESS: Original data preserved.")
        else:
            print(f"FAILURE: Data mismatch. Expected 'Agent One Version', got '{res.data['name']}'")
        
        supabase.table("leads").delete().eq("email", common_email).execute()
    except Exception as e:
        print(f"ERROR: Test failed. Ensure UNIQUE(email) constraint exists in schema.sql. \nDetails: {e}")

   
    try:
        test_file = b"test audio content"
        supabase.storage.from_("audio-notes").upload("test_ping.txt", test_file, {"content-type": "text/plain"})
        print("SUCCESS: Storage write permissions verified.")
        supabase.storage.from_("audio-notes").remove(["test_ping.txt"])
    except Exception as e:
        print(f"ERROR: Could not upload to storage. Check bucket permissions! \nDetails: {e}")

if __name__ == "__main__":
    run_sanity_check()
