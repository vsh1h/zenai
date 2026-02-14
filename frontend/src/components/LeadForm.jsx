import React, { useState } from 'react';
import { db } from "../db/db";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Mic,
  Camera,
  Save,
  AlertCircle,
  Tag,
  Zap,
  Smartphone,
  Monitor,
  CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const LeadForm = ({ onComplete }) => {
  const [mode, setMode] = useState('stall'); // stall or field
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    notes: '',
    intent: 'Interested',
  });

  const quickTags = ['Hot Lead', 'Interested', 'Follow Up', 'General Inquiry', 'Service Check'];

  const clearForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      notes: '',
      intent: 'Interested',
    });
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setFormData({
        ...formData,
        name: 'John Smith',
        email: 'john.smith@scanned.com',
        phone: '+91 98765 43210',
        notes: 'Captured via business card scan.'
      });
      setIsScanning(false);
    }, 1500);
  };

  const handleSimulateRecord = () => {
    setIsRecording(true);
    setTimeout(() => setIsRecording(false), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const client_uuid = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const newLead = {
        client_uuid,
        ...formData,
        source: mode,
        mode,
        status: 'Met',
        sync_status: 'pending',
        timestamp,
      };

      // 1. Save to leads_local
      await db.leads_local.add(newLead);

      // 2. Add to sync_queue
      await db.sync_queue.add({
        type: 'CREATE_LEAD',
        table: 'leads_local',
        data: newLead,
        timestamp,
        status: 'pending'
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#6366f1', '#10b981']
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      if (onComplete) onComplete(client_uuid);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        location: '',
        notes: '',
        intent: 'Interested',
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>

      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 800 }}>
          Lead <span className="text-gradient">Capture</span>
        </h2>
        <div style={{
          display: 'inline-flex',
          background: 'rgba(0,0,0,0.03)',
          padding: '0.5rem',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          gap: '0.5rem'
        }}>
          <button
            className={`btn ${mode === 'stall' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.8rem 2.5rem', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => { setMode('stall'); clearForm(); }}
          >
            <Monitor size={18} /> Stall Mode
          </button>
          <button
            className={`btn ${mode === 'field' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.8rem 2.5rem', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => { setMode('field'); clearForm(); }}
          >
            <Smartphone size={18} /> Field Mode
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mode === 'stall' ? '1fr' : '1fr', gap: '2rem' }}>
        <form onSubmit={handleSubmit} className="card glass" style={{ padding: mode === 'stall' ? '3rem' : '2rem', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>

          {(isScanning || isRecording) && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 12, 16, 0.8)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)'
            }}>
              <div className="pulse-circle" style={{ width: '80px', height: '80px', background: isRecording ? 'var(--danger)' : 'var(--primary)', borderRadius: '50%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isRecording ? <Mic size={32} color="white" /> : <Camera size={32} color="white" />}
              </div>
              <h3 style={{ fontWeight: 700 }}>{isRecording ? 'Recording Voice Memo...' : 'Scanning Business Card...'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Processing AI intelligence</p>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: mode === 'stall' ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="label">Prospect Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '45px', height: '55px' }}
                  placeholder="Ex: Rajesh Kumar"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '45px', height: '55px' }}
                  placeholder="+91 XXXXX XXXXX"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="label">Email Address (Optional)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                className="input"
                style={{ paddingLeft: '45px', height: '55px' }}
                placeholder="rajesh@example.com"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {mode === 'field' && (
            <div className="input-group animate-fade-in" style={{ marginTop: '1.5rem' }}>
              <label className="label">Current Location (AI Detected)</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '45px', height: '55px' }}
                  placeholder="Detecting geolocation..."
                  value={formData.location || 'Bandra Kurla Complex, Mumbai'}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="label">Interaction Summary</label>
            <textarea
              className="input"
              style={{ minHeight: mode === 'stall' ? '100px' : '150px', resize: 'vertical', padding: '1rem' }}
              placeholder="Key takeaways from the conversation..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="label">Lead Intent</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {quickTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFormData({ ...formData, intent: tag })}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '30px',
                    border: '1px solid var(--border)',
                    background: formData.intent === tag ? 'var(--primary)' : 'var(--glass-bg)',
                    color: formData.intent === tag ? 'white' : 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: formData.intent === tag ? 700 : 500
                  }}
                >
                  {formData.intent === tag && <Tag size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {mode === 'field' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={handleSimulateRecord} type="button" className="btn btn-secondary" style={{ height: '80px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                <Mic size={24} color="var(--danger)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Big Record Audio</span>
              </button>
              <button onClick={handleSimulateScan} type="button" className="btn btn-secondary" style={{ height: '80px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                <Camera size={24} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Scan Card</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '1.3rem',
              marginTop: '2.5rem',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 15px 30px rgba(59, 130, 246, 0.3)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
            }}
            disabled={loading}
          >
            {loading ? 'Committing to local DB...' : (
              <>
                <Zap size={22} fill="currentColor" />
                Save Instantly (Offline First)
              </>
            )}
          </button>
        </form>
      </div>

      {/* Offline Toast */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '1.2rem 2.5rem',
          borderRadius: '50px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <CheckCircle size={24} />
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Saved Offline Sync Pending</div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { transform: translateX(-50%) translateY(100px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(10, 12, 16, 0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(10, 12, 16, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(10, 12, 16, 0); }
        }
        .pulse-circle {
          animation: pulse 2s infinite;
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

export default LeadForm;
