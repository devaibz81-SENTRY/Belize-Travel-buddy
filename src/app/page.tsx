export default function Home() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#0f1115',
            color: 'white',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '20px'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>Travel Buddy Belize</h1>
            <p style={{ fontSize: '1.2rem', color: '#9ca3af' }}>Deployment in Progress - Verifying Path</p>
            <div style={{
                marginTop: '20px',
                padding: '10px 20px',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                color: '#3b82f6'
            }}>
                Branch: main
            </div>
        </div>
    );
}
