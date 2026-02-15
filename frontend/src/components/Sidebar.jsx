import React from 'react';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Calendar,
  Settings,
  Database,
  Wifi,
  WifiOff,
  Mic
} from 'lucide-react';
import { db } from '../db/db';
import { useLiveQuery } from "dexie-react-hooks";

const Sidebar = ({ activeTab, setActiveTab, isOnline }) => {
  const pendingCount = useLiveQuery(() => db.sync_queue.where('status').equals('pending').count()) || 0;
  const audioCount = useLiveQuery(() => db.media_local.count()) || 0;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'All Leads', icon: Users, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'add-lead', label: 'New Lead', icon: PlusCircle },
    { id: 'audio-history', label: 'Recording Vault', icon: Mic, badge: audioCount > 0 ? audioCount : null },
    { id: 'follow-ups', label: 'Schedule', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="glass side-nav" style={{
      position: 'sticky',
      top: 0,
      height: '100vh',
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)'
    }}>
      <div className="logo-section" style={{ marginBottom: '3rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800 }}>FinIdeas</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Lead Management
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                marginBottom: '0.75rem',
                border: isActive ? 'none' : '1px solid transparent',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-main)',
                boxShadow: isActive ? 'var(--shadow-md)' : 'none'
              }}
            >
              <Icon size={20} color={isActive ? 'white' : 'var(--primary)'} />
              <span style={{ fontWeight: isActive ? 700 : 500, flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: 'var(--warning)',
                  color: 'white',
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 800
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="status-indicator card glass" style={{ padding: '1rem', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          {isOnline ? (
            <Wifi size={18} color="#10b981" />
          ) : (
            <WifiOff size={18} color="#ef4444" />
          )}
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{isOnline ? 'Online' : 'Offline Mode'}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {isOnline ? 'Synced & Secure' : 'Local Storage Active'}
            </p>
          </div>
        </div>

        {isOnline && (
          <button
            onClick={async () => {
              const confirm = window.confirm("This will re-verify all local leads with the server. Proceed?");
              if (confirm) {
                console.log(" Hard Sync Reset Triggered...");

                await db.leads_local.toCollection().modify({ sync_status: 'pending' });
                window.location.reload();
              }
            }}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem', borderRadius: '10px' }}
          >
            <Database size={14} style={{ marginRight: '0.5rem' }} /> Force Re-Sync
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
