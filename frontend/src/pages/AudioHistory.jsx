import React from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { Mic, Clock, User, FileAudio, Trash2, Download, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const AudioHistory = () => {
    const [editingId, setEditingId] = React.useState(null);
    const [editName, setEditName] = React.useState("");

    const audioNotes = useLiveQuery(() =>
        db.media_local.orderBy('timestamp').reverse().toArray()
    );

    const leads = useLiveQuery(() => db.leads_local.toArray());

    const getLeadName = (uuid) => {
        const lead = leads?.find(l => l.client_uuid === uuid);
        return lead ? lead.name : "Quick Capture";
    };

    const handleRename = async (id) => {
        if (!editName.trim()) return;
        await db.media_local.update(id, { custom_title: editName.trim() });
        setEditingId(null);
        setEditName("");
    };

    if (!audioNotes) return <div className="card glass" style={{ padding: '2rem' }}>Loading Vault Intelligence...</div>;

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Recording <span className="text-gradient">Vault</span></h1>
                <p style={{ color: 'var(--text-muted)' }}>Securely store and review all voice intelligence captured in the field.</p>
            </header>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {audioNotes.length > 0 ? audioNotes.map((audio) => (
                    <div key={audio.id} className="card glass" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        padding: '1.25rem',
                        background: 'var(--bg-card)'
                    }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 8px 16px var(--primary-glow)'
                        }}>
                            <Mic size={24} />
                        </div>

                        <div style={{ flex: 1 }}>
                            {editingId === audio.id ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '1rem', height: 'auto' }}
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename(audio.id)}
                                        autoFocus
                                    />
                                    <button onClick={() => handleRename(audio.id)} className="btn btn-primary" style={{ padding: '0.4rem' }}>
                                        <Check size={16} />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '0.4rem' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {audio.custom_title || getLeadName(audio.client_uuid)}
                                    <button
                                        onClick={() => {
                                            setEditingId(audio.id);
                                            setEditName(audio.custom_title || getLeadName(audio.client_uuid));
                                        }}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px' }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </h4>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Clock size={12} /> {format(new Date(audio.timestamp), 'MMM dd, HH:mm')}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <User size={12} /> {audio.client_uuid.substring(0, 8)}
                                </span>
                            </div>
                        </div>

                        <div style={{ flex: 2, minWidth: '250px' }}>
                            <audio
                                className="custom-audio-player"
                                controls
                                src={URL.createObjectURL(audio.blob)}
                                style={{ width: '100%', height: '35px', borderRadius: '8px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    const url = URL.createObjectURL(audio.blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = audio.custom_title ? `${audio.custom_title}.webm` : audio.file_name;
                                    a.click();
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem', borderRadius: '10px' }}
                                title="Download"
                            >
                                <Download size={18} color="var(--primary)" />
                            </button>
                            <button
                                onClick={async () => {
                                    if (window.confirm("Delete this recording? This cannot be undone.")) {
                                        await db.media_local.delete(audio.id);
                                    }
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--danger)' }}
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="card glass" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                        <FileAudio size={64} style={{ marginBottom: '1.5rem', color: 'var(--text-dim)' }} />
                        <h3>No recordings found</h3>
                        <p>Audio notes you record during lead capture will appear here.</p>
                    </div>
                )}
            </div>

            <style>{`
        .text-gradient {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
        </div>
    );
};

export default AudioHistory;
