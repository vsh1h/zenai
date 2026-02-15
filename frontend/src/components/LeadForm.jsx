import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
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
  CheckCircle,
  DollarSign,
  Calendar,
  Briefcase,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000000";

const LeadForm = ({ onComplete }) => {
  const [mode, setMode] = useState('stall'); // stall or field
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    notes: '',
    intent: 'Interested',
    reminder_date: '',
    revenue: 0,
    conference_id: '',
    company: '',
    role: ''
  });
  const [currentClientId, setCurrentClientId] = useState(crypto.randomUUID());
  const [audioRecorded, setAudioRecorded] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const quickTags = ['Hot Lead', 'Interested', 'Follow-up', 'Follow Up', 'General Inquiry', 'Service Check'];

  const clearForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      notes: '',
      intent: 'Interested',
      reminder_date: '',
      revenue: 0,
      conference_id: '',
      company: '',
      role: ''
    });
    setCurrentClientId(crypto.randomUUID());
    setAudioRecorded(false);
  };

  const handleScanCard = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      // Improved recognition with progress logging
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`🤖 [OCR Progress]: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      if (!text || text.trim().length < 5) {
        throw new Error("EMPTY_TEXT");
      }

      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
      const phoneRegex = /(\+?\d[\d\s-]{8,}\d)/;

      const emailMatch = text.match(emailRegex);
      const phoneMatch = text.match(phoneRegex);

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
      console.log("📄 [OCR Raw Text]:", text);

      let name = '';
      let company = '';
      let role = '';

      // Improved heuristics: Case insensitive and better title matching
      const nameCandidate = lines.find(l =>
        l.split(' ').length >= 1 &&
        l.split(' ').length <= 4 &&
        !l.includes('@') &&
        !l.match(/\d/) &&
        !/company|limited|private|ltd|solutions/i.test(l)
      );

      if (nameCandidate) name = nameCandidate.replace(/[^a-zA-Z\s]/g, '');

      const titles = ['manager', 'director', 'ceo', 'vp', 'founder', 'president', 'engineer', 'lead', 'head', 'sales', 'representative'];
      const roleCandidate = lines.find(l =>
        titles.some(t => l.toLowerCase().includes(t))
      );
      if (roleCandidate) role = roleCandidate;

      const companyCandidate = lines.find(l =>
        (l.toLowerCase().match(/ltd|inc|corp|limited|solution|private|group|enterprise/i) && !l.includes('@')) ||
        (l !== nameCandidate && l !== roleCandidate && !l.includes('@') && !l.match(phoneRegex) && l.length > 3)
      );
      if (companyCandidate) company = companyCandidate;

      const foundAny = name || company || role || emailMatch || phoneMatch;

      if (!foundAny) {
        setError("AI read the text, but couldn't identify specific fields. Try a clearer angle.");
      } else {
        setFormData(prev => ({
          ...prev,
          name: name || prev.name,
          email: emailMatch ? emailMatch[1] : prev.email,
          phone: phoneMatch ? phoneMatch[1] : prev.phone,
          company: company || prev.company,
          role: role || prev.role,
          notes: prev.notes + `\n[Deep OCR]: Scanned ${name || 'Contact'} (${role || 'Role'}) from ${company || 'Company'}.`
        }));

        confetti({
          particleCount: 70,
          spread: 50,
          origin: { y: 0.7 }
        });
      }

    } catch (err) {
      console.error("OCR Error:", err);
      if (err.message === "EMPTY_TEXT") {
        setError("Could not read any text. Please ensure the card is well-lit and not blurry.");
      } else {
        setError("Offline OCR engine failed. Please retry with a clearer photo.");
      }
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `audio_${currentClientId}_${Date.now()}.webm`;
        const timestamp = new Date().toISOString();

        await db.media_local.add({
          client_uuid: currentClientId,
          file_name: fileName,
          blob: audioBlob,
          type: 'audio',
          timestamp
        });

        await db.sync_queue.add({
          type: "audio",
          lead_client_uuid: currentClientId,
          file_name: fileName,
          timestamp,
          sync_status: "pending"
        });

        setAudioRecorded(true);
        setIsRecording(false);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Camera/Mic access denied or error:", err);
      setError("Mic access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const client_uuid = currentClientId;
      const timestamp = new Date().toISOString();

      if (formData.intent === 'Follow-up' && !formData.reminder_date) {
        setError("Please select a Follow-up Date.");
        setLoading(false);
        return;
      }

      const newLead = {
        client_uuid,
        ...formData,
        source: mode,
        mode,
        status: formData.intent === 'Follow-up' ? 'Follow-up' : 'Met',
        sync_status: 'pending',
        timestamp,
        owner_id: CURRENT_USER_ID
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

      // Clear form and reset for next entry
      clearForm();

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
              background: 'rgba(10, 12, 16, 0.9)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div className="pulse-circle" style={{
                width: '100px',
                height: '100px',
                background: isRecording ? 'var(--danger)' : 'var(--primary)',
                borderRadius: '50%',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRecording ? '0 0 50px rgba(239, 68, 68, 0.4)' : '0 0 50px rgba(59, 130, 246, 0.4)'
              }}>
                {isRecording ? <Mic size={40} color="white" /> : <Camera size={40} color="white" />}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                {isRecording ? `Recording... ${Math.floor(recordingTime / 60)}: ${(recordingTime % 60).toString().padStart(2, '0')}` : 'AI OCR Scanning...'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', marginBottom: '2.5rem' }}>
                {isRecording ? 'Capturing investor intent' : 'Processing business card details'}
              </p>

              {isRecording && (
                <button
                  onClick={(e) => { e.preventDefault(); stopRecording(); }}
                  className="btn btn-danger"
                  style={{
                    padding: '1.2rem 3rem',
                    borderRadius: '50px',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                  }}
                >
                  <Zap size={20} fill="white" style={{ marginRight: '0.5rem' }} />
                  FINISH RECORDING
                </button>
              )}
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

          <div style={{ display: 'grid', gridTemplateColumns: mode === 'stall' ? '1fr 1fr' : '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="input-group">
              <label className="label">Company / Organization</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '45px', height: '55px' }}
                  placeholder="Ex: FinIdeas Ltd"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Job Role / Title</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '45px', height: '55px' }}
                  placeholder="Ex: Senior Director"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
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

          {/* Intelligence Controls - Available ONLY in Field Mode */}
          {mode === 'field' && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                {!isRecording ? (
                  <button onClick={startRecording} type="button" className="btn btn-secondary" style={{ height: '90px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center', border: '1px solid var(--primary-light)' }}>
                    <Mic size={28} color="var(--primary)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{audioRecorded ? 'Rec/Edit Voice' : 'Voice Memo'}</span>
                  </button>
                ) : (
                  <button onClick={stopRecording} type="button" className="btn btn-danger" style={{ height: '90px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center', background: 'var(--danger)', color: 'white', border: 'none' }}>
                    <div className="pulse-circle" style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', margin: '0 auto' }}></div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>STOP ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')})</span>
                  </button>
                )}

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleScanCard}
                />
                <button onClick={() => fileInputRef.current.click()} type="button" className="btn btn-secondary" style={{ height: '90px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center', border: '1px solid var(--primary-light)' }}>
                  <Camera size={28} color="var(--primary)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{isScanning ? 'Scanning...' : 'Scan Card'}</span>
                </button>
              </div>

              {audioRecorded && !isRecording && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '0.8rem', borderRadius: '12px', border: '1px dashed var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                  <Zap size={16} color="var(--primary)" fill="var(--primary)" />
                  <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Audio memo stored locally. Transcription will trigger on sync.
                  </p>
                </div>
              )}

              {isScanning && (
                <div className="animate-pulse" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  🤖 AI analyzing business card... please wait
                </div>
              )}
            </div>
          )}

          {formData.intent === 'Follow-up' && (
            <div className="input-group animate-fade-in" style={{ marginTop: '1.5rem' }}>
              <label className="label">Next Follow-up Date</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="datetime-local"
                  className="input"
                  style={{ paddingLeft: '45px', height: '55px' }}
                  value={formData.reminder_date}
                  onChange={e => setFormData({ ...formData, reminder_date: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="label">Projected/Closed Revenue (Lakhs)</label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="number"
                className="input"
                style={{ paddingLeft: '45px', height: '55px' }}
                placeholder="0.00"
                value={formData.revenue}
                onChange={e => setFormData({ ...formData, revenue: e.target.value })}
              />
            </div>
          </div>

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
