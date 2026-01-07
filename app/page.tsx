export default function HomePage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '2rem',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div>
                <h1 style={{ fontSize: '4rem', marginBottom: '1rem', fontWeight: 800 }}>
                    🤖 Auto_Tweet
                </h1>
                <p style={{ fontSize: '1.5rem', opacity: 0.8, marginBottom: '2rem' }}>
                    AI News Aggregation System
                </p>
                <p style={{ fontSize: '1rem', opacity: 0.6 }}>
                    This is a private MVP. Admin interface is not publicly linked.
                </p>
            </div>
        </div>
    );
}
