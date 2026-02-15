import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './pages/Dashboard';
import LeadForm from './components/LeadForm';
import Pipeline from './pages/Pipeline';
import ContactDetail from './pages/ContactDetail';
import AudioHistory from './pages/AudioHistory';
import Schedule from './pages/Schedule';
import { useNetwork } from './hooks/useNetwork';
import { useSync } from './hooks/useSync';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState(null);
  const isOnline = useNetwork();
  useSync(isOnline);

  const renderContent = () => {

    if (selectedLead) {
      return (
        <ContactDetail
          client_uuid={selectedLead}
          onBack={() => setSelectedLead(null)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onViewLead={(uuid) => setSelectedLead(uuid)}
            onQuickMode={(mode) => {
              setActiveTab('add-lead'); // Navigate to LeadForm
              window.localStorage.setItem('preferredMode', mode); // Pass mode
            }}
            onViewPipeline={() => setActiveTab('leads')} // Navigate to Pipeline
          />
        );
      case 'add-lead':
        return <LeadForm onComplete={() => setActiveTab('leads')} />;
      case 'leads':
        return <Pipeline onSelectLead={(uuid) => setSelectedLead(uuid)} />;
      case 'audio-history':
        return <AudioHistory />;
      case 'follow-ups':
        return <Schedule />;
      case 'settings':
        return (
          <div className="card glass animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2>System Settings</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Configure sync and profile.</p>
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
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;