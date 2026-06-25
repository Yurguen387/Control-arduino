import React, { useState, useEffect } from 'react';
import { 
  Info, HelpCircle, HardDrive, Cpu, Bluetooth, Network, 
  ArrowRight, ShieldCheck, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';

export default function ConnectionGuide({ t, activeLesson, connectionType, lang, setActiveTab }) {
  const [activeStep, setActiveStep] = useState(1);
  const [selectedMetaphor, setSelectedMetaphor] = useState(null);

  const isBluetooth = connectionType === 'bluetooth';

  // Reset active step when connection type changes
  useEffect(() => {
    setActiveStep(1);
    setSelectedMetaphor(null);
  }, [connectionType]);

  const steps = isBluetooth ? [
    { id: 1, label: lang === 'es' ? '1. Conectar Cables' : '1. Wire Circuit', icon: <HardDrive size={18} />, color: 'var(--clr-cyan)' },
    { id: 2, label: lang === 'es' ? '2. Escribir Código' : '2. Write Code', icon: <Cpu size={18} />, color: 'var(--clr-purple)' },
    { id: 3, label: lang === 'es' ? '3. Vincular Bluetooth' : '3. Pair Bluetooth', icon: <Bluetooth size={18} />, color: 'var(--clr-yellow)' },
    { id: 4, label: lang === 'es' ? '4. Enlazar App' : '4. Connect App', icon: <Network size={18} />, color: 'var(--clr-green)' }
  ] : [
    { id: 1, label: lang === 'es' ? '1. Conectar USB' : '1. Connect USB', icon: <HardDrive size={18} />, color: 'var(--clr-cyan)' },
    { id: 2, label: lang === 'es' ? '2. Cargar Código' : '2. Load Code', icon: <Cpu size={18} />, color: 'var(--clr-purple)' },
    { id: 3, label: lang === 'es' ? '3. Enlazar App' : '3. Connect App', icon: <Network size={18} />, color: 'var(--clr-green)' }
  ];

  const showMetaphor = (type) => {
    switch (type) {
      case 'RX': setSelectedMetaphor(t.metaphorRx); break;
      case 'TX': setSelectedMetaphor(t.metaphorTx); break;
      case 'VCC': setSelectedMetaphor(t.metaphorVcc); break;
      case 'GND': setSelectedMetaphor(t.metaphorGnd); break;
      default: setSelectedMetaphor(null);
    }
  };

  const bluetoothWiring = [
    { pin: '5V', componentPin: lang === 'es' ? 'VCC (Alimentación)' : 'VCC (Power)' },
    { pin: 'GND', componentPin: lang === 'es' ? 'GND (Tierra)' : 'GND (Ground)' },
    { pin: 'Pin 0 (RX)', componentPin: lang === 'es' ? 'TXD (Transmisor)' : 'TXD (Transmit)' },
    { pin: 'Pin 1 (TX)', componentPin: lang === 'es' ? 'RXD (Receptor a través de divisor de voltaje)' : 'RXD (Receive through voltage divider)' }
  ];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Header Info */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--clr-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
          <BookOpen size={22} />
          {isBluetooth 
            ? (lang === 'es' ? 'Guía de Conexión Bluetooth del Circuito' : 'Bluetooth Circuit Connection Guide')
            : (lang === 'es' ? 'Guía de Conexión por Cable USB' : 'USB Cable Connection Guide')}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
          {isBluetooth 
            ? (lang === 'es' ? 'Sigue estos pasos para cablear tu módulo Bluetooth HC-06, vincularlo con el sistema y controlarlo de forma inalámbrica.' : 'Follow these steps to wire your HC-06 Bluetooth module, pair it with the OS, and control it wirelessly.')
            : (lang === 'es' ? 'Sigue estos pasos para conectar tu Arduino por cable USB a la computadora y cargar tu código para comunicación por puerto serie.' : 'Follow these steps to connect your Arduino via USB cable to the computer and upload your code for serial communication.')}
        </p>
      </div>

      {/* Steps Tab Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.15)',
        padding: '0.4rem',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)'
      }}>
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className="btn"
              style={{
                flexGrow: 1,
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                borderColor: isActive ? step.color : 'transparent',
                color: isActive ? 'var(--txt-primary)' : 'var(--txt-muted)',
                gap: '0.4rem',
                borderLeftWidth: isActive ? '3px' : '1px',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem'
              }}
            >
              {step.icon}
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Step Panels */}
      <div style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* ==================== BLUETOOTH FLOW STEP PANELS ==================== */}
        {isBluetooth && (
          <>
            {/* STEP 1: HARDWARE WIRING */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HardDrive size={18} color="var(--clr-cyan)" />
                    {t.gStep1Title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {t.gStep1Desc}
                  </p>
                </div>

                {/* Bluetooth Configuration Warning Box */}
                <div style={{
                  background: 'rgba(255, 232, 112, 0.08)',
                  border: '1.5px solid var(--clr-yellow)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}>
                  <AlertCircle size={20} color="var(--clr-yellow)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--clr-yellow)', marginBottom: '0.25rem' }}>
                      {t.btWarningTitle}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)', lineHeight: '1.4' }}>
                      {t.btWarningDesc}
                    </p>
                  </div>
                </div>

                {/* Pin Metaphor Explorers */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)', fontWeight: 600, display: 'block', width: '100%', marginBottom: '0.2rem' }}>
                    💡 Toca cada pin para descubrir qué significa en nuestro circuito:
                  </span>
                  <button onClick={() => showMetaphor('VCC')} className="badge cursor-pointer" style={{ background: 'rgba(255, 51, 102, 0.1)', color: 'var(--clr-red)', border: '1px solid rgba(255, 51, 102, 0.2)', cursor: 'pointer' }}>VCC (Alimentación)</button>
                  <button onClick={() => showMetaphor('GND')} className="badge cursor-pointer" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer' }}>GND (Tierra)</button>
                  <button onClick={() => showMetaphor('RX')} className="badge cursor-pointer" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--clr-cyan)', border: '1px solid rgba(0, 242, 254, 0.2)', cursor: 'pointer' }}>RX (Oído)</button>
                  <button onClick={() => showMetaphor('TX')} className="badge cursor-pointer" style={{ background: 'rgba(255, 183, 3, 0.1)', color: 'var(--clr-yellow)', border: '1px solid rgba(255, 183, 3, 0.2)', cursor: 'pointer' }}>TX (Boca)</button>

                  {selectedMetaphor && (
                    <div className="animate-fade-in" style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderLeft: '2px solid var(--clr-cyan)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>
                      {selectedMetaphor}
                    </div>
                  )}
                </div>

                {/* Pin Diagram Grid */}
                <div className="wiring-grid">
                  
                  {/* Connections Table */}
                  <div className="connection-box" style={{ justifyContent: 'center' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 12px', color: 'var(--txt-muted)' }}>{t.gStep1TablePin}</th>
                          <th style={{ padding: '6px 12px', color: 'var(--txt-muted)' }}>
                            {t.gStep1TableBT.includes('en el') ? 'Pin en el Componente' : 'Pin on the Component'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bluetoothWiring.map((w, idx) => {
                          let pinClass = 'pin-tx';
                          const pinLower = w.pin.toLowerCase();
                          if (pinLower.includes('5v')) {
                            pinClass = 'pin-vcc';
                          } else if (pinLower.includes('gnd')) {
                            pinClass = 'pin-gnd';
                          } else if (pinLower.includes('pin 2')) {
                            pinClass = 'pin-rx';
                          }
                          
                          return (
                            <tr key={idx} style={{ borderBottom: idx < bluetoothWiring.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              <td style={{ padding: '6px 12px' }}>
                                <span className={`highlight-pin ${pinClass}`}>{w.pin}</span>
                              </td>
                              <td style={{ padding: '6px 12px', color: 'var(--txt-secondary)' }}>
                                {w.componentPin}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cable Drawing Layout */}
                  <div className="connection-box text-center" style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div className="diagram-container">
                      
                      {/* Arduino Card */}
                      <div style={{ background: '#122035', border: '1.5px solid var(--clr-blue)', borderRadius: '8px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '95px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--clr-blue)', fontWeight: 'bold', textTransform: 'uppercase' }}>Cerebro</span>
                        <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem', textAlign: 'left' }}>
                          <div style={{ color: 'var(--clr-red)' }}>🔴 5V</div>
                          <div style={{ color: '#fff' }}>⚪ GND</div>
                          <div style={{ color: 'var(--clr-cyan)' }}>🔵 Pin 0 (RX)</div>
                          <div style={{ color: 'var(--clr-yellow)' }}>🟡 Pin 1 (TX)</div>
                        </div>
                      </div>

                      {/* Wires */}
                      <div className="diagram-arrows" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--txt-muted)', fontSize: '0.7rem' }}>
                        <div className="diagram-arrow">───▶</div>
                        <div className="diagram-arrow">◀───</div>
                      </div>

                      {/* HC-06 Card */}
                      <div style={{ background: '#141c28', border: '1.5px solid var(--clr-cyan)', borderRadius: '8px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '95px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--clr-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>Bluetooth</span>
                        <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem', textAlign: 'left' }}>
                          <div style={{ color: 'var(--clr-red)' }}>VCC 🔴</div>
                          <div style={{ color: '#fff' }}>GND ⚪</div>
                          <div style={{ color: 'var(--clr-cyan)' }}>TXD 🔵</div>
                          <div style={{ color: 'var(--clr-yellow)' }}>RXD 🟡</div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Protective Shield Caution */}
                <div style={{
                  background: 'rgba(255, 51, 102, 0.06)',
                  border: '1px solid rgba(255, 51, 102, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  gap: '0.75rem'
                }}>
                  <AlertCircle size={18} color="var(--clr-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-red)', display: 'block', marginBottom: '0.2rem' }}>
                      🛡️ ¡Usa el Escudo Protector! (Divisor de Voltaje)
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--txt-secondary)', lineHeight: '1.4' }}>
                      {t.gStep1Caution}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ARDUINO PROGRAMMING */}
            {activeStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-purple)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={18} color="var(--clr-purple)" />
                    {t.gStep2Title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {t.gStep2Desc}
                  </p>
                </div>

                <div className="connection-box">
                  <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(157, 78, 221, 0.1)', border: '1px solid var(--clr-purple)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--clr-purple)', fontWeight: 'bold' }}>
                      {lang === 'es' ? '⚙️ Opcional: Configurar Módulo Bluetooth' : '⚙️ Optional: Configure Bluetooth Module'}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)', lineHeight: '1.4' }}>
                      {lang === 'es' 
                        ? 'Si deseas cambiar el nombre (ej. ROBOT-01) y la contraseña (PIN) de tu módulo Bluetooth, hazlo ahora usando el Configurador antes de subir el código de tu lección.'
                        : 'If you want to change the name (e.g., ROBOT-01) and PIN of your Bluetooth module, do it now using the Configurator before uploading your lesson code.'}
                    </p>
                    <button
                      onClick={() => setActiveTab('configurator')}
                      className="btn btn-primary"
                      style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                    >
                      {lang === 'es' ? 'Abrir Configurador Bluetooth' : 'Open Bluetooth Configurator'}
                    </button>
                  </div>

                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--txt-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: '1.5' }}>
                    <li>{t.gStep2List1}</li>
                    <li>{t.gStep2List2}</li>
                    <li>{t.gStep2List3}</li>
                    <li>{t.gStep2List4}</li>
                    <li>{t.gStep2List5}</li>
                  </ol>
                </div>
              </div>
            )}

            {/* STEP 3: OS BLUETOOTH */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-yellow)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bluetooth size={18} color="var(--clr-yellow)" />
                    {t.gStep3Title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {t.gStep3Desc}
                  </p>
                </div>

                <div className="wiring-grid">
                  <div className="connection-box">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--clr-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                      💻 Windows
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--txt-secondary)', lineHeight: '1.4', marginTop: '0.25rem' }}>
                      {t.gStep3WinList}
                    </p>
                  </div>

                  <div className="connection-box">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--clr-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                      🍎 macOS
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--txt-secondary)', lineHeight: '1.4', marginTop: '0.25rem' }}>
                      {t.gStep3MacList}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: SOFTWARE CONNECTION */}
            {activeStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-green)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Network size={18} color="var(--clr-green)" />
                    {t.gStep4Title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {t.gStep4Desc}
                  </p>
                </div>

                <div className="connection-box">
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--txt-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: '1.5', listStyleType: 'square' }}>
                    <li>{t.gStep4List1}</li>
                    <li>{lang === 'es' ? 'Verifica los Baudios: Asegúrate de que esté configurado a 9600 baudios tanto en el Arduino como en la app.' : 'Verify Baud Rate: Ensure it is set to 9600 bps on both the Arduino sketch and the app.'}</li>
                    <li>{t.gStep4List3}</li>
                    <li>{t.gStep4List4}</li>
                    <li style={{ marginTop: '0.5rem', listStyleType: 'none', background: 'rgba(19, 209, 141, 0.06)', border: '1px solid rgba(19, 209, 141, 0.3)', borderRadius: '6px', padding: '0.6rem 0.75rem', color: 'var(--clr-green)' }}>
                      <strong>{lang === 'es' ? '🔌 ¿Qué ocurre al conectarse?' : '🔌 What happens upon connection?'}</strong><br/>
                      {lang === 'es' 
                        ? 'Establecerás un puente de comunicación bidireccional:\n• En el PANEL DE CONTROL verás a los indicadores (gráficos, medidores, radar) reaccionar a las lecturas del Arduino, y podrás pulsar botones o joysticks para mandar órdenes físicas.\n• En la TERMINAL SERIAL podrás escribir comandos manuales directos y ver el texto crudo enviado por tu programa para diagnosticar errores.'
                        : 'You will establish a bi-directional communication bridge:\n• In the CONTROL PANEL, you will see gauges, charts, and radar update dynamically based on sensor data, and you can click buttons or drag joysticks to send physical commands.\n• In the SERIAL TERMINAL, you can send manual text commands and view raw serial logs printed by your sketch to troubleshoot errors.'}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== USB CABLE FLOW STEP PANELS ==================== */}
        {!isBluetooth && (
          <>
            {/* STEP 1: PHYSICAL CABLE WIRING */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HardDrive size={18} color="var(--clr-cyan)" />
                    {lang === 'es' ? 'Conecta tu Arduino por Cable USB' : 'Connect your Arduino via USB Cable'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {lang === 'es' 
                      ? 'Conecta tu placa Arduino Uno a la computadora usando el cable USB estándar. Este cable suministra energía eléctrica al Arduino y a sus sensores, y crea un puerto COM virtual para intercambiar telemetría.'
                      : 'Connect your Arduino Uno board to the computer using the standard USB cable. This cable provides power to the Arduino and its sensors, and creates a virtual COM port to exchange telemetry data.'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {/* Cable Drawing Layout (USB connection) */}
                  <div className="connection-box text-center" style={{ justifyContent: 'center', alignItems: 'center', padding: '1.5rem', width: '100%', maxWidth: '600px' }}>
                    <div className="diagram-container">
                      
                      {/* PC Card */}
                      <div style={{ background: '#141c28', border: '1.5px solid var(--clr-cyan)', borderRadius: '8px', padding: '0.5rem 1rem', textAlign: 'center', minWidth: '120px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--clr-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>Computadora</span>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--txt-secondary)' }}>
                          🖥️ Puerto USB
                        </div>
                      </div>

                      {/* USB Cable */}
                      <div className="diagram-arrows" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--txt-muted)', fontSize: '0.75rem', padding: '0 1rem' }}>
                        <div style={{ color: 'var(--clr-cyan)', fontWeight: 'bold' }}>🌐 Cable USB</div>
                        <div className="diagram-arrow">◀──────────▶</div>
                      </div>

                      {/* Arduino Card */}
                      <div style={{ background: '#122035', border: '1.5px solid var(--clr-blue)', borderRadius: '8px', padding: '0.5rem 1rem', textAlign: 'center', minWidth: '120px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--clr-blue)', fontWeight: 'bold', textTransform: 'uppercase' }}>Arduino Uno</span>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--txt-secondary)' }}>
                          🔌 Puerto USB
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: LOAD CODE */}
            {activeStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-purple)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={18} color="var(--clr-purple)" />
                    {lang === 'es' ? 'Carga la programación a tu Arduino' : 'Upload code to your Arduino'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {lang === 'es' 
                      ? 'El Arduino Uno necesita el programa cargado para responder a los mandos de la computadora y mandarle telemetría.'
                      : 'The Arduino Uno board needs the programming sketch uploaded to respond to control commands and transmit telemetry data.'}
                  </p>
                </div>

                <div className="connection-box">
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--txt-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: '1.5' }}>
                    <li>{lang === 'es' ? 'Obtén o copia el código de programación desde el "Tutor Socrático" para tu lección.' : 'Obtain or copy the programming code from the "Socratic Tutor" tab for your current lesson.'}</li>
                    <li>{lang === 'es' ? 'Pégalo en un nuevo sketch vacío en el software oficial Arduino IDE en tu computadora.' : 'Paste it into a blank workspace in the official Arduino IDE software on your computer.'}</li>
                    <li>{lang === 'es' ? 'Conecta tu Arduino Uno a la computadora con el cable USB.' : 'Connect your Arduino Uno to the computer using the USB cable.'}</li>
                    <li>{lang === 'es' ? 'En el menú superior de Arduino IDE, ve a Herramientas > Placa y selecciona "Arduino Uno". Luego ve a Herramientas > Puerto y marca el puerto COM detectado.' : 'In the top menu of Arduino IDE, go to Tools > Board and select "Arduino Uno". Then go to Tools > Port and check the detected COM port.'}</li>
                    <li>{lang === 'es' ? 'Presiona el botón "Subir" (flecha a la derecha) en Arduino IDE. Espera a que diga "Subido" sin errores.' : 'Click the "Upload" button (right arrow icon) in Arduino IDE. Wait until it shows "Done uploading" with no error messages.'}</li>
                  </ol>
                </div>
              </div>
            )}

            {/* STEP 3: CONNECT APP */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-green)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Network size={18} color="var(--clr-green)" />
                    {lang === 'es' ? 'Abre la conexión en la Aplicación' : 'Open the connection in the App'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', lineHeight: '1.5' }}>
                    {lang === 'es' 
                      ? 'Iniciemos la comunicación serial por cable de forma inmediata.'
                      : 'Let\'s start the serial cable communication immediately.'}
                  </p>
                </div>

                <div className="connection-box">
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--txt-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: '1.5', listStyleType: 'square' }}>
                    <li>{lang === 'es' ? 'En la parte superior, verifica que el selector de Tipo esté en "🔌 USB (Cable)".' : 'In the top header, verify that the Type selector is set to "🔌 USB (Cable)".'}</li>
                    <li>{lang === 'es' ? 'Asegúrate de que la velocidad esté configurada en "9600" baudios (velocidad estándar usada en las clases).' : 'Make sure the Baud Rate is configured to "9600" bps (standard speed used in classroom sketches).'}</li>
                    <li>{lang === 'es' ? 'Haz clic en el botón rojo "Conectar". En la ventana emergente que mostrará el navegador, selecciona el puerto COM de tu Arduino Uno.' : 'Click the red "Connect" button. In the browser popup window, select the COM port matching your Arduino Uno.'}</li>
                    <li>{lang === 'es' ? 'Haz clic en "Conectar" en la ventana del navegador. El botón cambiará a verde ("Desconectar") y verás la telemetría fluir en tiempo real.' : 'Click "Connect" inside the browser dialog. The button will change to green ("Disconnect") and you will see telemetry start flowing.'}</li>
                    <li style={{ marginTop: '0.5rem', listStyleType: 'none', background: 'rgba(19, 209, 141, 0.06)', border: '1px solid rgba(19, 209, 141, 0.3)', borderRadius: '6px', padding: '0.6rem 0.75rem', color: 'var(--clr-green)' }}>
                      <strong>{lang === 'es' ? '🔌 ¿Qué ocurre al conectarse?' : '🔌 What happens upon connection?'}</strong><br/>
                      {lang === 'es' 
                        ? 'Establecerás un puente de comunicación bidireccional:\n• En el PANEL DE CONTROL verás a los indicadores (gráficos, medidores, radar) reaccionar a las lecturas del Arduino, y podrás pulsar botones o joysticks para mandar órdenes físicas.\n• En la TERMINAL SERIAL podrás escribir comandos manuales directos y ver el texto crudo enviado por tu programa para diagnosticar errores.'
                        : 'You will establish a bi-directional communication bridge:\n• In the CONTROL PANEL, you will see gauges, charts, and radar update dynamically based on sensor data, and you can click buttons or drag joysticks to send physical commands.\n• In the SERIAL TERMINAL, you can send manual text commands and view raw serial logs printed by your sketch to troubleshoot errors.'}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Step Navigation controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: 'auto' }}>
        <button
          onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
          disabled={activeStep === 1}
          className="btn btn-secondary"
          style={{ height: '34px', fontSize: '0.8rem' }}
        >
          {lang === 'es' ? 'Atrás' : 'Back'}
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', display: 'flex', alignItems: 'center' }}>
          {lang === 'es' 
            ? `Paso ${activeStep} de ${steps.length}` 
            : `Step ${activeStep} of ${steps.length}`}
        </span>

        {activeStep < steps.length ? (
          <button
            onClick={() => setActiveStep(prev => Math.min(steps.length, prev + 1))}
            className="btn btn-primary"
            style={{ height: '34px', fontSize: '0.8rem', gap: '0.3rem' }}
          >
            {lang === 'es' ? 'Siguiente' : 'Next'}
            <ArrowRight size={12} />
          </button>
        ) : (
          <div style={{ width: '80px' }} />
        )}
      </div>

    </div>
  );
}
