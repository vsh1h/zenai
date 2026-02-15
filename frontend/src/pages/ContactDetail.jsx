import React, { useState } from 'react';
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
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000000";

const ContactDetail = ({ client_uuid, onBack }) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const lead = useLiveQuery(() => db.leads_local.where('client_uuid').equals(client_uuid).first());
  const interactions = useLiveQuery(() =>
    db.interactions_local.where('lead_uuid').equals(client_uuid).reverse().toArray()
  );

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    const timestamp = new Date().toISOString();
    try {
      await db.interactions_local.add({
        client_uuid: crypto.randomUUID(),
        lead_uuid: client_uuid,
        type: 'MANUAL_NOTE',
        note: noteText.trim(),
        timestamp,
        sync_status: 'pending'
      });

      // Also update the lead's timestamp to show it was recently interacted with
      await db.leads_local.where('client_uuid').equals(client_uuid).modify({
        timestamp
      });

      setNoteText('');
      setIsAddingNote(false);
      console.log("✅ Note added and queued for sync");
    } catch (err) {
      console.error("❌ Failed to add note:", err);
    }
  };
  const audioNotes = useLiveQuery(() =>
    db.media_local.where('client_uuid').equals(client_uuid).reverse().toArray()
  );

  if (!lead) return <div className="card glass">Loading Lead Intelligence...</div>;

  return (
    <div className="contact-detail-page animate-fade-in">
      <button onClick={onBack} className="btn btn-secondary back-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ChevronLeft size={18} /> Back to Pipeline
      </button>

      <div className="contact-detail-grid">

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card glass profile-card" style={{ textAlign: 'center' }}>
            <div className="profile-avatar" style={{
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
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span className={`badge badge-${lead.mode === 'stall' ? 'blue' : 'warning'}`}>{lead.mode.toUpperCase()}</span>
              <span className="badge badge-accent">{lead.status.toUpperCase()}</span>
              {lead.status === 'Follow-up' && lead.reminder_date && new Date(lead.reminder_date) < new Date() && (
                <span className="badge" style={{ background: 'var(--danger)', color: 'white', fontWeight: 800 }}>OVERDUE</span>
              )}
              {lead.meta_data && (lead.meta_data.is_hot || lead.meta_data.priority_score > 75) && (
                <span className="badge" style={{ background: '#f43f5e', color: 'white', fontWeight: 800 }}>🔥 HOT LEAD</span>
              )}
              <span className="badge" style={{ background: lead.owner_id === CURRENT_USER_ID ? 'var(--primary)' : 'var(--text-dim)', color: 'white', fontWeight: 800 }}>
                {lead.owner_id === CURRENT_USER_ID ? 'OWNER' : 'VIEWER'}
              </span>
            </div>

            {lead.meta_data && lead.meta_data.meeting_link && (
              <a
                href={lead.meta_data.meeting_link}
                target="_blank"
                rel="noreferrer"
                className={`btn btn-primary ${lead.owner_id !== CURRENT_USER_ID ? 'btn-disabled' : ''}`}
                style={{
                  width: '100%',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: lead.owner_id === CURRENT_USER_ID ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--glass-bg)',
                  border: 'none',
                  pointerEvents: lead.owner_id === CURRENT_USER_ID ? 'auto' : 'none',
                  opacity: lead.owner_id === CURRENT_USER_ID ? 1 : 0.5
                }}
              >
                Join Meeting
              </a>
            )}

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
              {lead.meta_data && lead.meta_data.priority_score && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Priority Score</span>
                  <span style={{ fontWeight: 800, color: lead.meta_data.priority_score > 75 ? '#f43f5e' : 'var(--primary)' }}>
                    {lead.meta_data.priority_score}/100
                  </span>
                </div>
              )}
              {lead.revenue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Closed Revenue</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>
                    {lead.revenue} L
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Owner Badge</span>
                <span style={{ fontWeight: 600 }}>{lead.owner_id === CURRENT_USER_ID ? 'You (Sales Team A)' : 'Other Agent'}</span>
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
          <div className="card glass timeline-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Interaction <span className="text-gradient">Timeline</span></h3>
              {!isAddingNote ? (
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  disabled={lead.owner_id !== CURRENT_USER_ID}
                  onClick={() => setIsAddingNote(true)}
                >
                  Add Note
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    onClick={() => { setIsAddingNote(false); setNoteText(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {isAddingNote && (
              <div className="card glass animate-fade-in" style={{ marginBottom: '2.5rem', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'var(--primary)' }}>
                <textarea
                  autoFocus
                  placeholder="Type your interaction note here..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    background: 'transparent',
                    border: 'none',
                    color: 'black',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    padding: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            <div className="timeline-section" style={{ position: 'relative' }}>
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
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
                      {lead.sync_status === 'pending' && (
                        <span className="badge" style={{ background: 'var(--warning)', color: 'white', fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>SYNC PENDING</span>
                      )}
                      <span className={`badge badge-${lead.mode === 'stall' ? 'blue' : 'warning'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                        {lead.mode}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {format(new Date(lead.timestamp), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="card glass" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{lead.notes || 'No description provided at capture.'}</p>
                </div>
              </div>

              {/* Interaction Logs */}
              {interactions && interactions.map((interaction, idx) => (
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
                      {interaction.type === 'STAGE_CHANGE' ? (
                        <ArrowRightLeft size={16} color="var(--secondary)" />
                      ) : interaction.type === 'MANUAL_NOTE' ? (
                        <MessageSquare size={16} color="var(--primary)" />
                      ) : (
                        <MessageSquare size={16} color="var(--accent)" />
                      )}
                      {interaction.type === 'STAGE_CHANGE' ? 'Pipeline Movement' :
                        interaction.type === 'MANUAL_NOTE' ? 'Manual Note' : 'Activity Log'}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{format(new Date(interaction.timestamp), 'HH:mm')}</span>
                  </div>
                  <div className="card glass" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{interaction.note}</p>
                  </div>
                </div>
              ))}


              {audioNotes && audioNotes.map((audio, idx) => (
                <div key={audio.id || idx} style={{ position: 'relative', marginBottom: '2.5rem' }}>
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{format(new Date(audio.timestamp), 'MMM dd, HH:mm')}</span>
                  </div>
                  <div className="card glass" style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <audio
                        className="custom-audio-player"
                        controls
                        src={URL.createObjectURL(audio.blob)}
                        style={{
                          width: '100%',
                          height: '35px',
                          borderRadius: '8px'
                        }}
                      />
                      {audio.meta_data && audio.meta_data.transcript ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(244, 63, 94, 0.1)', paddingTop: '0.5rem', fontStyle: 'italic' }}>
                          "{audio.meta_data.transcript.trim()}"
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(244, 63, 94, 0.1)', paddingTop: '0.5rem' }}>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>AI Transcribing intent... please wait</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .contact-detail-page {
          padding-bottom: 5rem;
        }

        .contact-detail-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
        }

        .back-btn {
          margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
          .contact-detail-grid {
            grid-template-columns: 1fr;
          }
          
          .profile-card {
            padding: 1.5rem !important;
          }

          .profile-avatar {
            width: 80px !important;
            height: 80px !important;
            font-size: 2rem !important;
          }

          .timeline-card {
            padding: 1.25rem !important;
          }

          .timeline-section {
            padding-left: 1.5rem !important;
          }
        }

        .text-gradient {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div >
  );
};

export default ContactDetail;
