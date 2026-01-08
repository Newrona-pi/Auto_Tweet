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

export default function AdminPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [drafts, setDrafts] = useState<Draft[]>([]);

    const fetchDrafts = async () => {
        try {
            const res = await fetch('/api/admin/drafts');
            if (res.ok) {
                const data = await res.json();
                setDrafts(data);
            }
        } catch (error) {
            console.error('Failed to fetch drafts', error);
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, []);

    const handleAction = async (endpoint: string, actionName: string) => {
        if (actionName === 'Reset' && !confirm('Are you sure you want to DELETE all summaries and drafts? This cannot be undone.')) {
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok && (data.success || data.message)) {
                setMessageType('success');
                setMessage(`✅ ${actionName}: ${data.message || 'Success'}`);
                // Refresh drafts after any action
                setTimeout(fetchDrafts, 1000);
            } else {
                setMessageType('error');
                setMessage(`❌ ${actionName} failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            setMessageType('error');
            setMessage(`❌ ${actionName} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                            ⏰ Cron Active (7:00 / 19:00 EST)
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
                            <button
                                onClick={() => handleAction('/api/admin/collect', 'Collection')}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? '...' : 'Collect Now'}
                            </button>
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
                            <p>Clear all drafts & summaries</p>
                            <button
                                onClick={() => handleAction('/api/admin/reset', 'Reset')}
                                disabled={loading}
                                className="btn btn-danger"
                            >
                                {loading ? '...' : 'Reset Data'}
                            </button>
                        </div>
                    </div>

                    {/* Drafts List */}
                    <div className="drafts-section">
                        <h3>📝 Generated Drafts ({drafts.length})</h3>
                        {drafts.length === 0 ? (
                            <p className="no-data">No drafts generated yet. Try collecting and summarizing.</p>
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
