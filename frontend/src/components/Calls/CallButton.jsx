import React, { useState } from 'react';

const CallButton = () => {
  const [status, setStatus] = useState('');
  const handleClick = async () => {
    setStatus('Appel en cours...');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/calls/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '+15551234567', // numéro du client de test
          from: '+15559876543' // numéro virtuel SignalWire (à configurer)
        })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus(`Appel lancé, SID: ${data.id}`);
      } else {
        setStatus(`Erreur: ${data.detail || 'unknown'}`);
      }
    } catch (e) {
      setStatus(`Exception: ${e.message}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
    >
      Lancer appel réel
    </button>
  );
};

export default CallButton;
