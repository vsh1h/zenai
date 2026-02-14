import React from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  MoreVertical,
  Database,
  CloudOff,
  RefreshCw,
  Monitor,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';

import SyncStatusPanel from '../components/SyncStatusPanel';

const Dashboard = ({ onViewLead }) => {
  const leads = useLiveQuery(() => db.leads_local.toArray());
  const pendingSync = useLiveQuery(() => db.sync_queue.where('status').equals('pending').count());
  const recentLeads = useLiveQuery(() => 
    db.leads_local.orderBy('timestamp').reverse().limit(5).toArray()
  );

  const stats = [
    { label: 'Total Leads', value: leads?.length || 0, icon: Users, color: 'var(--primary)' },
    { label: 'Pending Sync', value: pendingSync || 0, icon: CloudOff, color: 'var(--warning)' },
    { label: 'Captured Today', value: leads?.filter(l => {
      const today = new Date().toDateString();
      return new Date(l.timestamp).toDateString() === today;
    }).length || 0, icon: TrendingUp, color: 'var(--accent)' },
    { label: 'Met Lead', value: leads?.filter(l => l.status === 'Met').length || 0, icon: CheckCircle2, color: 'var(--secondary)' },
  ];

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Zen <span className="text-gradient">Dashboard</span></h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time offline lead intelligence.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="card glass" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: pendingSync > 0 ? 'var(--warning)' : 'var(--accent)' }}>
            {pendingSync > 0 ? <CloudOff size={16} color="var(--warning)" /> : <Database size={16} color="var(--accent)" />}
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pendingSync > 0 ? `${pendingSync} Pending Sync` : 'System Synced'}</span>
          </div>
        </div>
      </header>

     
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card glass" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  background: `rgba(${stat.color === 'var(--primary)' ? '37, 99, 235' : stat.color === 'var(--warning)' ? '217, 119, 6' : stat.color === 'var(--accent)' ? '5, 150, 105' : '79, 70, 229'}, 0.1)`,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: stat.color
                }}>
                  <Icon size={24} />
                </div>
                <MoreVertical size={20} color="var(--text-dim)" />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500, position: 'relative', zIndex: 1 }}>{stat.label}</p>
              <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', fontWeight: 700, position: 'relative', zIndex: 1 }}>{stat.value}</h2>
              <div style={{ position: 'absolute', right: '-10%', bottom: '-10%', opacity: 0.05 }}>
                <Icon size={120} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '2rem' }}>
        {/* Recent Activity */}
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Interactions</h3>
            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>View Pipeline <ArrowRight size={14} /></button>
          </div>
          
          <div className="leads-list">
            {recentLeads?.length > 0 ? recentLeads.map((lead) => (
              <div key={lead.client_uuid} 
                onClick={() => onViewLead && onViewLead(lead.client_uuid)}
                style={{ 
                padding: '1.2rem 0', 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                  <div style={{ 
                    width: '45px', 
                    height: '45px', 
                    borderRadius: '12px', 
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: 'white',
                    fontSize: '1rem'
                  }}>
                    {lead.name[0]}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '1.05rem' }}>{lead.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lead.phone} • <span style={{ color: 'var(--text-dim)' }}>{lead.intent}</span></p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge badge-${lead.mode === 'stall' ? 'blue' : 'warning'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                    {lead.mode}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                    {format(new Date(lead.timestamp), 'MMM dd, HH:mm')}
                  </p>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <CloudOff size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-dim)' }}>No local leads captured yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sync Status / Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SyncStatusPanel />

          <div className="card glass">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', fontWeight: 600 }}>Quick Mode</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card glass hover-effect" style={{ padding: '1.2rem', textAlign: 'center', cursor: 'pointer', borderColor: 'var(--border)' }}>
                <Monitor size={32} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block' }}>Stall</span>
              </div>
              <div className="card glass hover-effect" style={{ padding: '1.2rem', textAlign: 'center', cursor: 'pointer', borderColor: 'var(--border)' }}>
                <Smartphone size={32} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block' }}>Field</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .hover-effect:hover {
          border-color: var(--primary) !important;
          background: rgba(59, 130, 246, 0.05) !important;
          transform: translateY(-2px);
          transition: all 0.2s ease;
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

export default Dashboard;
