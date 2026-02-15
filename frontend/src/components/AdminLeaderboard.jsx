import React, { useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { Users, TrendingUp, BarChart2 } from 'lucide-react';
import AgentPerformanceModal from './AgentPerformanceModal';

const AdminLeaderboard = () => {
    const leads = useLiveQuery(() => db.leads_local.toArray()) || [];
    const [selectedAgent, setSelectedAgent] = useState(null);

    // Grouping leads by Agent Name
    const agentGroups = leads.reduce((acc, lead) => {
        const agent = lead.agent_name || 'Unassigned';
        if (!acc[agent]) {
            acc[agent] = {
                name: agent,
                totalLeads: 0,
                totalAUA: 0,
                totalReadiness: 0,
                leads: []
            };
        }
        acc[agent].totalLeads += 1;
        acc[agent].totalAUA += (lead.predicted_aua || 0);
        acc[agent].totalReadiness += (lead.readiness_score || 0);
        acc[agent].leads.push(lead);
        return acc;
    }, {});

    const leaderboardData = Object.values(agentGroups).map(agent => ({
        ...agent,
        avgReadiness: Math.round(agent.totalReadiness / agent.totalLeads)
    })).sort((a, b) => b.totalAUA - a.totalAUA);

    const formatCurrency = (val) => {
        if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
        if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
        return val.toLocaleString();
    };

    return (
        <div className="animate-fade-in" style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin <span className="text-gradient">Leaderboard</span></h3>
                <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
                    LIVE AGENT ANALYTICS
                </div>
            </div>

            <div className="card glass" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Agent Name</th>
                                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Total Leads</th>
                                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Cumulative AUA</th>
                                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Avg. Readiness</th>
                                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center' }}>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboardData.map((agent, idx) => (
                                <tr
                                    key={idx}
                                    onClick={() => setSelectedAgent(agent)}
                                    className="leaderboard-row"
                                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: idx === 0 ? 'var(--primary)' : 'var(--glass-bg)',
                                                color: idx === 0 ? 'white' : 'var(--text-dim)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <span style={{ fontWeight: 700 }}>{agent.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Users size={16} color="var(--text-dim)" />
                                            <span style={{ fontWeight: 600 }}>{agent.totalLeads}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <TrendingUp size={16} color="var(--accent)" />
                                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(agent.totalAUA)}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${agent.avgReadiness}%`,
                                                    background: agent.avgReadiness > 70 ? 'var(--accent)' : agent.avgReadiness > 40 ? 'var(--warning)' : 'var(--danger)'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{agent.avgReadiness}%</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                            <BarChart2 size={14} style={{ marginRight: '0.3rem' }} /> ANALYZER
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {leaderboardData.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No lead data available for leaderboard.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .leaderboard-row:hover {
          background: rgba(255,255,255,0.03);
        }
      `}</style>

            {selectedAgent && (
                <AgentPerformanceModal
                    agent={selectedAgent.name}
                    leads={selectedAgent.leads}
                    onClose={() => setSelectedAgent(null)}
                />
            )}
        </div>
    );
};

export default AdminLeaderboard;
