from database import supabase
import json

def list_leads():
    print("Fetching all leads from Supabase...")
    try:
        response = supabase.table("leads").select("*").execute()
        leads = response.data
        if not leads:
            print("   (No leads found in database)")
        else:
            print(f"   Found {len(leads)} leads:")
            for lead in leads:
                print(f"   - [{lead.get('status')}] {lead.get('name')} ({lead.get('email') or 'No Email'})")
                print(f"     ID: {lead.get('id')}")
                print(f"     Captured: {lead.get('captured_at')}")
                print("---")
    except Exception as e:
        print(f"Error fetching leads: {e}")

if __name__ == "__main__":
    list_leads()
