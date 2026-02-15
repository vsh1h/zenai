import React from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { Video, Calendar, Clock, User, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const Schedule = () => {
  const reminders = useLiveQuery(() => db.reminders_local.toArray()) || [];
  const leads = useLiveQuery(() => db.leads_local.toArray()) || [];

  const eligibleLeads = leads.filter(lead => 
    ['Follow Up', 'Engaged', 'Meeting', 'Outcome'].includes(lead.status)
  );

  const handleCreateMeet = async (lead) => {
    if (!lead.email) {
      alert("This lead does not have an email address for notifications.");
      return;
    }

    const meetId = crypto.randomUUID().substring(0, 8);
    const meetLink = `https://meet.google.com/new-${meetId}`; 
    const timestamp = new Date().toISOString();

    await db.reminders_local.add({
      lead_uuid: lead.client_uuid,
      title: `Follow-up: ${lead.name}`,
      timestamp,
      meet_link: meetLink,
      sync_status: 'pending'
    });

    await db.sync_queue.add({
      type: 'SEND_EMAIL_NOTIFICATION',
      data: {
        to: lead.email,
        subject: `Meeting Invitation: FinIdeas Follow-up`,
        body: `Hi ${lead.name}, a follow-up meeting has been scheduled. Join here: ${meetLink}`,
        meet_link: meetLink,
        scheduled_at: timestamp
      },
      status: 'pending',
      timestamp
    });

    alert(`Success: Meeting link generated and email queued for ${lead.name}.`);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Follow-up <span className="text-gradient">Schedule</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Meetings are enabled only after the initial Follow-up stage.</p>
      </header>

      <div className="responsive-grid grid-cols-2 grid-mobile-1">
   
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={20} color="var(--primary)" /> Scheduled Meetings
          </h3>
          <div className="leads-list">
            {reminders.length > 0 ? reminders.map(rem => (
              <div key={rem.id} style={{ padding: '1.2rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 700 }}>{rem.title}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={14} /> {format(new Date(rem.timestamp), 'MMM dd, HH:mm')}
                  </span>
                </div>
                <a href={rem.meet_link} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.6rem' }}>
                  <Video size={18} />
                </a>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-dim)' }}>No active meetings.</p>
              </div>
            )}
          </div>
        </div>

      
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={20} color="var(--accent)" /> Available for Meeting
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {eligibleLeads.length > 0 ? eligibleLeads.map(lead => (
              <div key={lead.client_uuid} className="card glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{lead.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>Status: {lead.status}</p>
                </div>
                <button 
                  onClick={() => handleCreateMeet(lead)}
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                  disabled={!lead.email}
                >
                  <Plus size={14} /> Schedule
                </button>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                <AlertCircle size={32} style={{ color: 'var(--text-dim)', marginBottom: '1rem', opacity: 0.5, margin: '0 auto' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  No leads in "Follow Up" or later stages yet. Move leads in your Pipeline to schedule meetings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;