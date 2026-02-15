from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class LeadBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    intent: Optional[str] = None
    status: Optional[str] = "New"
    reminder_date: Optional[datetime] = None
    owner_id: Optional[uuid.UUID] = None
    revenue: Optional[float] = 0.0
    conference_id: Optional[uuid.UUID] = None
    captured_at: Optional[datetime] = None
    social_media: Optional[Dict[str, str]] = Field(default_factory=dict)
    meta_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

class LeadCreate(LeadBase):
    id: Optional[uuid.UUID] = None 

class Lead(LeadBase):
    id: Optional[uuid.UUID] = None  
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InteractionBase(BaseModel):
    lead_id: Optional[uuid.UUID]
    type: str
    summary: Optional[str] = None
    date: Optional[datetime] = None
    recording_url: Optional[str] = None

class InteractionCreate(InteractionBase):
    pass

class Interaction(InteractionBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class SyncRequest(BaseModel):
    leads: List[LeadCreate]
