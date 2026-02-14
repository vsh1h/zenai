import React, { useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { 
  CloudOff, 
  Database, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

const SyncStatusPanel = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingCount = useLiveQuery(() => db.sync_queue.where('status').equals('pending').count()) || 0;
  const failedCount = useLiveQuery(() => db.sync_queue.where('status').equals('failed').count()) || 0;

  const handleRetry = async () => {
    setIsSyncing(true);
   
    setTimeout(() => {
        setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="card glass" style={{ borderLeftWidth: '6px', borderLeftColor: pendingCount > 0 ? 'var(--warning)' : 'var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={18} color="var(--primary)" />
          Sync Reliability
        </h3>
        <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.03)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
            {pendingCount === 0 && failedCount === 0 ? (
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={14} /> All Synced</span>
            ) : (
                <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> Offline Cache</span>
            )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending Records</span>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>{pendingCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Failed Syncs</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: failedCount > 0 ? 'var(--danger)' : 'inherit' }}>{failedCount}</span>
        </div>
      </div>

      {failedCount > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertTriangle size={16} color="var(--danger)" />
              <p style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{failedCount} records failed to upload. Check connection.</p>
          </div>
      )}

      <button 
        onClick={handleRetry}
        disabled={isSyncing || (pendingCount === 0 && failedCount === 0)}
        className="btn btn-primary" 
        style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
        {isSyncing ? 'Syncing...' : 'Retry Sync Now'}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SyncStatusPanel;
