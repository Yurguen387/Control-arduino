import React, { useState, useEffect } from 'react';
import { useWebSerial } from './hooks/useWebSerial';
import { translations } from './utils/translations';
import { lessonsDatabase } from './utils/lessonsDatabase';
import Header from './components/Header';
import DashboardBuilder from './components/DashboardBuilder';
import SerialMonitor from './components/SerialMonitor';
import ATConfigurator from './components/ATConfigurator';
import ConnectionGuide from './components/ConnectionGuide';

import { Sliders, Terminal, Settings, Code, Copy, Check, HelpCircle, MessageSquare, AlertTriangle, Zap } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('edu_lang') || 'es';
  });
  const [activeTab, setActiveTab] = useState('guide');
  const [telemetryData, setTelemetryData] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null); // tracking copy actions

  // Curriculum States
  const [selectedGrade, setSelectedGrade] = useState(() => {
    return localStorage.getItem('edu_selected_grade') || 'seventh';
  });
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(() => {
    const saved = localStorage.getItem('edu_selected_lesson_idx');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('edu_lang', newLang);
  };

  const handleGradeChange = (grade) => {
    setSelectedGrade(grade);
    setSelectedLessonIdx(0);
    localStorage.setItem('edu_selected_grade', grade);
    localStorage.setItem('edu_selected_lesson_idx', '0');
  };

  const handleLessonIdxChange = (idx) => {
    setSelectedLessonIdx(idx);
    localStorage.setItem('edu_selected_lesson_idx', String(idx));
  };

  // Active Lesson profile
  const activeLesson = lessonsDatabase[selectedGrade]?.[selectedLessonIdx] || lessonsDatabase.seventh[0];

  // Dictionary for active language
  const t = translations[lang];

  // Initialize Web Serial Hook
  const {
    isSupported,
    isConnected,
    isConnecting,
    isSimulated,
    connectionType,
    setConnectionType,
    portName,
    baudRate,
    setBaudRate,
    logs,
    connect,
    disconnect,
    sendData,
    clearLogs,
    setSimulated,
    connectionLost,
    reconnect
  } = useWebSerial((data) => {
    // onTelemetryReceived callback
    setTelemetryData(data);
  });



  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="app-container">
      
      {/* App Header */}
      <Header
        lang={lang}
        setLang={handleLangChange}
        t={t}
        isConnected={isConnected}
        isConnecting={isConnecting}
        isSimulated={isSimulated}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        portName={portName}
        baudRate={baudRate}
        setBaudRate={setBaudRate}
        connect={connect}
        disconnect={disconnect}
        setSimulated={setSimulated}
        isSupported={isSupported}
      />

      {/* Tabs Navigation */}
      <nav className="tabs-nav">
        <button
          onClick={() => setActiveTab('guide')}
          className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
        >
          <HelpCircle size={18} />
          {connectionType === 'bluetooth'
            ? (lang === 'es' ? 'Guía Conexión Bluetooth' : 'Bluetooth Connection Guide')
            : (lang === 'es' ? 'Guía Conexión Cable' : 'Cable Connection Guide')}
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <Sliders size={18} />
          {t.tabDashboard}
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
        >
          <Terminal size={18} />
          {t.tabMonitor}
        </button>


      </nav>

      {/* Connection Lost Banner */}
      {connectionLost && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderLeft: '4px solid #ef4444',
          margin: '1rem 1rem 0 1rem',
          padding: '1rem',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle color="#ef4444" size={24} />
            <div>
              <h4 style={{ margin: 0, color: '#ef4444', fontSize: '1rem', fontWeight: 'bold' }}>Conexión Perdida Inesperadamente</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--txt-secondary)' }}>
                El módulo de Arduino se ha desconectado. Verifica el cable o batería y vuelve a presionar el botón "Conectar" en el panel superior.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <main style={{ flexGrow: 1 }}>
        
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <DashboardBuilder
              t={t}
              isConnected={isConnected}
              sendData={sendData}
              telemetryData={telemetryData}
              activeLesson={activeLesson}
              logs={logs}
            />
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="animate-fade-in">
            <ConnectionGuide 
              t={t} 
              activeLesson={activeLesson}
              connectionType={connectionType}
              lang={lang}
              setActiveTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="animate-fade-in">
            <SerialMonitor
              t={t}
              isConnected={isConnected}
              sendData={sendData}
              logs={logs}
              clearLogs={clearLogs}
            />
          </div>
        )}

        {activeTab === 'configurator' && (
          <div className="animate-fade-in">
            <ATConfigurator
              t={t}
              isConnected={isConnected}
              isSimulated={isSimulated}
              sendData={sendData}
              logs={logs}
              connect={connect}
              connectionType={connectionType}
              setConnectionType={setConnectionType}
              setActiveTab={setActiveTab}
            />
          </div>
        )}



      </main>

    </div>
  );
}
