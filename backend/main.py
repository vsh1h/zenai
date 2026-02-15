from fastapi import FastAPI, BackgroundTasks, File, UploadFile, Form, Header, HTTPException, Depends
from fastapi.concurrency import run_in_threadpool
import whisper
import json
import re
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import shutil
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
from models import SyncRequest
from database import supabase
from utils import process_leads_background


load_dotenv()

def get_current_user(x_user_id: str = Header(None)):
    if not x_user_id:
        return {"id": "00000000-0000-0000-0000-000000000000"}  # Default mock user
    return {"id": x_user_id}

app = FastAPI(title="Lead Management API", version="1.0.0")

model = whisper.load_model("base")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

async def extract_intent(transcript: str) -> dict:
    if not transcript.strip() or not groq_client:
        return {}
    
    try:
        print(f"🤖 [AI extraction] Processing transcript: {transcript[:50]}...")
        prompt = f"""Extract financial intent from this transcript:
- investment_type (e.g., PMS, Mutual Fund, Equity)
- ticket_size (e.g., 50 Lakhs, 1 Crore)
- urgency (High, Medium, Low)
- investor_type (HNI, Retail, Institutional)
- risk_profile (Aggressive, Conservative, Balanced)

Return a JSON object only. No preamble.
Transcript: {transcript}"""

        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192",
            temperature=0,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        print(f"   ✅ Extracted: {data}")
        return data
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return {}

def calculate_priority_score(data: dict) -> int:
    score = 0
    print(f"📊 [AI Score] Input Data: {data}")
    
    if data.get("urgency") in ["High", "Urgent", "Immediate"]:
        score += 30
    
    ticket_size_raw = str(data.get("ticket_size", "")).lower()
    # Handle formats: 50l, 50 lakhs, 1cr, 1 crore
    match = re.search(r"(\d+(?:\.\d+)?)\s*(l|lakh|cr|crore)", ticket_size_raw)
    if match:
        val = float(match.group(1))
        unit = match.group(2)
        if 'cr' in unit:
            score += 40 # High value
        elif val >= 50:
            score += 25
    
    if data.get("investor_type") in ["HNI", "Institutional", "Wealthy"]:
        score += 20
    if data.get("investment_type") in ["PMS", "AIF", "Equity"]:
        score += 15
        
    final_score = min(score, 100)
    print(f"   🎯 Final Score: {final_score}")
    return final_score


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
                
      
                valid_statuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Meeting', 'Won', 'Met', 'Follow-up', 'Engaged', 'Outcome']
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

@app.post("/process-audio")
async def process_audio(lead_id: str = Form(...), file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    file_path = os.path.join(upload_dir, f"{lead_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    result = await run_in_threadpool(model.transcribe, file_path)
    transcript = result.get("text", "")

    extracted_data = {}
    if transcript.strip():
        extracted_data = await extract_intent(transcript)

    priority_score = calculate_priority_score(extracted_data)

    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    with httpx.Client(timeout=30.0) as client:
        lead_res = client.get(f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead_id}", headers=headers)
        if lead_res.status_code == 200 and lead_res.json():
            current_lead = lead_res.json()[0]
            
            if current_lead.get("owner_id") and current_lead.get("owner_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="Not authorized to update this lead")
            
            current_meta = current_lead.get("meta_data", {}) or {}
            
            updated_meta = {**current_meta}
            for key, value in extracted_data.items():
                if key not in updated_meta or not updated_meta[key]:
                    updated_meta[key] = value
            
            if "priority_score" not in updated_meta or not updated_meta["priority_score"]:
                updated_meta["priority_score"] = priority_score
            
            if "is_hot" not in updated_meta:
                updated_meta["is_hot"] = priority_score >= 50

            if (priority_score > 75 or current_lead.get("status") == "Meeting") and "meeting_link" not in updated_meta:
                updated_meta["meeting_link"] = f"https://meet.jit.si/finideas-{lead_id}"
            
            client.patch(
                f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead_id}",
                headers=headers,
                json={"meta_data": updated_meta}
            )

    interaction = {
        "lead_id": lead_id,
        "type": "Note",
        "summary": f"Audio Transcribed: {transcript[:200]}...",
        "recording_url": file_path,
        "meta_data": {"transcript": transcript, "priority_score": priority_score}
    }
    
    with httpx.Client(timeout=30.0) as client:
        interaction_res = client.post(f"{SUPABASE_URL}/rest/v1/interactions", headers=headers, json=interaction)
        if interaction_res.status_code not in [200, 201]:
            print(f"⚠️ [Backend] Interaction log failed: {interaction_res.text}")
    
    return {
        "status": "uploaded",
        "file_path": file_path,
        "lead_id": lead_id,
        "transcript": transcript,
        "extracted_intent": extracted_data,
        "priority_score": priority_score,
        "meeting_link": f"https://meet.jit.si/finideas-{lead_id}" if priority_score > 75 else None
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
            
            overdue_res = client.get(f"{SUPABASE_URL}/rest/v1/leads?status=eq.Follow-up&reminder_date=lt.{datetime.now().isoformat()}&select=id", headers={**headers, "Prefer": "count=exact"})
            overdue_count = int(overdue_res.headers.get("Content-Range", "0/0").split("/")[1]) if overdue_res.status_code == 200 else 0

            return {
                "total_leads": total_leads,
                "hot_leads": hot_leads,
                "meetings_scheduled": meetings,
                "overdue_followups": overdue_count,
                "conversion_rate": f"{(hot_leads / total_leads * 100):.1f}%" if total_leads > 0 else "0%"
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/overdue-leads")
def get_overdue_leads():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    now = datetime.now().isoformat()
    URL = f"{SUPABASE_URL}/rest/v1/leads?status=eq.Follow-up&reminder_date=lt.{now}&select=*"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(URL, headers=headers)
            if response.status_code != 200:
                raise Exception(response.text)
            return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/conference-roi/{conference_id}")
def get_conference_roi(conference_id: str):
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    
    try:
        with httpx.Client(timeout=30.0) as client:
            conf_res = client.get(f"{SUPABASE_URL}/rest/v1/conferences?id=eq.{conference_id}&select=cost", headers=headers)
            if conf_res.status_code != 200 or not conf_res.json():
                return {"error": "Conference not found or cost not set"}
            cost = float(conf_res.json()[0]["cost"])

            leads_res = client.get(f"{SUPABASE_URL}/rest/v1/leads?conference_id=eq.{conference_id}&status=eq.Won&select=revenue", headers=headers)
            if leads_res.status_code != 200:
                raise Exception(leads_res.text)
            
            leads = leads_res.json()
            total_revenue = sum(float(lead.get("revenue") or 0) for lead in leads)
            
            roi = (total_revenue - cost) / cost if cost > 0 else 0
            
            return {
                "total_revenue": total_revenue,
                "cost": cost,
                "roi_percentage": f"{roi * 100:.1f}%"
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
            "Follow-up": [],
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
            meta_data = lead.get("meta_data", {}) or {}
            if status in pipeline:
                
                if status == "Meeting" or meta_data.get("priority_score", 0) > 75:
                    lead["meeting_link"] = meta_data.get("meeting_link") or generate_meeting_link(lead.get("name", "Lead"))
                    
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
