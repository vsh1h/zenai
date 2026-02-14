import asyncio
from database import supabase
from utils import generate_meeting_link, calculate_lead_score, process_leads_background
import uuid

async def seed_data():
    print("Seeding database with a test lead...")

   
    lead_id = str(uuid.uuid4())
    lead_data = {
        "id": lead_id,
        "name": "Elon Musk",
        "email": "elon@tesla.com",
        "phone": "1234567890",
        "company": "Tesla",
        "role": "CEO",
        "notes": "Interested in immediate HNI investment for Mars colony portfolio.",
        "status": "New",
        "meta_data": {
            "source": "Manual Seed",
            "audio_url": "https://example.com/recording.mp3" 
        }
    }

    print(f"   Payload: {lead_data['name']} ({lead_data['email']})")

    try:
        
        response = supabase.table("leads").insert(lead_data).execute()
        if response.data:
            print("Lead inserted successfully!")
            
           
            print("   Triggering Intelligence Engine...")
            await process_leads_background([lead_data])
            print("Intelligence processing complete (Scoring & AI Log).")
            
        else:
            print("Failed to insert lead (No data returned).")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(seed_data())
