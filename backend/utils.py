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

def calculate_wealth_metrics(lead_data: dict):
    # 1. AUA Prediction: Converting ticket sizes to numeric values
    ticket_map = {
        "< 10L": 500000, 
        "10L - 50L": 3000000, 
        "50L - 1Cr": 7500000, 
        "> 1Cr": 15000000
    }
    predicted_aua = ticket_map.get(lead_data.get("ticket_size"), 0)

    # 2. Investor Readiness Score (0-100)
    # Weighted logic: Intent (30%), Engagement (40%), Profile Completion (30%)
    intent_weight = 30 if lead_data.get("intent") == "High" else 15
    engagement_weight = int(lead_data.get("engagement_score", 1)) * 8  # Max 40
    profile_weight = 30 if lead_data.get("email") and lead_data.get("phone") else 10
    
    readiness_score = intent_weight + engagement_weight + profile_weight

    return {
        "predicted_aua": predicted_aua,
        "readiness_score": min(readiness_score, 100)
    }

