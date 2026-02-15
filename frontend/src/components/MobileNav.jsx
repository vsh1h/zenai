import React from 'react';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Mic,
  Calendar,
  Settings
} from 'lucide-react';

const MobileNav = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'add-lead', label: 'New', icon: PlusCircle },
    { id: 'audio-history', label: 'Vault', icon: Mic },
    { id: 'follow-ups', label: 'Meet', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="bottom-nav glass">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-item-mobile ${isActive ? 'active' : ''}`}
          >
            <div className="icon-container" style={{
              background: isActive ? 'var(--primary-glow)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-dim)',
            }}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span style={{
              marginTop: '2px',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: isActive ? 'var(--primary)' : 'var(--text-dim)'
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileNav;