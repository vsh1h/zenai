import React, { useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  MoreHorizontal,
  Calendar,
  Zap,
  Tag,
  ArrowRightLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const STAGES = ['Met Up', 'Follow Up', 'Engaged', 'Meeting', 'Outcome'];

const LeadCardContent = ({ lead, showActions, moveLead }) => (
  <>
    <div className="card-header-flex">
      <h4 className="lead-name">{lead.name}</h4>
      <div className="badge-row">
        {lead.status === 'Follow-up' && lead.reminder_date && new Date(lead.reminder_date) < new Date() && (
          <span className="badge danger">OVERDUE</span>
        )}
        <span className={`badge mode-${lead.mode}`}>{lead.mode}</span>
      </div>
    </div>

    <div className="meta-info">
      <div className="meta-item">
        <Tag size={14} className="primary-text" />
        <span>{lead.intent}</span>
      </div>
      <div className="meta-item">
        <Calendar size={14} />
        <span>Updated {format(new Date(lead.timestamp), 'MMM dd')}</span>
      </div>
    </div>

    {lead.notes && <p className="lead-notes-preview">{lead.notes}</p>}

    {showActions && (
      <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
        <select
          value={lead.status}
          onChange={(e) => moveLead(lead.client_uuid, e.target.value)}
          className="stage-selector"
        >
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="view-link">Details <ArrowRightLeft size={14} /></button>
      </div>
    )}

    {!showActions && (
      <div className="drag-handle">
        <ArrowRightLeft size={16} />
      </div>
    )}
  </>
);

const Pipeline = ({ onSelectLead }) => {
  const leads = useLiveQuery(() => db.leads_local.toArray()) || [];
  const [draggedLead, setDraggedLead] = useState(null);
  const [activeStage, setActiveStage] = useState(STAGES[0]);

  const moveLead = async (client_uuid, newStatus) => {
    const timestamp = new Date().toISOString();
    await db.leads_local.where('client_uuid').equals(client_uuid).modify({
      status: newStatus,
      timestamp
    });
    await db.interactions_local.add({
      client_uuid: crypto.randomUUID(),
      lead_uuid: client_uuid,
      type: 'STAGE_CHANGE',
      note: `Moved to ${newStatus}`,
      timestamp,
      sync_status: 'pending'
    });
    await db.sync_queue.add({
      type: 'UPDATE_LEAD_STATUS',
      table: 'leads_local',
      data: { client_uuid, status: newStatus, timestamp },
      timestamp, status: 'pending'
    });
  };

  const handleDragStart = (lead) => setDraggedLead(lead);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== stage) {
      moveLead(draggedLead.client_uuid, stage);
    }
    setDraggedLead(null);
  };

  const getLeadsInStage = (stage) => leads.filter(l => l.status === stage);

  return (
    <div className="pipeline-container animate-fade-in">
      <header className="page-header">
        <h1 className="title">Lead <span className="text-gradient">Pipeline</span></h1>
        <p className="subtitle">Keep your sales flow moving</p>
      </header>


      <div className="stage-tabs mobile-only">
        {STAGES.map(stage => (
          <button
            key={stage}
            className={activeStage === stage ? 'active' : ''}
            onClick={() => setActiveStage(stage)}
          >
            {stage} <span>{getLeadsInStage(stage).length}</span>
          </button>
        ))}
      </div>


      <div className="kanban-wrapper desktop-only">
        {STAGES.map(stage => (
          <div
            key={stage}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="kanban-header">
              <h3>{stage} <span className="count">{getLeadsInStage(stage).length}</span></h3>
              <MoreHorizontal size={18} color="var(--text-dim)" />
            </div>
            <div className="kanban-cards">
              {getLeadsInStage(stage).map(lead => (
                <div
                  key={lead.client_uuid}
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  className="card glass kanban-card"
                  onClick={() => onSelectLead?.(lead.client_uuid)}
                >
                  <LeadCardContent lead={lead} />
                </div>
              ))}
              {getLeadsInStage(stage).length === 0 && <div className="empty-slot">Drop here</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Single Stage View */}
      <div className="mobile-only mobile-stage-view">
        <div className="mobile-cards">
          {getLeadsInStage(activeStage).map(lead => (
            <div
              key={lead.client_uuid}
              className="card glass mobile-lead-card"
              onClick={() => onSelectLead?.(lead.client_uuid)}
            >
              <LeadCardContent lead={lead} showActions={true} moveLead={moveLead} />
            </div>
          ))}
          {getLeadsInStage(activeStage).length === 0 && (
            <div className="empty-state">
              <Zap size={40} className="empty-icon" />
              <p>No leads in {activeStage}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.7; }
        }

        .pipeline-container {
          height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
        }

        .page-header { margin-bottom: 2rem; }
        .title { font-size: 2.4rem; font-weight: 800; }
        .subtitle { color: var(--text-muted); font-size: 1rem; }

        .kanban-wrapper {
          display: flex;
          gap: 1.25rem;
          overflow-x: auto;
          padding-bottom: 1.5rem;
          flex: 1;
          align-items: stretch;
        }

        .kanban-column {
          min-width: 320px;
          background: rgba(0, 0, 0, 0.01);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
        }

        .kanban-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 20px 20px 0 0;
        }

        .kanban-header h3 {
          font-size: 0.9rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .count {
          margin-left: 0.8rem;
          background: var(--primary);
          color: white;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.75rem;
        }

        .kanban-cards {
          padding: 1.25rem;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .kanban-card {
          padding: 1.5rem !important;
          cursor: grab;
          position: relative;
          border-color: rgba(255, 255, 255, 0.05) !important;
        }

        .kanban-card:hover { border-color: var(--primary) !important; }

        .card-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .lead-name { font-weight: 700; font-size: 1.1rem; }

        .badge-row { display: flex; gap: 0.4rem; align-items: center; }

        .badge {
          padding: 0.15rem 0.5rem;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .badge.danger { background: var(--danger); color: white; }
        .badge.mode-stall { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .badge.mode-field { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

        .meta-info { display: flex; flex-direction: column; gap: 0.5rem; }
        .meta-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: var(--text-muted); }
        .primary-text { color: var(--primary); }

        .lead-notes-preview {
          margin-top: 1rem;
          font-size: 0.8rem;
          color: var(--text-dim);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .drag-handle { position: absolute; right: 1rem; bottom: 1rem; opacity: 0.2; }

        .empty-slot {
          text-align: center;
          padding: 3rem;
          border: 2px dashed var(--border);
          border-radius: 20px;
          opacity: 0.3;
          font-weight: 600;
        }

        /* Mobile Styles */
        .mobile-only { display: none; }

        @media (max-width: 1024px) {
          .desktop-only { display: none; }
          .mobile-only { display: flex; }
          
          .pipeline-container { height: auto; padding-bottom: 100px; }

          .stage-tabs {
            overflow-x: auto;
            gap: 0.5rem;
            padding: 0.5rem 0;
            margin-bottom: 1.5rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .stage-tabs::-webkit-scrollbar { display: none; }

          .stage-tabs button {
            padding: 0.75rem 1.25rem;
            background: white;
            border: 1px solid var(--border);
            border-radius: 50px;
            font-weight: 700;
            font-size: 0.85rem;
            white-space: nowrap;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 0.6rem;
          }

          .stage-tabs button.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
            box-shadow: 0 4px 12px var(--primary-glow);
          }

          .stage-tabs button span {
            background: rgba(0, 0, 0, 0.05);
            padding: 0.1rem 0.5rem;
            border-radius: 10px;
            font-size: 0.7rem;
          }

          .stage-tabs button.active span { background: rgba(255, 255, 255, 0.2); }

          .mobile-cards { display: flex; flex-direction: column; gap: 1rem; }

          .mobile-lead-card { padding: 1.25rem !important; }

          .card-actions-row {
            margin-top: 1.25rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 0.75rem;
            align-items: center;
          }

          .stage-selector {
            flex: 1;
            padding: 0.6rem;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: var(--bg-dark);
            font-size: 0.85rem;
            font-weight: 600;
          }

          .view-link {
            color: var(--primary);
            font-weight: 700;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            background: none;
            border: none;
          }

          .empty-state {
            padding: 4rem 2rem;
            text-align: center;
            color: var(--text-dim);
          }

          .empty-icon { opacity: 0.3; margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default Pipeline;
