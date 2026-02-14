from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from models import SyncRequest
from database import supabase
from utils import process_leads_background


load_dotenv()

app = FastAPI(title="Lead Management API", version="1.0.0")


origins = ["*"]  

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from zoneinfo import ZoneInfo
from datetime import datetime

def to_ist(utc_str: str) -> str:
    """Converts a UTC ISO string to an IST string."""
    if not utc_str: return utc_str
    try:
        # Supabase returns strings like 2024-02-14T12:00:00+00:00
        dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        ist_dt = dt.astimezone(ZoneInfo("Asia/Kolkata"))
        return ist_dt.strftime("%Y-%m-%d %H:%M:%S IST")
    except:
        return utc_str

@app.get("/")
def root():
    return {"message": "Lead Management API is running"}

@app.get("/health")
def health_check():
    """
    Health check endpoint for the dashboard to verify DB connection.
    """
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    URL = f"{SUPABASE_URL}/rest/v1/leads?select=id&limit=1"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(URL, headers=headers)
            if response.status_code == 200:
                return {"status": "ok", "db": "connected"}
            return {"status": "error", "db": "disconnected", "details": response.text}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "details": str(e)}

import httpx

@app.post("/sync")
def sync_leads(request: SyncRequest, background_tasks: BackgroundTasks):
    """
    Receives a batch of leads and performs a First-Come-First-Served insert.
    """
    print(f"🚀 [Sync Request] Received {len(request.leads)} leads.")
    
    
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    REST_URL = f"{SUPABASE_URL}/rest/v1/leads"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    new_leads = []
    skipped = 0

    with httpx.Client(timeout=30.0) as client:
        for lead in request.leads:
            try:
                print(f"📥 [Sync] Processing: {lead.name} (ID: {lead.id})")
                lead_dump = lead.model_dump(mode='json', exclude_none=True)
                
      
                valid_statuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Meeting', 'Won']
                original_status = lead_dump.get("status", "New")
                if original_status not in valid_statuses:
                    lead_dump["status"] = "New"
                
                meta = lead_dump.get("meta_data", {})
                meta["original_status"] = original_status
                for field in ["location", "intent", "social_media"]:
                    if value := lead_dump.pop(field, None):
                        meta[field] = value
                
                lead_dump["meta_data"] = meta
                
                print(f"   📡 Sending to PostgREST...")
                response = client.post(REST_URL, headers=headers, json=lead_dump)
                print(f"   📡 Result: {response.status_code}")
                
                if response.status_code in [201, 200]:
                    data = response.json()
                    if data:
                        saved_lead = {"id": data[0]["id"], "name": data[0]["name"]}
                        new_leads.append(saved_lead)
                        print(f"Saved Successfully: {lead.name}")
                    else:
                        print(f"Success but No Data Returned for {lead.name}")
                elif response.status_code == 409:
                    print(f"Duplicate Conflict (409): {lead.name}. Details: {response.text}")
                    skipped += 1
                else:
                    print(f"DB REJECTED ({response.status_code}): {response.text}")
                    skipped += 1
                    
            except Exception as e:
                print(f"Fatal Exception for {lead.name}: {str(e)}")
                skipped += 1

    if new_leads:
        background_tasks.add_task(process_leads_background, new_leads)
            
    return {
        "status": "success", 
        "new_records": len(new_leads), 
        "ignored_duplicates": skipped
    }

@app.get("/stats")
def get_stats():
    """
    Returns total leads and key metrics using direct REST calls.
    """
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    
    try:
        with httpx.Client(timeout=20.0) as client:
            
            total_res = client.get(f"{SUPABASE_URL}/rest/v1/leads?select=id", headers={**headers, "Prefer": "count=exact"})
            total_leads = int(total_res.headers.get("Content-Range", "0/0").split("/")[1]) if total_res.status_code == 200 else 0
          
            hot_res = client.get(f"{SUPABASE_URL}/rest/v1/leads?status=in.(Qualified,Won)&select=id", headers={**headers, "Prefer": "count=exact"})
            hot_leads = int(hot_res.headers.get("Content-Range", "0/0").split("/")[1]) if hot_res.status_code == 200 else 0
            
            meet_res = client.get(f"{SUPABASE_URL}/rest/v1/leads?status=eq.Meeting&select=id", headers={**headers, "Prefer": "count=exact"})
            meetings = int(meet_res.headers.get("Content-Range", "0/0").split("/")[1]) if meet_res.status_code == 200 else 0
            
            return {
                "total_leads": total_leads,
                "hot_leads": hot_leads,
                "meetings_scheduled": meetings,
                "conversion_rate": f"{(hot_leads / total_leads * 100):.1f}%" if total_leads > 0 else "0%"
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/pipeline")
def get_pipeline():
    """
    Returns leads grouped by their status.
    """
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    URL = f"{SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(URL, headers=headers)
            if response.status_code != 200:
                raise Exception(response.text)
            leads = response.json()
        
      
        pipeline = {
            "New": [],
            "Contacted": [],
            "Qualified": [],
            "Meeting": [],
            "Won": [],
            "Lost": []
        }
        
        from utils import generate_meeting_link
        
        for lead in leads:
           
            lead["captured_at"] = to_ist(lead.get("captured_at"))
            lead["created_at"] = to_ist(lead.get("created_at"))
            
            status = lead.get("status", "New")
            if status in pipeline:
               
                if status == "Meeting":
                    lead["meeting_link"] = generate_meeting_link(lead.get("name", "Lead"))
                    
                pipeline[status].append(lead)
            else:
                
                if "Other" not in pipeline:
                     pipeline["Other"] = []
                pipeline["Other"].append(lead)
                
        return pipeline
    except Exception as e:
        return {"error": str(e)}
@app.get("/leads")
def get_leads():
    """
    Returns a clean, sorted list of all leads in IST.
    """
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    URL = f"{SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(URL, headers=headers)
            if response.status_code == 200:
                leads = response.json()
                for lead in leads:
                    lead["captured_at"] = to_ist(lead.get("captured_at"))
                    lead["created_at"] = to_ist(lead.get("created_at"))
                return leads
            return {"error": response.text}
    except Exception as e:
        return {"error": str(e)}
