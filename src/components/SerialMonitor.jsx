import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, ArrowUp, ArrowDown, Play, Pause, ChevronRight } from 'lucide-react';

export default function SerialMonitor({
  t,
  isConnected,
  sendData,
  logs,
  clearLogs
}) {
  const [inputValue, setInputValue] = useState('');
  const [lineEnding, setLineEnding] = useState('\\r\\n');
  const [autoscroll, setAutoscroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // History of sent commands
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (autoscroll && !isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoscroll, isPaused]);

  // Handle command transmission
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const success = await sendData(inputValue, lineEnding);
    
    if (success) {
      // Add to command history
      setCmdHistory((prev) => [inputValue, ...prev.slice(0, 19)]); // Store last 20 commands
      setHistoryIndex(-1);
      setInputValue('');
    }
  };

  // Keyboard navigation for command history (Up/Down arrows)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0 && historyIndex < cmdHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputValue(cmdHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputValue(cmdHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Terminal Tools Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--clr-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChevronRight size={20} />
          {t.tabMonitor}
        </h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          
          {/* Line Ending config */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>{t.lineEnding}:</span>
            <select
              value={lineEnding}
              onChange={(e) => setLineEnding(e.target.value)}
              className="form-input"
              style={{ padding: '0.35rem 1.5rem 0.35rem 0.5rem', fontSize: '0.8rem', height: '32px' }}
            >
              <option value="none">{t.lineEndingNone}</option>
              <option value="\\n">{t.lineEndingNL}</option>
              <option value="\\r">{t.lineEndingCR}</option>
              <option value="\\r\\n">{t.lineEndingBoth}</option>
            </select>
          </div>

          {/* Pause / Resume Scroll */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.8rem' }}
            title={isPaused ? t.resume : t.paused}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? t.resume : t.paused}
          </button>

          {/* Autoscroll Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--txt-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
              style={{ accentColor: 'var(--clr-cyan)', cursor: 'pointer' }}
            />
            {t.autoscroll}
          </label>

          {/* Clear Console */}
          <button
            onClick={clearLogs}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.8rem', color: 'var(--clr-red)', borderColor: 'rgba(255,51,102,0.2)' }}
          >
            <Trash2 size={14} />
            {t.btnClear}
          </button>

        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="terminal-window">
        {logs.length === 0 && (
          <div className="terminal-line terminal-system">
            <span>[--:--:--]</span>
            <span>Esperando datos en el puerto serial...</span>
          </div>
        )}
        
        {logs.map((log, index) => {
          let prefix = '';
          let classDir = '';
          
          if (log.type === 'in') {
            prefix = '<- ';
            classDir = 'terminal-dir-in';
          } else if (log.type === 'out') {
            prefix = '-> ';
            classDir = 'terminal-dir-out';
          } else if (log.type === 'sys') {
            prefix = '[SYS] ';
            classDir = 'terminal-system';
          }

          return (
            <div key={index} className="terminal-line">
              <span className="terminal-time">[{log.timestamp}]</span>
              <span className={classDir} style={{ userSelect: 'none' }}>{prefix}</span>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.text}</span>
            </div>
          );
        })}
        
        <div ref={terminalEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? t.terminalPlaceholder : "* Conecta un puerto serial para enviar comandos *"}
          className="form-input"
          style={{ flexGrow: 1, fontFamily: 'var(--font-mono)' }}
          disabled={!isConnected}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100px' }}
          disabled={!isConnected || !inputValue.trim()}
        >
          <Send size={16} />
          {t.btnSend}
        </button>
      </form>

      {cmdHistory.length > 0 && (
        <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '-0.25rem' }}>
          <ArrowUp size={12} /> <ArrowDown size={12} /> Usa las flechas arriba/abajo en el teclado para navegar por el historial de comandos.
        </span>
      )}

    </div>
  );
}
