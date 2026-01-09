'use client';

import { useState, useEffect } from 'react';
import './admin.css';

interface Draft {
    id: string;
    content: string;
    summary: {
        japaneseSummary: string;
        whyHot: string;
        topic: {
            name: string;
        };
    };
    createdAt: string;
}

interface AnalysisData {
    topics: { id: string; name: string; itemCount: number }[];
    items: { id: string; title: string; url: string; source: string; publishedAt: string; topics: string }[];
}

export default function AdminPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    // Data States
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisData>({ topics: [], items: [] });

    // UI Control States
    const [collectHours, setCollectHours] = useState('1');
    const [selectedTopicName, setSelectedTopicName] = useState<string | null>(null);
    const [showUnusedOnly, setShowUnusedOnly] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch Drafts
            const draftsRes = await fetch('/api/admin/drafts');
            if (draftsRes.ok) setDrafts(await draftsRes.json());

            // Fetch Analysis
            const analysisRes = await fetch('/api/admin/analysis');
            if (analysisRes.ok) setAnalysis(await analysisRes.json());

        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (endpoint: string, actionName: string) => {
        if (actionName === 'Reset' && !confirm('Are you sure you want to DELETE all summaries and drafts? This cannot be undone.')) {
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const options: RequestInit = { method: 'POST' };

            // Add hours param for collection
            if (actionName === 'Collection') {
                options.body = JSON.stringify({ hours: collectHours });
                options.headers = { 'Content-Type': 'application/json' };
            }

            const response = await fetch(endpoint, options);
            const data = await response.json();

            if (response.ok && (data.success || data.message)) {
                setMessageType('success');
                setMessage(`✅ ${data.message || 'Success'}`);
                // Refresh data
                setTimeout(fetchData, 1000);
            } else {
                setMessageType('error');
                setMessage(`❌ ${actionName} failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            setMessageType('error');
            setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Derived Data & Filtering Logic ---

    // Identify topics that have drafts generated
    const usedTopicNames = new Set(drafts.map(d => d.summary.topic.name));

    // Filter Items based on selection and usage status
    const filteredItems = analysis.items.filter(item => {
        const itemTopicName = item.topics; // Currently holds topic name or '-'
        const isUsed = usedTopicNames.has(itemTopicName);

        // 1. Context Filter (Topic Selection)
        if (selectedTopicName && itemTopicName !== selectedTopicName) {
            return false;
        }

        // 2. Status Filter (Unused Only)
        if (showUnusedOnly && isUsed) {
            return false;
        }

        return true;
    });

    return (
        <div className="admin-container">
            <div className="admin-card">
                <div className="admin-header">
                    <div className="header-content">
                        <div>
                            <h1>🤖 Auto_Tweet Admin</h1>
                            <p className="subtitle">AI News Aggregation & Draft Generation</p>
                        </div>
                        <div className="cron-badge">
                            ⏰ Cron: Daily 12:00 JST
                        </div>
                    </div>
                </div>

                <div className="admin-body">
                    {/* Status Message */}
                    {message && (
                        <div className={`message ${messageType}`}>
                            {message}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="actions-grid">
                        <div className="action-card">
                            <h2>📡 1. Collect</h2>
                            <p>Fetch latest RSS articles</p>
                            <div className="control-group">
                                <select
                                    className="select-hours"
                                    value={collectHours}
                                    onChange={(e) => setCollectHours(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="1">Last 1 Hour</option>
                                    <option value="6">Last 6 Hours</option>
                                    <option value="24">Last 24 Hours</option>
                                    <option value="48">Last 2 Days</option>
                                    <option value="168">Last 7 Days</option>
                                </select>
                                <button
                                    onClick={() => handleAction('/api/admin/collect', 'Collection')}
                                    disabled={loading}
                                    className="btn btn-primary"
                                >
                                    {loading ? '...' : 'Collect'}
                                </button>
                            </div>
                        </div>

                        <div className="action-card">
                            <h2>🧠 2. Generate</h2>
                            <p>Summarize & Create Drafts</p>
                            <button
                                onClick={() => handleAction('/api/admin/summarize', 'Summarization')}
                                disabled={loading}
                                className="btn btn-secondary"
                            >
                                {loading ? '...' : 'Summarize Now'}
                            </button>
                        </div>

                        <div className="action-card danger-zone">
                            <h2>🗑️ Reset</h2>
                            <p>Clear all drafts</p>
                            <button
                                onClick={() => handleAction('/api/admin/reset', 'Reset')}
                                disabled={loading}
                                className="btn btn-danger"
                            >
                                {loading ? '...' : 'Reset Data'}
                            </button>
                        </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="analysis-section">
                        <h3>📊 RSS Analysis</h3>

                        {/* 1. Active Topics Cards (Horizontal Scroll) */}
                        <div className="topics-container" style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ color: '#94a3b8', margin: 0 }}>Active Topics (Click to Filter)</h4>
                                {selectedTopicName && (
                                    <button
                                        onClick={() => setSelectedTopicName(null)}
                                        style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '15px' }}
                                    >
                                        Clear Filter ✕
                                    </button>
                                )}
                            </div>

                            <div className="topics-grid">
                                {analysis.topics.length === 0 ? (
                                    <div style={{ color: '#64748b', padding: '1rem' }}>No topics yet</div>
                                ) : (
                                    analysis.topics.map(t => {
                                        const isUsed = usedTopicNames.has(t.name);
                                        const isActive = selectedTopicName === t.name;
                                        return (
                                            <div
                                                key={t.id}
                                                className={`topic-card ${isActive ? 'active' : ''}`}
                                                onClick={() => setSelectedTopicName(isActive ? null : t.name)}
                                            >
                                                <div className="topic-header">
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        {isUsed && <span className="topic-used-indicator" title="Draft generated"></span>}
                                                        <span className="topic-name">{t.name}</span>
                                                    </div>
                                                </div>
                                                <div className="topic-stats">
                                                    <span>{t.itemCount} articles</span>
                                                    {isUsed && <span className="topic-badge">Used</span>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 2. Recent Articles Table (Filtered) */}
                        <div className="articles-container">
                            <div className="articles-header">
                                <h4 style={{ color: '#94a3b8', margin: 0 }}>
                                    Collected Articles
                                    {selectedTopicName && <span style={{ color: '#e2e8f0' }}> : {selectedTopicName}</span>}
                                    <span style={{ fontSize: '0.8em', marginLeft: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>
                                        ({filteredItems.length} items)
                                    </span>
                                </h4>

                                <div className="filter-controls">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            className="toggle-input"
                                            checked={showUnusedOnly}
                                            onChange={(e) => setShowUnusedOnly(e.target.checked)}
                                        />
                                        <span>Show Unused Only</span>
                                    </label>
                                </div>
                            </div>

                            <div className="articles-scroll-container">
                                <table className="data-table">
                                    <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                        <tr>
                                            <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                                            <th>Title</th>
                                            <th style={{ width: '120px' }}>Source</th>
                                            <th style={{ width: '150px' }}>Topic</th>
                                            <th style={{ width: '140px' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.length === 0 ? (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                                {analysis.items.length === 0 ? 'No items collected yet.' : 'No items match current filter.'}
                                            </td></tr>
                                        ) : (
                                            filteredItems.map(item => {
                                                const isUsed = usedTopicNames.has(item.topics);
                                                return (
                                                    <tr key={item.id} className={`article-row ${isUsed ? 'used' : ''}`}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {isUsed
                                                                ? <span className="status-badge status-used">Used</span>
                                                                : <span className="status-badge status-unused">-</span>
                                                            }
                                                        </td>
                                                        <td>
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500, display: 'block' }}>
                                                                {item.title}
                                                            </a>
                                                        </td>
                                                        <td><span className="source-badge">{item.source}</span></td>
                                                        <td>
                                                            <span style={{ fontSize: '0.9em', color: item.topics === '-' ? '#64748b' : 'inherit' }}>
                                                                {item.topics}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '0.85em', color: '#94a3b8' }}>{new Date(item.publishedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Drafts List */}
                    <div className="drafts-section" style={{ marginTop: '4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                            <h3>📝 Generated Drafts</h3>
                            <span style={{ marginLeft: '1rem', color: '#64748b', fontSize: '0.9rem' }}>{drafts.length} drafts</span>
                        </div>

                        {drafts.length === 0 ? (
                            <div className="no-data" style={{ background: 'rgba(255,255,255,0.05)', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
                                No drafts generated yet. Run "Collect" then "Summarize Now".
                            </div>
                        ) : (
                            <div className="drafts-grid">
                                {drafts.map((draft) => (
                                    <div key={draft.id} className="draft-card">
                                        <div className="draft-header">
                                            <span className="topic-tag">{draft.summary.topic.name}</span>
                                            <span className="char-count">{draft.content.length} chars</span>
                                        </div>
                                        <div className="draft-content">
                                            {draft.content}
                                        </div>
                                        <div className="why-hot">
                                            <strong>Why Hot:</strong> {draft.summary.whyHot}
                                        </div>
                                        <div className="draft-actions">
                                            <button
                                                className="btn-copy"
                                                onClick={() => navigator.clipboard.writeText(draft.content)}
                                            >
                                                📋 Copy Tweet
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
