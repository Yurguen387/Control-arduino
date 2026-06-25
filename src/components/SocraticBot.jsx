import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, Code, Copy, Check, Plus, Trash2, Cpu, HelpCircle, AlertTriangle } from 'lucide-react';
import { lessonsDatabase } from '../utils/lessonsDatabase';

export default function SocraticBot({
  t,
  activeLesson,
  selectedGrade,
  setSelectedGrade,
  selectedLessonIdx,
  setSelectedLessonIdx,
  lang
}) {
  const [activeTab, setActiveTab] = useState('prompt_builder'); // 'prompt_builder' | 'debugger' | 'dialogue_explorer'
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);

  // Socratic Lesson Tree State
  const [socraticNode, setSocraticNode] = useState(null);

  // Prompt Builder Wizard States
  const [promptStep, setPromptStep] = useState(0); // 0: Start, 1: Placa, 2: Componente, 3: Pines, 4: Accion, 5: Done
  const [builderData, setBuilderData] = useState({
    placa: '',
    componente: '',
    pines: '',
    accion: ''
  });

  // Debugger Wizard States
  const [debugStep, setDebugStep] = useState(0); // 0: Start, 1: Symptom, 2: Diagnosis, 3: Done
  const [symptom, setSymptom] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosticOptions, setDiagnosticOptions] = useState([]);

  const chatEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Reset wizard on active lesson change
  useEffect(() => {
    resetWizard();
  }, [activeLesson.id]);

  const addMessage = (sender, text) => {
    setChatMessages(prev => [...prev, { sender, text }]);
  };

  const getGradeLabel = () => {
    switch (selectedGrade) {
      case 'seventh': return lang === 'es' ? '7mo Grado' : '7th Grade';
      case 'eighth': return lang === 'es' ? '8vo Grado' : '8th Grade';
      case 'ninth': return lang === 'es' ? '9no Grado' : '9th Grade';
      default: return '';
    }
  };

  const getFirstMessagePrefix = () => {
    const gradeLabel = getGradeLabel();
    const lessonTitle = activeLesson.title;
    return `[${gradeLabel} | ${lang === 'es' ? 'Clase' : 'Lesson'}: ${lessonTitle}]\n\n`;
  };

  // --- SOCRATIC LESSON DIALOGUE LOGIC ---
  const startLessonSocratic = () => {
    setPromptStep(0);
    setDebugStep(0);
    setSocraticNode('start');
    const startNode = activeLesson.socraticTree.start;
    setChatMessages([
      { sender: 'bot', text: getFirstMessagePrefix() + startNode.text }
    ]);
  };

  const handleSocraticOptionClick = (option) => {
    addMessage('student', option.text);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const nextKey = option.nextNode;
      const nextNode = activeLesson.socraticTree[nextKey];

      if (nextNode) {
        setSocraticNode(nextKey);
        addMessage('bot', nextNode.text);
        
        // If it is a leaf node containing a code snippet, we show the code block!
        if (nextNode.code) {
          setChatMessages(prev => [...prev, { sender: 'code_box', text: nextNode.code }]);
        }
      } else {
        addMessage('bot', '¡Felicidades! Has completado el diálogo socrático para esta lección.');
        setSocraticNode(null);
      }
    }, 800);
  };

  // --- PROMPT BUILDER LOGIC ---
  const startPromptBuilder = () => {
    setSocraticNode(null);
    setDebugStep(0);
    setPromptStep(1);
    setChatMessages([
      { sender: 'bot', text: getFirstMessagePrefix() + '¡Hola, explorador! Vamos a diseñar el PROMPT perfecto para que una Inteligencia Artificial te dé el código correcto a la primera. \n\nPara empezar: ¿Con qué placa o "cerebro" estás trabajando en tu mesa?' }
    ]);
  };

  const handlePlacaSelect = (placa) => {
    setBuilderData(prev => ({ ...prev, placa }));
    addMessage('student', `Estoy usando la placa: ${placa}`);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setPromptStep(2);
      addMessage('bot', `¡Perfecto! Un ${placa} es una excelente opción. \n\nAhora, ¿qué sensor o actuador quieres conectar hoy?`);
    }, 800);
  };

  const handleComponenteSelect = (componente) => {
    setBuilderData(prev => ({ ...prev, componente }));
    addMessage('student', `Quiero conectar un: ${componente}`);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setPromptStep(3);
      addMessage('bot', `Excelente, un ${componente}. Para poder programarlo, debemos saber en qué puertos está cableado.\n\n¿A qué pines físicos (digitales o analógicos) lo tienes conectado en tu placa? (Escríbelo abajo)`);
    }, 800);
  };

  const handlePinesSubmit = (pinesText) => {
    if (!pinesText.trim()) return;
    setBuilderData(prev => ({ ...prev, pines: pinesText }));
    addMessage('student', `Está conectado en: ${pinesText}`);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setPromptStep(4);
      addMessage('bot', `¡Entendido! Anotado: pines ${pinesText}.\n\nPor último, cuéntame con tus propias palabras: ¿Qué quieres que haga este componente exactamente? (Ej: 'Que parpadee rápido', 'Que gire el motor de 0 a 180 grados', 'Que me muestre la temperatura en pantalla').`);
    }, 800);
  };

  const handleAccionSubmit = (accionText) => {
    if (!accionText.trim()) return;
    const finalData = { ...builderData, accion: accionText };
    setBuilderData(finalData);
    addMessage('student', `Quiero que haga: ${accionText}`);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setPromptStep(5);
      
      const promptCompiled = `Tengo una placa ${finalData.placa} programada en el entorno Arduino IDE (C++). He conectado un ${finalData.componente} a los pines ${finalData.pines}. Por favor, escribe un código de programación limpio, ordenado y completamente comentado en español que haga lo siguiente de forma continua: "${finalData.accion}". Incluye notas en los comentarios explicando el conexionado eléctrico.`;
      
      addMessage('bot', `¡Impresionante! Has estructurado el contexto completo. Si solo hubieras dicho "dame un código para una rueda", la IA podría haberte dado algo que no sirve en tu circuito. \n\nAl especificar la placa, el componente, los pines y la acción, obtendrás el código correcto a la primera. Aquí tienes tu prompt perfecto:`);
      
      // We append a special message that will render the prompt box
      setChatMessages(prev => [...prev, { sender: 'prompt_box', text: promptCompiled }]);
    }, 1000);
  };

  // --- DEBUGGER WIZARD LOGIC ---
  const startDebugger = () => {
    setSocraticNode(null);
    setPromptStep(0);
    setDebugStep(1);
    setChatMessages([
      { sender: 'bot', text: getFirstMessagePrefix() + '¡Hola! Bienvenido al asistente de diagnóstico socrático. Cuando algo no funciona, los ingenieros no adivinan; hacen preguntas ordenadas.\n\n¿Qué síntoma o error está presentando tu circuito en este momento?' }
    ]);
  };

  const handleSymptomSelect = (selectedSymptom) => {
    setSymptom(selectedSymptom);
    addMessage('student', `Síntoma: ${selectedSymptom}`);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setDebugStep(2);

      if (selectedSymptom.includes('subir el código')) {
        addMessage('bot', 'El error de carga es un clásico. ¿Has desconectado el cable de datos (RX/TX) o el de alimentación (VCC) del módulo Bluetooth antes de presionar "Subir" en el Arduino IDE?');
        setDiagnosticOptions([
          { text: 'No, los dejé conectados en los pines 0 y 1', action: 'rx_tx_clash' },
          { text: 'Sí, los desconecté y aun así falla la subida', action: 'other_pines' }
        ]);
      } 
      else if (selectedSymptom.includes('símbolos raros')) {
        addMessage('bot', 'Cuando aparecen símbolos raros o basura en la terminal, hay un problema de "sintonía". ¿La velocidad (Baudios) de tu código en Arduino (ej: Serial.begin(9600)) coincide exactamente con la velocidad seleccionada en la esquina del Monitor Serial?');
        setDiagnosticOptions([
          { text: 'No coinciden o no estoy seguro', action: 'baud_mismatch' },
          { text: 'Sí, ambas velocidades coinciden', action: 'cabling_noise' }
        ]);
      }
      else if (selectedSymptom.includes('no encienden')) {
        addMessage('bot', 'Revisemos el flujo de energía. ¿El pequeño foco (LED) de tu sensor o de tu placa Arduino se encuentra encendido o parpadeando?');
        setDiagnosticOptions([
          { text: 'No enciende ningún foco', action: 'no_power' },
          { text: 'Sí encienden los focos, pero no responde', action: 'wrong_pins' }
        ]);
      }
      else if (selectedSymptom.includes('no giran')) {
        addMessage('bot', 'Los motores necesitan mucha fuerza. ¿Cómo estás alimentando tus motores en el puente H L298N?');
        setDiagnosticOptions([
          { text: 'Los conecté directo al pin de 5V del Arduino', action: 'arduino_power_clash' },
          { text: 'Uso una batería externa (como una pila de 9V o cargador)', action: 'battery_ground' }
        ]);
      }
    }, 800);
  };

  const handleDiagnosisResponse = (option) => {
    addMessage('student', option.text);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setDebugStep(3);

      let diagnosis = '';

      if (option.action === 'rx_tx_clash') {
        diagnosis = 'DIAGNÓSTICO: ¡Conflicto de puerto Serial! Los pines 0 y 1 son los mismos que usa el cable USB para subir la programación. Si el módulo Bluetooth está conectado en esos pines, causa un choque con la carga. \n\nSOLUCIÓN: Desconecta temporalmente el cable VCC (alimentación) o los cables de datos RX/TX del módulo Bluetooth antes de presionar "Subir" en el Arduino IDE. Una vez completada la carga ("Subido con éxito"), vuelve a conectarlos para iniciar la transmisión.';
      } 
      else if (option.action === 'other_pines') {
        diagnosis = 'DIAGNÓSTICO: Si los pines están bien, el error suele ser de comunicación USB o software. \n\nSOLUCIÓN:\n1. Desconecta el cable USB del Arduino y conéctalo en otro puerto de la computadora.\n2. Abre Arduino IDE y ve a Herramientas > Puerto para asegurarte de que el puerto COM correcto esté seleccionado con una palomita.\n3. Asegúrate de tener seleccionada la placa correcta en Herramientas > Placa > Arduino Uno.';
      }
      else if (option.action === 'baud_mismatch') {
        diagnosis = 'DIAGNÓSTICO: Desajuste de velocidad de reloj (Baudios).\n\nSOLUCIÓN: Si tu Arduino tiene la instrucción Serial.begin(9600), asegúrate de que el monitor serial o la app que estás usando esté configurada exactamente a 9600 baudios. Si no coinciden, la computadora decodificará letras incorrectas.';
      }
      else if (option.action === 'cabling_noise') {
        diagnosis = 'DIAGNÓSTICO: Ruido eléctrico o mala conexión física.\n\nSOLUCIÓN: Los cables flojos o demasiado largos deforman las ondas digitales. Desconecta y presiona firmemente los cables del Bluetooth. Asegúrate también de que los pines RX y TX no estén tocando otras partes metálicas.';
      }
      else if (option.action === 'no_power') {
        diagnosis = 'DIAGNÓSTICO: Falta de alimentación eléctrica (GND/VCC sueltos).\n\nSOLUCIÓN: Verifica que el cable VCC del módulo esté conectado al pin de 5V del Arduino, y que el pin GND esté conectado a GND. ¡Los sensores necesitan corriente para poder encender!';
      }
      else if (option.action === 'wrong_pins') {
        diagnosis = 'DIAGNÓSTICO: Conflicto de declaración de pines en el código.\n\nSOLUCIÓN: Revisa tu sketch de programación. Si conectaste el cable de señal al Pin Digital 9 de la placa, asegúrate de que en el código hayas escrito digitalWrite(9, ...) o similar. Si declaras el Pin 8 pero cableas en el Pin 9, la orden nunca llegará.';
      }
      else if (option.action === 'arduino_power_clash') {
        diagnosis = 'DIAGNÓSTICO: Falta de corriente (Amperaje) para motores.\n\nSOLUCIÓN: El Arduino solo da energía para pensar (poca corriente). Si conectas motores de rueda directamente a su pin 5V, los motores se tragarán la corriente, el Arduino se apagará y el código dejará de correr.\n\nSOLUCIÓN: Conecta una batería externa al puente L298N para alimentar los motores. ¡MUY IMPORTANTE!: Conecta un cable común desde el pin GND del Arduino al GND de tu batería externa para que tengan la misma referencia.';
      }
      else if (option.action === 'battery_ground') {
        diagnosis = 'DIAGNÓSTICO: Polaridad o Giro inverso.\n\nSOLUCIÓN: Si los motores giran al lado contrario, no te preocupes: ¡solo intercambia de posición los dos cables del motor en las borneras del L298N! Si no giran nada, verifica que el GND de tu batería externa esté unido al GND del Arduino (tierra común).';
      }

      addMessage('bot', diagnosis);
    }, 1000);
  };

  const resetWizard = () => {
    setPromptStep(0);
    setDebugStep(0);
    setSocraticNode(null);
    setChatMessages([]);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Grade and Class Selector Bar */}
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', fontWeight: 500 }}>{lang === 'es' ? 'Grado:' : 'Grade:'}</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="form-input"
            style={{ height: '36px', fontSize: '0.85rem', padding: '0 2.5rem 0 0.75rem', cursor: 'pointer', backgroundPosition: 'right 0.5rem center' }}
          >
            <option value="seventh">{lang === 'es' ? '7mo Grado' : '7th Grade'}</option>
            <option value="eighth">{lang === 'es' ? '8vo Grado' : '8th Grade'}</option>
            <option value="ninth">{lang === 'es' ? '9no Grado' : '9th Grade'}</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)', fontWeight: 500 }}>{lang === 'es' ? 'Clase:' : 'Lesson:'}</span>
          <select
            value={selectedLessonIdx}
            onChange={(e) => setSelectedLessonIdx(parseInt(e.target.value, 10))}
            className="form-input"
            style={{ height: '36px', fontSize: '0.85rem', padding: '0 2.5rem 0 0.75rem', cursor: 'pointer', flexGrow: 1, maxWidth: '500px', backgroundPosition: 'right 0.5rem center' }}
          >
            {(lessonsDatabase[selectedGrade] || []).map((lesson, idx) => (
              <option key={lesson.id} value={idx}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="socratic-layout">
        
        {/* Left Column: Pedagogical Prompt Card & Helpful Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Quest Title Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--clr-cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-display)' }}>
              <Sparkles size={18} />
              Guía del Master Prompt
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--txt-secondary)', lineHeight: '1.4' }}>
              Para que una Inteligencia Artificial genere el circuito y código correctos al primer intento, usa esta estructura:
            </p>
            <ul style={{ fontSize: '0.73rem', color: 'var(--txt-muted)', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: '1.35' }}>
              <li><b>Rol Experto:</b> Indícale actuar como experto en Ciencias Computacionales, Mecatrónica o Electrónica.</li>
              <li><b>Placa:</b> Cuál microcontrolador usas (ej. Arduino Uno, ESP32).</li>
              <li><b>Componente:</b> Especifica el sensor/motor con su modelo exacto.</li>
              <li><b>Conexión:</b> Detalla a qué pines físicos conectaste cada señal.</li>
              <li><b>Lógica:</b> Qué quieres que haga el actuador paso a paso.</li>
            </ul>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.5rem',
              marginTop: '0.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--clr-cyan)', fontWeight: 'bold' }}>PLANTILLA RÁPIDA:</span>
                <button
                  onClick={() => handleCopy(`Actúa como un experto en Mecatrónica y Ciencias Computacionales. Escribe el código de Arduino para una placa [Placa]. Conecté un [Componente] a los pines: [Pines]. Quiero que haga esto: [Acción]. Incluye comentarios con el conexionado físico y eléctrico.`)}
                  className="btn btn-secondary"
                  style={{ height: '20px', fontSize: '0.65rem', padding: '0 0.3rem', gap: '0.2rem', background: 'rgba(255,255,255,0.03)' }}
                >
                  {copied ? <Check size={10} color="var(--clr-green)" /> : <Copy size={10} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.68rem',
                color: 'var(--txt-secondary)',
                margin: 0,
                lineHeight: '1.3',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                "Actúa como un experto en Mecatrónica y Ciencias Computacionales. Escribe el código de Arduino para una placa [Placa]. Conecté un [Componente] a los pines: [Pines]. Quiero que haga esto: [Acción]. Incluye comentarios con el conexionado."
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chat Dialogues */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '520px', gap: '1rem' }}>
          
          {/* Header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(157,78,221,0.15)',
                border: '1px solid var(--clr-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={16} color="var(--clr-purple)" />
              </div>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block' }}>
                  {lang === 'es' ? 'Sócrates: Asistente IA' : 'Socrates: AI Assistant'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>
                  {lang === 'es' ? 'Diseño de prompts y resolución de errores' : 'Prompt design & troubleshooting'}
                </span>
              </div>
            </div>

            {(promptStep > 0 || debugStep > 0 || socraticNode || chatMessages.length > 0) && (
              <button 
                onClick={resetWizard} 
                className="btn btn-danger" 
                style={{ height: '28px', fontSize: '0.75rem', padding: '0 0.75rem' }}
              >
                {lang === 'es' ? 'Limpiar Chat' : 'Clear Chat'}
              </button>
            )}
          </div>

          {/* Chat History Viewport */}
          <div style={{
            flexGrow: 1,
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            
            {chatMessages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', gap: '1rem' }}>
                <HelpCircle size={48} color="var(--txt-muted)" style={{ opacity: 0.4 }} />
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--txt-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    ¿Qué Misión quieres iniciar hoy con Sócrates?
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)', maxWidth: '380px', lineHeight: '1.4' }}>
                    Elige un rol abajo para aprender a formular preguntas claras para la IA o diagnosticar problemas de tu circuito.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
                  <button onClick={startLessonSocratic} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--clr-cyan), var(--clr-blue))', border: 'none', color: '#020408', fontWeight: 'bold', fontSize: '0.85rem', height: 'auto', minHeight: '38px', whiteSpace: 'normal', padding: '0.5rem 1rem' }}>
                    Misión de Lección: {activeLesson.title}
                  </button>
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={startPromptBuilder} className="btn btn-secondary" style={{ flexGrow: 1, fontSize: '0.8rem', height: 'auto', minHeight: '36px', whiteSpace: 'normal', padding: '0.5rem' }}>
                      Diseñar Prompt
                    </button>
                    <button onClick={startDebugger} className="btn btn-secondary" style={{ flexGrow: 1, fontSize: '0.8rem', height: 'auto', minHeight: '36px', borderColor: 'var(--clr-yellow)', color: 'var(--clr-yellow)', whiteSpace: 'normal', padding: '0.5rem' }}>
                      Depurar Circuito
                    </button>
                  </div>
                </div>
              </div>
            )}

            {chatMessages.map((msg, idx) => {
              const isBot = msg.sender === 'bot';
              const isPrompt = msg.sender === 'prompt_box';
              const isCode = msg.sender === 'code_box';
              
              if (isPrompt) {
                return (
                  <div key={idx} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0, 245, 212, 0.05)', border: '1px solid var(--clr-green)', borderRadius: '8px', padding: '0.75rem', margin: '0.5rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--clr-green)', fontWeight: 'bold' }}>TU PROMPT PERFECTO PARA LA IA:</span>
                      <button
                        onClick={() => handleCopy(msg.text)}
                        className="btn btn-secondary"
                        style={{ height: '24px', fontSize: '0.7rem', padding: '0 0.4rem', gap: '0.2rem' }}
                      >
                        {copied ? <Check size={12} color="var(--clr-green)" /> : <Copy size={12} />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--txt-secondary)', margin: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid var(--border-subtle)', lineHeight: '1.4' }}>
                      {msg.text}
                    </pre>
                  </div>
                );
              }

              if (isCode) {
                return (
                  <div key={idx} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(157, 78, 221, 0.05)', border: '1px solid var(--clr-purple)', borderRadius: '8px', padding: '0.75rem', margin: '0.5rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--clr-purple)', fontWeight: 'bold' }}>CÓDIGO RECOMENDADO ARDUINO:</span>
                      <button
                        onClick={() => handleCopy(msg.text)}
                        className="btn btn-secondary"
                        style={{ height: '24px', fontSize: '0.7rem', padding: '0 0.4rem', gap: '0.2rem' }}
                      >
                        {copied ? <Check size={12} color="var(--clr-green)" /> : <Copy size={12} />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--txt-secondary)', margin: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid var(--border-subtle)', lineHeight: '1.4' }}>
                      {msg.text}
                    </pre>
                  </div>
                );
              }

              return (
                <div key={idx} style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', width: '100%' }}>
                  <div style={{
                    maxWidth: '85%',
                    background: isBot ? 'rgba(22, 33, 50, 0.7)' : 'rgba(157, 78, 221, 0.12)',
                    border: `1px solid ${isBot ? 'var(--border-subtle)' : 'rgba(157, 78, 221, 0.25)'}`,
                    borderRadius: isBot ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    color: 'var(--txt-primary)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: isBot ? 'var(--clr-cyan)' : 'var(--clr-purple)', fontWeight: 'bold', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                      {isBot ? 'Sócrates' : 'Tú'}
                    </span>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(22, 33, 50, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '12px 12px 12px 2px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--txt-muted)', fontStyle: 'italic' }}>
                  Sócrates está escribiendo...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Option Selection Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            
            {/* PROMPT STEP 1: SELECT PLACA */}
            {promptStep === 1 && !isTyping && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['Arduino Uno', 'ESP32', 'Raspberry Pi Pico'].map((placa) => (
                  <button key={placa} onClick={() => handlePlacaSelect(placa)} className="btn btn-secondary animate-fade-in" style={{ flexGrow: 1, fontSize: '0.8rem', height: 'auto', minHeight: '36px', whiteSpace: 'normal', padding: '0.5rem' }}>
                    {placa}
                  </button>
                ))}
              </div>
            )}

            {/* PROMPT STEP 2: SELECT COMPONENTE */}
            {promptStep === 2 && !isTyping && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto' }}>
                {['Servomotor', 'Sensor Ultrasónico (Distancia)', 'Foco LED', 'Motores DC (L298N)', 'Sensor Infrarrojo', 'Sensor de Sonido'].map((comp) => (
                  <button key={comp} onClick={() => handleComponenteSelect(comp)} className="btn btn-secondary animate-fade-in" style={{ flexGrow: 1, fontSize: '0.75rem', padding: '0.5rem', height: 'auto', minHeight: '34px', whiteSpace: 'normal' }}>
                    {comp}
                  </button>
                ))}
              </div>
            )}

            {/* PROMPT STEP 3: INPUT PINES */}
            {promptStep === 3 && !isTyping && (
              <form onSubmit={(e) => { e.preventDefault(); handlePinesSubmit(e.target.pinesInput.value); e.target.pinesInput.value = ''; }} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  name="pinesInput"
                  type="text"
                  required
                  placeholder="Ej: Pin 12 / Trig 7 y Echo 8 / Pin A0..."
                  className="form-input"
                  style={{ flexGrow: 1, height: '34px', fontSize: '0.85rem' }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ height: '34px', fontSize: '0.8rem' }}>
                  Aceptar
                </button>
              </form>
            )}

            {/* PROMPT STEP 4: INPUT ACCION */}
            {promptStep === 4 && !isTyping && (
              <form onSubmit={(e) => { e.preventDefault(); handleAccionSubmit(e.target.accionInput.value); e.target.accionInput.value = ''; }} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  name="accionInput"
                  type="text"
                  required
                  placeholder="Ej: Que gire de 0 a 180 y regrese / Que marque alarmas si mide menos de 10cm..."
                  className="form-input"
                  style={{ flexGrow: 1, height: '34px', fontSize: '0.85rem' }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ height: '34px', fontSize: '0.8rem' }}>
                  Generar Prompt
                </button>
              </form>
            )}

            {/* DEBUGGER STEP 1: CHOOSE SYMPTOM */}
            {debugStep === 1 && !isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  'Tengo error al subir el código (IDE)',
                  'Muestra símbolos raros en la terminal',
                  'Los componentes no encienden / no hacen nada',
                  'Los motores no giran o van al lado opuesto'
                ].map((symp) => (
                  <button key={symp} onClick={() => handleSymptomSelect(symp)} className="btn btn-secondary animate-fade-in" style={{ fontSize: '0.8rem', textAlign: 'left', padding: '0.6rem 0.8rem', height: 'auto', whiteSpace: 'normal', justifyContent: 'flex-start', width: '100%', lineHeight: '1.4' }}>
                    {symp}
                  </button>
                ))}
              </div>
            )}

            {/* DEBUGGER STEP 2: SELECT ANSWER */}
            {debugStep === 2 && !isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {diagnosticOptions.map((opt, idx) => (
                  <button key={idx} onClick={() => handleDiagnosisResponse(opt)} className="btn btn-secondary animate-fade-in" style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.6rem 0.8rem', height: 'auto', whiteSpace: 'normal', justifyContent: 'flex-start', width: '100%', lineHeight: '1.4' }}>
                    {opt.text}
                  </button>
                ))}
              </div>
            )}

            {/* DONE / IDLE STATES */}
            {(promptStep === 5 || debugStep === 3) && !isTyping && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={resetWizard} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                  Hacer otra pregunta
                </button>
              </div>
            )}

            {/* SOCRATIC LESSON OPTIONS */}
            {socraticNode && !isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(activeLesson.socraticTree[socraticNode]?.options || []).map((opt, idx) => (
                  <button key={idx} onClick={() => handleSocraticOptionClick(opt)} className="btn btn-secondary animate-fade-in" style={{ fontSize: '0.85rem', textAlign: 'left', padding: '0.6rem 0.8rem', height: 'auto', whiteSpace: 'normal', justifyContent: 'flex-start', width: '100%', lineHeight: '1.4' }}>
                    {opt.text}
                  </button>
                ))}
                {(activeLesson.socraticTree[socraticNode]?.options || []).length === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={resetWizard} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                      Volver a las Misiones
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
