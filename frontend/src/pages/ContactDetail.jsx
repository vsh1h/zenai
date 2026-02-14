import React from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Mic, 
  Share2,
  ChevronLeft,
  Calendar,
  Tag,
  Zap,
  ArrowRightLeft
} from 'lucide-react';
import { format } from 'date-fns';

const ContactDetail = ({ client_uuid, onBack }) => {
  const lead = useLiveQuery(() => db.leads_local.where('client_uuid').equals(client_uuid).first());
  const interactions = useLiveQuery(() => 
    db.interactions_local.where('lead_uuid').equals(client_uuid).reverse().toArray()
  );

  if (!lead) return <div className="card glass">Loading Lead Intelligence...</div>;

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ChevronLeft size={18} /> Back to Pipeline
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Column: Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card glass" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '25px', 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)'
            }}>
              {lead.name[0]}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>{lead.name}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span className={`badge badge-${lead.mode === 'stall' ? 'blue' : 'warning'}`}>{lead.mode.toUpperCase()}</span>
              <span className="badge badge-accent">{lead.status.toUpperCase()}</span>
            </div>
            
            <div style={{ textAlign: 'left', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <Phone size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.9rem' }}>{lead.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <Mail size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.9rem' }}>{lead.email || 'No email provided'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <MapPin size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.9rem' }}>{lead.location || 'Stall Location'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <Tag size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.9rem' }}>{lead.intent}</span>
              </div>
            </div>
          </div>

          <div className="card glass">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>Lead Intelligence</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Source Badge</span>
                <span style={{ fontWeight: 600 }}>{lead.source}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Owner Badge</span>
                <span style={{ fontWeight: 600 }}>Sales Team A</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Recorded On</span>
                <span style={{ fontWeight: 600 }}>{format(new Date(lead.timestamp), 'MMM dd, HH:mm')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card glass" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Interaction <span className="text-gradient">Timeline</span></h3>
              <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Add Note</button>
            </div>

            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
              {/* Timeline Line */}
              <div style={{ 
                position: 'absolute', 
                left: '7px', 
                top: '0', 
                bottom: '0', 
                width: '2px', 
                background: 'linear-gradient(to bottom, var(--primary), var(--border))' 
              }}></div>

             
              <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-26px', 
                  top: '0', 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: 'var(--primary)',
                  border: '4px solid var(--bg-dark)'
                }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={16} color="var(--primary)" fill="var(--primary)" /> 
                    Lead Captured (Met)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{format(new Date(lead.timestamp), 'HH:mm')}</span>
                </div>
                <div className="card glass" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{lead.notes || 'No description provided at capture.'}</p>
                </div>
              </div>

              {/* Interaction Logs */}
              {interactions.map((interaction, idx) => (
                <div key={interaction.id || idx} style={{ position: 'relative', marginBottom: '2.5rem' }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: '-26px', 
                    top: '0', 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    background: interaction.type === 'STAGE_CHANGE' ? 'var(--secondary)' : 'var(--accent)',
                    border: '4px solid var(--bg-dark)'
                  }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {interaction.type === 'STAGE_CHANGE' ? <ArrowRightLeft size={16} color="var(--secondary)" /> : <MessageSquare size={16} color="var(--accent)" />}
                      {interaction.type === 'STAGE_CHANGE' ? 'Pipeline Movement' : 'Activity Log'}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{format(new Date(interaction.timestamp), 'HH:mm')}</span>
                  </div>
                  <div className="card glass" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{interaction.note}</p>
                  </div>
                </div>
              ))}
              
             
              <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-26px', 
                  top: '0', 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: '#f43f5e',
                  border: '4px solid var(--bg-dark)'
                }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mic size={16} color="#f43f5e" /> Audio Note Recorded
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Just now</span>
                </div>
                <div className="card glass" style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <button className="btn btn-primary" style={{ padding: '0.5rem', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid white', marginLeft: '2px' }}></div>
                     </button>
                     <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: '#f43f5e', borderRadius: '2px' }}></div>
                     </div>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>0:12 / 0:30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .text-gradient {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default ContactDetail;
