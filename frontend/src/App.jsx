import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LeadForm from './components/LeadForm';
import Pipeline from './pages/Pipeline';
import ContactDetail from './pages/ContactDetail';
import { useNetwork } from './hooks/useNetwork';
import { useSync } from './hooks/useSync';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState(null);
  const isOnline = useNetwork();
  useSync(isOnline);

  const renderContent = () => {
    if (selectedLead) {
      return <ContactDetail client_uuid={selectedLead} onBack={() => setSelectedLead(null)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onViewLead={(uuid) => setSelectedLead(uuid)} />;
      case 'add-lead':
        return <LeadForm onComplete={() => setActiveTab('leads')} />;
      case 'leads':
        return <Pipeline onSelectLead={(uuid) => setSelectedLead(uuid)} />;
      case 'settings':
        return (
          <div className="card glass animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2>System Settings</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Configure sync interval and user profile.</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="layout-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOnline={isOnline} />
      
      <main className="main-content">
        {renderContent()}
      </main>

     
      <div style={{
        position: 'fixed',
        bottom: '-10%',
        right: '-5%',
        width: '400px',
        height: '400px',
        background: 'var(--primary-glow)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        zIndex: -1,
        opacity: 0.3
      }} />
    </div>
  );
}

export default App;
