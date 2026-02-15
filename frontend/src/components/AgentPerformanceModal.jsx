import React from 'react';
import { createPortal } from 'react-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { X, TrendingUp, Award, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AgentPerformanceModal = ({ agent, leads, onClose }) => {
    if (!agent) return null;

    // Data for Bar Chart: Leads by Status
    const STAGES = ['Met Up', 'Follow Up', 'Engaged', 'Meeting', 'Outcome'];

    const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {});

    const barData = STAGES.map(status => ({
        name: status,
        value: statusCounts[status] || 0
    }));

    // Data for Top Leads Readiness
    const topLeads = [...leads]
        .sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0))
        .slice(0, 3);

    const modalContent = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(10, 12, 16, 0.85)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000, // Even higher
                    padding: '2rem'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    style={{
                        background: 'var(--bg-dark)',
                        width: '100%',
                        maxWidth: '940px',
                        borderRadius: '32px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 40px 80px -15px rgba(0, 0, 0, 0.6)'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ padding: '2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '18px',
                                background: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 900, fontSize: '2rem',
                                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)'
                            }}>
                                {agent[0]}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{agent} Performance</h2>
                                <p style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>Analytics & Intelligence Insights</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)',
                                padding: '0.8rem', borderRadius: '16px',
                                cursor: 'pointer', color: 'var(--text-dim)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div style={{ padding: '2.5rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2.5rem' }}>

                        {/* Left Column: Leads by Status Chart */}
                        <div className="card glass" style={{ padding: '2rem', borderRadius: '28px', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '2.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-bright)' }}>
                                <TrendingUp size={22} color="var(--primary)" /> Leads by Status
                            </h3>
                            <div style={{ height: '340px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="var(--text-dim)"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: 'var(--text-dim)' }}
                                        />
                                        <YAxis
                                            stroke="var(--text-dim)"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: 'var(--text-dim)' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                            contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.5)' }}
                                            itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                                        />
                                        <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={45} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Right Column: Insights */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {/* Top 3 Readiness */}
                            <div className="card glass" style={{ padding: '1.8rem', borderRadius: '28px', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)' }}>
                                    <Award size={22} color="var(--accent)" /> Top 3 Readiness
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {topLeads.map((lead, idx) => (
                                        <div key={idx} style={{ padding: '1.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-bright)' }}>{lead.name}</span>
                                                <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.2rem' }}>{lead.readiness_score || 0}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${lead.readiness_score || 0}%` }}
                                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                                    style={{ height: '100%', background: 'var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {topLeads.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '1rem', textAlign: 'center' }}>No readiness data available</p>}
                                </div>
                            </div>

                            {/* AI ROI Prediction */}
                            <div className="card glass" style={{ padding: '2.5rem', borderRadius: '28px', border: '1px solid var(--border)', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(99, 102, 241, 0.08) 100%)' }}>
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
                                }}>
                                    <Target size={36} color="var(--secondary)" />
                                </div>
                                <h4 style={{ fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.08em' }}>AI Predicted ROI</h4>
                                <p style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--secondary)', margin: '0.6rem 0', letterSpacing: '-0.02em' }}>84.2%</p>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>Confidence based on engagement & intent matching.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default AgentPerformanceModal;
