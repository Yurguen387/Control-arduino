import React, { useState, useEffect, useRef } from 'react';
import { Info, Settings, Cpu, Clipboard, Check, Terminal, Sparkles, ArrowRight, ArrowLeft, Power, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { arduinoSketches } from '../utils/arduinoSketches';

export default function ATConfigurator({
  t,
  isConnected,
  isSimulated,
  sendData,
  logs,
  connect,
  connectionType,
  setConnectionType,
  setActiveTab
}) {
  const [activeStep, setActiveStep] = useState(1);
  const [btName, setBtName] = useState('');
  const [btPin, setBtPin] = useState('1234');
  const [btModuleType, setBtModuleType] = useState('classic'); // 'classic', 'crlf', 'hc05'
  const [copiedBridge, setCopiedBridge] = useState(false);
  
  // Programming states
  const [isProgramming, setIsProgramming] = useState(false);
  const [progStep, setProgStep] = useState(0); 
  const [progLogs, setProgLogs] = useState([]);
  
  const timeoutRef = useRef(null);
  const stepRef = useRef(0);

  const addProgLog = (type, message) => {
    setProgLogs((prev) => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
  };

  const celebrate = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const handleConnectUSB = async () => {
    if (connectionType !== 'usb') {
      setConnectionType('usb');
    }
    // Small delay to allow state update if needed, though useWebSerial handles it
    setTimeout(() => {
      connect();
    }, 100);
  };

  const startProgramming = async () => {
    if (!isConnected) {
      alert(t.progFailed + " (No port connected)");
      return;
    }
    
    if (!btName.trim()) {
      alert("Por favor escribe un nombre para el Bluetooth");
      return;
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(btName)) {
      alert("El nombre solo puede contener letras, números, guiones y guiones bajos (sin espacios).");
      return;
    }
    if (btName.length > 20) {
      alert("El nombre no debe superar los 20 caracteres.");
      return;
    }
    if (!/^\d{4}$/.test(btPin)) {
      alert("El PIN debe ser exactamente de 4 números.");
      return;
    }

    setIsProgramming(true);
    setProgLogs([]);
    setProgStep(1);
    stepRef.current = 1;
    
    addProgLog('info', t.progStepConnecting);

    if (isSimulated) {
      simulateProgramming();
    } else {
      const term = btModuleType === 'classic' ? '' : '\\r\\n';
      addProgLog('send', `TX -> AT (Terminator: ${term === '\\r\\n' ? 'CRLF' : 'None'})`);
      await sendData('AT', term); 
      
      resetTimeout(4000, [
        'Error: Tiempo de espera agotado respondiendo AT.',
        '🔍 LISTA DE COMPROBACIÓN:',
        '• ¿El LED del HC-06 parpadea rápido? Si está fijo, desconéctalo de tu celular o tableta.',
        '• ¿El módulo es versión nueva? Intenta cambiar el "Tipo de Módulo" a "HC-06 Nuevo / HC-05 (CRLF)".',
        '• ¿Subiste el boceto en blanco en el Paso 1 ANTES de conectar los cables?',
        '• ¿Conectaste Pin 0 a RX y Pin 1 a TX?',
        '• ¿Estás conectado al puerto USB del Arduino y no al Bluetooth de tu PC?'
      ]);
    }
  };

  const resetTimeout = (ms, errMsgs) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (Array.isArray(errMsgs)) {
        errMsgs.forEach(msg => addProgLog('err', msg));
      } else {
        addProgLog('err', errMsgs);
      }
      setProgStep(5);
      setIsProgramming(false);
    }, ms);
  };

  const simulateProgramming = () => {
    setTimeout(() => {
      addProgLog('recv', 'RX <- OK');
      addProgLog('info', t.progStepSendingName.replace('{name}', btName));
      
      setTimeout(async () => {
        addProgLog('send', `TX -> AT+NAME${btName}`);
        addProgLog('recv', 'RX <- OKsetname');
        addProgLog('info', t.progStepSendingPin);
        
        setTimeout(() => {
          addProgLog('send', `TX -> AT+PIN${btPin}`);
          addProgLog('recv', 'RX <- OKsetPIN');
          addProgLog('success', t.progSuccess);
          setProgStep(4);
          setIsProgramming(false);
          celebrate();
        }, 800);
      }, 800);
    }, 800);
  };

  useEffect(() => {
    if (!isProgramming || isSimulated || logs.length === 0) return;

    const lastLog = logs[logs.length - 1];
    if (lastLog.type !== 'in') return;

    const response = lastLog.text.trim().toUpperCase();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (stepRef.current === 1) {
      if (response === 'OK') {
        addProgLog('recv', 'RX <- OK');
        addProgLog('info', t.progStepSendingName.replace('{name}', btName));
        setProgStep(2);
        stepRef.current = 2;
        
        const cmd = btModuleType === 'hc05' ? `AT+NAME=${btName}` : `AT+NAME${btName}`;
        const term = btModuleType === 'classic' ? '' : '\\r\\n';
        addProgLog('send', `TX -> ${cmd}`);
        sendData(cmd, term); 
        
        resetTimeout(4000, [
          'Error: Tiempo de espera agotado al cambiar el nombre.'
        ]);
      } else {
        addProgLog('warn', `Respuesta: ${response}. Esperando 'OK'...`);
      }
    } 
    else if (stepRef.current === 2) {
      if (response.includes('OKSETNAME') || response.includes('OK') || response === 'OKSET') {
        addProgLog('recv', `RX <- ${response}`);
        addProgLog('info', t.progStepSendingPin);
        setProgStep(3);
        stepRef.current = 3;
        
        const cmd = btModuleType === 'hc05' ? `AT+PSWD=${btPin}` : `AT+PIN${btPin}`;
        const term = btModuleType === 'classic' ? '' : '\\r\\n';
        addProgLog('send', `TX -> ${cmd}`);
        sendData(cmd, term); 
        
        resetTimeout(4000, [
          'Error: Tiempo de espera agotado al cambiar el PIN.'
        ]);
      }
    } 
    else if (stepRef.current === 3) {
      if (response.includes('OKSETPIN') || response.includes('OK') || response === 'OKSET') {
        addProgLog('recv', `RX <- ${response}`);
        addProgLog('success', t.progSuccess);
        setProgStep(4);
        setIsProgramming(false);
        celebrate();
      }
    }
  }, [logs, isProgramming]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const totalSteps = 4;

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Info */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--clr-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Settings size={20} />
            {t.atTitle}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
            {t.atDescription}
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('guide')}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', height: '32px' }}
        >
          Volver a la Guía
        </button>
      </div>

      {/* Stepper Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '12px' }}>
        {[1, 2, 3, 4].map(step => (
          <div 
            key={step} 
            style={{ 
              flexGrow: 1, 
              height: '6px', 
              borderRadius: '3px', 
              background: activeStep >= step ? 'var(--clr-purple)' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s ease'
            }} 
          />
        ))}
      </div>

      {/* Step Contents */}
      <div style={{ minHeight: '300px' }}>
        
        {/* STEP 1: Upload Blank Sketch */}
        {activeStep === 1 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-purple)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} />
              Paso 1: Cargar el puente (Boceto en Blanco)
            </h3>
            <div className="connection-box" style={{ background: 'rgba(255, 183, 3, 0.05)', border: '1px solid rgba(255, 183, 3, 0.2)' }}>
              <AlertTriangle size={20} color="var(--clr-yellow)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                Antes de cablear el módulo, debemos preparar el Arduino. Si ya tiene cables conectados a los Pines 0 y 1, <strong>desconéctalos</strong> para evitar conflictos.
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5', marginTop: '0.5rem' }}>
                Copia este código y súbelo a tu Arduino usando el IDE oficial de Arduino. Este código en blanco permite que la computadora hable directamente con el módulo Bluetooth.
              </p>
            </div>

            <div className="connection-box" style={{ gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--txt-muted)' }}>Código Puente:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(arduinoSketches.config);
                    setCopiedBridge(true);
                    setTimeout(() => setCopiedBridge(false), 2000);
                  }}
                  className="btn btn-secondary"
                  style={{ height: '28px', fontSize: '0.75rem', gap: '0.25rem' }}
                >
                  {copiedBridge ? <Check size={12} color="var(--clr-green)" /> : <Clipboard size={12} />}
                  {copiedBridge ? t.codeCopied : t.btnCopyCode}
                </button>
              </div>
              <pre style={{
                background: '#020408', border: '1px solid var(--border-subtle)', borderRadius: '6px',
                padding: '0.75rem', maxHeight: '180px', overflow: 'auto', fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)', color: 'var(--txt-secondary)', width: '100%', textAlign: 'left'
              }}>
                <code>{arduinoSketches.config}</code>
              </pre>
            </div>
          </div>
        )}

        {/* STEP 2: Wiring */}
        {activeStep === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} />
              Paso 2: Conectar los Cables
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)' }}>
              Una vez que el código en blanco se haya subido con éxito al Arduino, ahora sí conecta el módulo Bluetooth siguiendo este esquema. <strong>El LED del Bluetooth debe parpadear rápido.</strong>
            </p>
            
            <div className="connection-box">
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '8px', color: 'var(--txt-muted)' }}>Pin en Arduino</th>
                    <th style={{ padding: '8px', color: 'var(--txt-muted)' }}>Pin en Bluetooth (HC-06)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px' }}><span className="highlight-pin pin-vcc">5V</span></td>
                    <td style={{ padding: '8px' }}><span className="highlight-pin pin-vcc">VCC</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px' }}><span className="highlight-pin pin-gnd">GND</span></td>
                    <td style={{ padding: '8px' }}><span className="highlight-pin pin-gnd">GND</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px' }}><span className="highlight-pin pin-rx">Pin 0 (RX)</span></td>
                    <td style={{ padding: '8px' }}>RXD</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px' }}><span className="highlight-pin pin-tx">Pin 1 (TX)</span></td>
                    <td style={{ padding: '8px' }}>TXD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '0.75rem', background: 'rgba(0, 242, 254, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--clr-cyan)', display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Nota de Cableado Directo:</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>Para enviar comandos AT, conectamos RX con RX y TX con TX directamente para que la computadora hable con el módulo pasando de largo el microcontrolador.</span>
            </div>
          </div>
        )}

        {/* STEP 3: Connect to USB */}
        {activeStep === 3 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Power size={18} />
              Paso 3: Conectar a la Aplicación
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
              Para enviarle la nueva configuración al módulo, necesitamos conectar esta aplicación a tu Arduino a través del cable USB.
            </p>

            <div className="connection-box" style={{ alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
              {!isConnected ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--txt-primary)' }}>Conecta tu Puerto Serial</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--txt-muted)' }}>El tipo de conexión se forzará a USB automáticamente.</span>
                  </div>
                  <button 
                    onClick={handleConnectUSB}
                    className="btn btn-primary"
                    style={{ fontSize: '1rem', padding: '0.75rem 2rem', gap: '0.5rem' }}
                  >
                    <Power size={18} />
                    Conectar por USB
                  </button>
                </>
              ) : (
                <>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(19, 209, 141, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                    <Check size={24} color="var(--clr-green)" />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--clr-green)' }}>¡Conectado Exitosamente!</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--txt-muted)' }}>Ya puedes pasar al último paso.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Configuration Form */}
        {activeStep === 4 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--clr-yellow)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-yellow)' }}>
                Paso 4: Configurar Módulo
              </h3>
            </div>
            
            <div className="wiring-grid">
              {/* Form Input */}
              <div className="connection-box" style={{ gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)' }}>{t.btNameLabel}</label>
                  <input
                    type="text"
                    value={btName}
                    onChange={(e) => setBtName(e.target.value.toUpperCase().replace(/\s/g, '-'))}
                    placeholder={t.btNamePlaceholder}
                    className="form-input"
                    disabled={isProgramming}
                    style={{ fontSize: '1rem', padding: '0.5rem 0.75rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>
                    Sin espacios. Máx. 20 caracteres.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)' }}>{t.btPinLabel}</label>
                  <input
                    type="text"
                    value={btPin}
                    onChange={(e) => setBtPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder={t.btPinPlaceholder}
                    className="form-input"
                    disabled={isProgramming}
                    style={{ fontSize: '1rem', padding: '0.5rem 0.75rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>
                    Solo 4 números (ej. 1234).
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)' }}>Versión del Módulo (Si la normal falla)</label>
                  <select
                    value={btModuleType}
                    onChange={(e) => setBtModuleType(e.target.value)}
                    className="form-input"
                    disabled={isProgramming}
                    style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem', appearance: 'auto', background: 'var(--bg-card)' }}
                  >
                    <option value="classic">HC-06 Clásico (Sin enter)</option>
                    <option value="crlf">HC-06 Nuevo v3.0 (Con enter)</option>
                    <option value="hc05">HC-05 o Genérico (Signo = y enter)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>
                    Intenta con las otras versiones si el proceso se queda atascado o si en tu celular sigue apareciendo como "HC-06".
                  </span>
                </div>

                <button
                  onClick={startProgramming}
                  disabled={isProgramming || !isConnected}
                  className="btn btn-primary"
                  style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem', height: '42px', fontSize: '1rem' }}
                >
                  <Cpu size={18} />
                  {t.btnProgram}
                </button>
              </div>

              {/* Terminal Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--txt-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Terminal size={16} />
                  {t.programmingLog}
                </span>
                
                <div style={{
                  background: '#020408', border: '1px solid var(--border-subtle)', borderRadius: '8px',
                  height: '100%', minHeight: '180px', overflowY: 'auto', padding: '0.75rem',
                  fontFamily: 'var(--font-mono)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem'
                }}>
                  {progLogs.length === 0 && (
                    <span style={{ color: 'var(--txt-muted)', fontStyle: 'italic' }}>
                      Esperando inicio del proceso...
                    </span>
                  )}
                  {progLogs.map((log, index) => {
                    let color = 'var(--txt-muted)';
                    if (log.type === 'send') color = 'var(--clr-yellow)';
                    else if (log.type === 'recv') color = 'var(--clr-cyan)';
                    else if (log.type === 'success') color = 'var(--clr-green)';
                    else if (log.type === 'err') color = 'var(--clr-red)';
                    
                    return (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', color }}>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>[{log.time}]</span>
                        <span style={{ wordBreak: 'break-word' }}>{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: 'auto' }}>
        <button
          onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
          disabled={activeStep === 1 || isProgramming}
          className="btn btn-secondary"
          style={{ height: '36px', fontSize: '0.85rem', gap: '0.3rem' }}
        >
          <ArrowLeft size={14} />
          Anterior
        </button>

        <span style={{ fontSize: '0.85rem', color: 'var(--txt-muted)', display: 'flex', alignItems: 'center' }}>
          Paso {activeStep} de {totalSteps}
        </span>

        {activeStep < totalSteps ? (
          <button
            onClick={() => setActiveStep(prev => Math.min(totalSteps, prev + 1))}
            disabled={(activeStep === 3 && !isConnected)} // Block going to step 4 if not connected
            className="btn btn-primary"
            style={{ height: '36px', fontSize: '0.85rem', gap: '0.3rem' }}
          >
            Siguiente
            <ArrowRight size={14} />
          </button>
        ) : (
          <div style={{ width: '90px' }} />
        )}
      </div>

    </div>
  );
}
