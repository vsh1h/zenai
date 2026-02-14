from rapidfuzz import fuzz
from typing import List, Dict
from database import supabase
import uuid
import urllib.parse

def normalize_phone(phone: str) -> str:
    """
    Basic phone normalization. 
    In a real app, use python-phonenumbers.
    """
    if not phone:
        return ""
    return "".join(filter(str.isdigit, phone))

def generate_meeting_link(lead_name: str) -> str:
    """Generates a unique, branded meeting room."""
    clean_name = "".join(filter(str.isalnum, lead_name))
    return f"https://meet.jit.si/FinSync_{clean_name}_{str(uuid.uuid4())[:6]}"

def calculate_lead_score(lead: dict) -> int:
    """Ranks leads based on contact info and context clues."""
    score = 0
    if lead.get("email"): score += 10
    if lead.get("phone"): score += 10
    
   
    notes = (lead.get("notes") or "").lower()
    high_intent = ["hni", "investment", "portfolio", "jito", "immediate"]
    if any(word in notes for word in high_intent):
        score += 30
    return score

import httpx
import os

def process_leads_background(new_leads: list[dict]):
    """
    Handles enrichment and scoring in a background threadpool.
    """
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    with httpx.Client(timeout=30.0) as client:
        for lead in new_leads:
            try:
                
                score = calculate_lead_score(lead)
                lead_name = lead.get("name") or "Unknown"
                print(f"[Background] Scoring {lead_name}: {score}")
                
                
                if score >= 40:
                    client.patch(
                        f"{SUPABASE_URL}/rest/v1/leads?id=eq.{lead['id']}",
                        headers=headers,
                        json={"status": "Qualified"}
                    )
                
                
                client.post(
                    f"{SUPABASE_URL}/rest/v1/interactions",
                    headers=headers,
                    json={
                        "lead_id": lead["id"],
                        "type": "Sync",
                        "summary": f"Lead initially captured with score: {score}"
                    }
                )
                
                print(f"[Background] Success for {lead_name}")
                
            except Exception as e:
                print(f"[Background] Error processing {lead.get('name') or 'unknown'}: {e}")

