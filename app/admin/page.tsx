'use client';

import { useState } from 'react';
import './admin.css';

export default function AdminPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    const handleAction = async (endpoint: string, actionName: string) => {
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                setMessageType('success');
                setMessage(`✅ ${actionName}: ${data.message}`);
            } else {
                setMessageType('error');
                setMessage(`❌ ${actionName} failed: ${data.error}`);
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
                    <h1>🤖 Auto_Tweet Admin</h1>
                    <p className="subtitle">AI News Aggregation System</p>
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
                            <h2>📡 Collect News</h2>
                            <p>Fetch latest articles from 16 RSS feeds</p>
                            <button
                                onClick={() => handleAction('/api/admin/collect', 'Collection')}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? 'Processing...' : 'Collect Now'}
                            </button>
                        </div>

                        <div className="action-card">
                            <h2>🔍 Summarize Topics</h2>
                            <p>Cluster items and generate AI summaries</p>
                            <button
                                onClick={() => handleAction('/api/admin/summarize', 'Summarization')}
                                disabled={loading}
                                className="btn btn-secondary"
                            >
                                {loading ? 'Processing...' : 'Summarize Now'}
                            </button>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="info-section">
                        <h3>📋 Workflow</h3>
                        <ol>
                            <li>
                                <strong>Collect News:</strong> Fetches the latest articles from AI and semiconductor RSS feeds
                            </li>
                            <li>
                                <strong>Summarize Topics:</strong> Clusters articles into topics, calculates attention scores,
                                and generates Japanese summaries + X drafts (80-140 characters)
                            </li>
                        </ol>

                        <div className="info-note">
                            <strong>Note:</strong> X posting is currently disabled (ENABLE_X_POSTING=false)
                        </div>
                    </div>

                    {/* Stats Preview */}
                    <div className="stats-preview">
                        <h3>📊 System Status</h3>
                        <p className="stats-info">
                            Statistics and recent drafts will be displayed here in a future update.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
