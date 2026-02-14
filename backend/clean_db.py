from database import supabase

def clean_db():
    print("🧹 Cleaning Database...")
    try:
   
        response = supabase.table("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Database Cleared. Rows removed: {len(response.data)}")
    except Exception as e:
        print(f"Error cleaning database: {e}")

if __name__ == "__main__":
    clean_db()
