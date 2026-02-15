import React, { useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  MoreHorizontal,
  MapPin,
  Calendar,
  User,
  Zap,
  Tag,
  ArrowRightLeft
} from 'lucide-react';
import { format } from 'date-fns';

const STAGES = ['Met', 'Follow-up', 'Engaged', 'Meeting', 'Outcome'];

const Pipeline = ({ onSelectLead }) => {
  const leads = useLiveQuery(() => db.leads_local.toArray()) || [];
  const [draggedLead, setDraggedLead] = useState(null);

  const moveLead = async (client_uuid, newStatus) => {
    const timestamp = new Date().toISOString();

    // Update local lead
    await db.leads_local.where('client_uuid').equals(client_uuid).modify({
      status: newStatus,
      timestamp
    });

    // Log interaction
    await db.interactions_local.add({
      client_uuid: crypto.randomUUID(),
      lead_uuid: client_uuid,
      type: 'STAGE_CHANGE',
      note: `Moved to ${newStatus}`,
      timestamp,
      sync_status: 'pending'
    });

    // Add to sync queue
    await db.sync_queue.add({
      type: 'UPDATE_LEAD_STATUS',
      table: 'leads_local',
      data: { client_uuid, status: newStatus, timestamp },
      timestamp,
      status: 'pending'
    });
  };

  const handleDragStart = (lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== stage) {
      if (stage === 'Follow-up' && !draggedLead.reminder_date) {
        alert("Action Required: Please set a Follow-up Date in the lead details before moving to this stage.");
        return;
      }
      moveLead(draggedLead.client_uuid, stage);
    }
    setDraggedLead(null);
  };

  const getLeadsInStage = (stage) => leads.filter(l => l.status === stage);

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Lead <span className="text-gradient">Pipeline</span></h1>
        <p style={{ color: 'var(--text-muted)' }}>Drag and drop cards across stages to update status.</p>
      </header>

      <div style={{
        display: 'flex',
        gap: '1.25rem',
        overflowX: 'auto',
        paddingBottom: '1.5rem',
        flex: 1,
        alignItems: 'stretch'
      }}>
        {STAGES.map(stage => (
          <div
            key={stage}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
            style={{
              minWidth: '320px',
              background: 'rgba(0, 0, 0, 0.01)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--border)',
              transition: 'background 0.3s ease'
            }}
          >
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.02)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                {stage}
                <span style={{ marginLeft: '1rem', background: 'var(--primary)', color: 'white', padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                  {getLeadsInStage(stage).length}
                </span>
              </h3>
              <MoreHorizontal size={18} color="var(--text-dim)" />
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {getLeadsInStage(stage).map(lead => (
                <div
                  key={lead.client_uuid}
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  className="card glass kanban-card"
                  onClick={() => onSelectLead && onSelectLead(lead.client_uuid)}
                  style={{
                    padding: '1.5rem',
                    cursor: 'grab',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{lead.name}</h4>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {lead.status === 'Follow-up' && lead.reminder_date && new Date(lead.reminder_date) < new Date() && (
                        <span className="badge" style={{ background: 'var(--danger)', color: 'white', fontSize: '0.7rem', fontWeight: 800 }}>OVERDUE</span>
                      )}
                      <span className={`badge badge-${lead.mode === 'stall' ? 'blue' : 'warning'}`} style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                        {lead.mode}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Tag size={14} color="var(--primary)" />
                      <span>{lead.intent}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      <Calendar size={14} />
                      <span>Updated {format(new Date(lead.timestamp), 'MMM dd')}</span>
                    </div>
                  </div>

                  {lead.notes && (
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {lead.notes}
                    </p>
                  )}

                  <div style={{ position: 'absolute', right: '1rem', bottom: '1rem', opacity: 0.3 }}>
                    <ArrowRightLeft size={16} />
                  </div>
                </div>
              ))}

              {getLeadsInStage(stage).length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--border)', borderRadius: '20px', opacity: 0.3 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Drop leads here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .kanban-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .text-gradient {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default Pipeline;
