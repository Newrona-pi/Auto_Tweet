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
    items: { id: string; title: string; source: string; publishedAt: string; topics: string }[];
}

export default function AdminPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    // Data States
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisData>({ topics: [], items: [] });

    // Control States
    const [collectHours, setCollectHours] = useState('1');

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
                        <div className="analysis-grid">

                            {/* Topics List */}
                            <div className="topics-column">
                                <h4 style={{ marginBottom: '1rem', color: '#94a3b8' }}>Active Topics</h4>
                                <div className="topics-list">
                                    {analysis.topics.length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center' }}>No topics yet</div>
                                    ) : (
                                        analysis.topics.map(t => (
                                            <div key={t.id} className="topic-item">
                                                <span>{t.name}</span>
                                                <span className="topic-count">{t.itemCount}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Recent Articles */}
                            <div className="articles-column">
                                <h4 style={{ marginBottom: '1rem', color: '#94a3b8' }}>Recent Collected Articles (Max 100)</h4>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Source</th>
                                                <th>Date</th>
                                                <th>Topic</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysis.items.length === 0 ? (
                                                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No items collected</td></tr>
                                            ) : (
                                                analysis.items.map(item => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>
                                                                {item.title}
                                                            </a>
                                                        </td>
                                                        <td><span className="source-badge">{item.source}</span></td>
                                                        <td>{new Date(item.publishedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td>{item.topics || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Drafts List */}
                    <div className="drafts-section" style={{ marginTop: '3rem' }}>
                        <h3>📝 Generated Drafts</h3>
                        {drafts.length === 0 ? (
                            <p className="no-data">No drafts generated yet.</p>
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
