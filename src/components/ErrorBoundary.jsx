import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: '#111',
          color: '#fff',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ fontSize: '28px', margin: '0 0 15px 0', color: '#dc3545' }}>
            Nastala chyba
          </h1>
          <p style={{ fontSize: '16px', color: '#aaa', maxWidth: '500px', lineHeight: '1.5' }}>
            Omlouváme se, něco se pokazilo. Zkuste obnovit stránku nebo se vrátit na hlavní stránku.
          </p>
          {this.state.error && (
            <details style={{ marginTop: '20px', maxWidth: '600px', textAlign: 'left', color: '#888' }}>
              <summary style={{ cursor: 'pointer', color: '#aaa' }}>Detaily chyby (pro vývojáře)</summary>
              <pre style={{ padding: '15px', background: '#222', borderRadius: '8px', fontSize: '12px', overflow: 'auto', marginTop: '10px' }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 25px',
                fontSize: '16px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 Zkusit znovu
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 25px',
                fontSize: '16px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🏠 Hlavní stránka
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
