import React, { useState } from 'react';
import { Languages, Play, Power, HelpCircle, HardDrive, ToggleLeft } from 'lucide-react';

export default function Header({
  lang,
  setLang,
  t,
  isConnected,
  isConnecting,
  isSimulated,
  connectionType,
  setConnectionType,
  portName,
  baudRate,
  setBaudRate,
  connect,
  disconnect,
  setSimulated,
  isSupported
}) {
  const [spinLang, setSpinLang] = useState(false);

  const toggleLanguage = () => {
    setSpinLang(true);
    setLang(lang === 'es' ? 'en' : 'es');
    setTimeout(() => setSpinLang(false), 600);
  };

  const baudRates = [9600, 19200, 38400, 57600, 115200];

  return (
    <header className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.5rem' }}>
      
      {/* Title & Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--clr-cyan)', margin: 0 }}>Arduino Connect Dashboard</h2>
      </div>

      {/* Control Panel: Ports, Bauds, Simulation, Connections */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        
        {/* Connection Status Indicator */}
        <div className="connection-box" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', height: '38px', padding: '0 0.75rem' }}>
          <span className={`status-dot ${isSimulated ? 'simulated' : isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'}`} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--txt-secondary)' }}>
            {isSimulated ? t.statusSimulated : isConnected ? t.statusConnected : isConnecting ? t.statusConnecting : t.statusDisconnected}
          </span>
        </div>

        {/* Connection Type Selector */}
        {!isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', fontFamily: 'var(--font-display)' }}>Tipo:</label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="form-input"
              style={{ height: '38px', padding: '0 2rem 0 0.75rem', backgroundPosition: 'right 0.5rem center', cursor: 'pointer' }}
            >
              <option value="usb">🔌 USB (Cable)</option>
              <option value="bluetooth">📶 Bluetooth</option>
            </select>
          </div>
        )}

        {/* Baud Rate Selector */}
        {!isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', fontFamily: 'var(--font-display)' }}>{t.baud}:</label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(parseInt(e.target.value))}
              className="form-input"
              style={{ height: '38px', padding: '0 2rem 0 0.75rem', backgroundPosition: 'right 0.5rem center', cursor: 'pointer' }}
            >
              {baudRates.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} bps
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Simulation Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', height: '38px' }}>
          <label htmlFor="sim-toggle" style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {t.simulation}
          </label>
          <input
            id="sim-toggle"
            type="checkbox"
            checked={isSimulated}
            onChange={(e) => setSimulated(e.target.checked)}
            style={{ display: 'none' }}
          />
          <div 
            onClick={() => setSimulated(!isSimulated)}
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              backgroundColor: isSimulated ? 'rgba(157, 78, 221, 0.3)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isSimulated ? 'var(--clr-purple)' : 'var(--border-subtle)'}`,
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: isSimulated ? 'var(--clr-purple)' : '#94a3b8',
              position: 'absolute',
              top: '2px',
              left: isSimulated ? '18px' : '2px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isSimulated ? '0 0 6px var(--clr-purple)' : 'none'
            }} />
          </div>
        </div>

        {/* Connect Button */}
        {isSupported ? (
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            className={`btn ${isConnected ? 'btn-danger' : 'btn-primary'}`}
            style={{ height: '38px', minWidth: '130px' }}
          >
            <Power size={16} />
            {isConnected ? t.disconnect : t.connect}
          </button>
        ) : (
          <div className="badge" style={{ color: 'var(--clr-red)', background: 'rgba(255,51,102,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--clr-red)' }}>
            {t.notSupported}
          </div>
        )}

        {/* Port Name Badge */}
        {isConnected && portName && (
          <div className="badge cyan animate-fade-in" style={{ height: '38px', display: 'flex', alignItems: 'center', padding: '0 0.75rem', borderRadius: '8px' }}>
            {portName}
          </div>
        )}

        {/* Language Selector */}
        <button
          onClick={toggleLanguage}
          className="btn btn-secondary"
          style={{ width: '38px', height: '38px', padding: 0, borderRadius: '8px' }}
          title="Switch Language / Cambiar Idioma"
        >
          <Languages size={18} className={spinLang ? 'lang-icon-spin' : ''} />
        </button>

      </div>
    </header>
  );
}
