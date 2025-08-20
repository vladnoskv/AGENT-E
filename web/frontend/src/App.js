

import React, { useEffect, useState } from 'react';
import { checkHealth } from './api/api';
import './App.css';

function App() {
  const [status, setStatus] = useState('Checking backend...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const data = await checkHealth();
        setStatus(`Backend status: ${data.status}`);
        setError(null);
      } catch (err) {
        setStatus('Failed to connect to backend');
        setError(err.message);
      }
    };

    checkBackend();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>AGENT-X</h1>
        <p>{status}</p>
        {error && <p className="error">Error: {error}</p>}
      </header>
    </div>
  );
}

export default App;
