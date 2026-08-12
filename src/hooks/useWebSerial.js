import { useState, useEffect, useRef } from 'react';

export function useWebSerial(onTelemetryReceived) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [connectionLost, setConnectionLostState] = useState(false);
  const connectionLostRef = useRef(false);

  const setConnectionLost = (val) => {
    setConnectionLostState(val);
    connectionLostRef.current = val;
  };

  const [connectionType, setConnectionTypeState] = useState(() => {
    return localStorage.getItem('edu_conn_type') || 'usb';
  }); // 'usb' | 'bluetooth'
  const [portName, setPortName] = useState(null);
  const [baudRate, setBaudRateState] = useState(() => {
    const saved = localStorage.getItem('edu_baud_rate');
    return saved ? parseInt(saved, 10) : 9600;
  });
  const [logs, setLogs] = useState([]);

  const setConnectionType = (type) => {
    setConnectionTypeState(type);
    localStorage.setItem('edu_conn_type', type);
  };

  const setBaudRate = (baud) => {
    setBaudRateState(baud);
    localStorage.setItem('edu_baud_rate', String(baud));
  };

  // NOTE: baudRate is intentionally NOT reset when connectionType changes.
  // The user's saved preference is preserved across connection type switches.

  const isSupported = typeof window !== 'undefined' && 'serial' in navigator;

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const keepReadingRef = useRef(false);
  const simulationIntervalRef = useRef(null);
  
  // Buffers for reading chunks
  const bufferRef = useRef('');
  const flushTimeoutRef = useRef(null);
  
  // Callback ref to always use the latest telemetry callback without re-running effects
  const onTelemetryRef = useRef(onTelemetryReceived);
  useEffect(() => {
    onTelemetryRef.current = onTelemetryReceived;
  }, [onTelemetryReceived]);

  // Batching references to prevent React render flooding
  const pendingLogs = useRef([]);
  const pendingTelemetry = useRef({});
  const batchIntervalRef = useRef(null);

  useEffect(() => {
    batchIntervalRef.current = setInterval(() => {
      // Flush Logs
      if (pendingLogs.current.length > 0) {
        const newLogs = [...pendingLogs.current];
        pendingLogs.current = [];
        setLogs((prev) => {
          const combined = [...prev, ...newLogs];
          return combined.slice(-300);
        });
      }

      // Flush Telemetry
      if (Object.keys(pendingTelemetry.current).length > 0) {
        if (onTelemetryRef.current) {
          onTelemetryRef.current({ ...pendingTelemetry.current });
        }
        pendingTelemetry.current = {};
      }
    }, 150); // ~6 fps update rate

    return () => clearInterval(batchIntervalRef.current);
  }, []);

  // Append a message to the logs queue
  const addLog = (type, text) => {
    const timestamp = new Date().toLocaleTimeString();
    pendingLogs.current.push({ type, text, timestamp });
  };

  const clearLogs = () => {
    pendingLogs.current = [];
    setLogs([]);
  };

  // Handle incoming data strings, parsing telemetries if present
  const processIncomingLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Output raw line to the serial logs
    addLog('in', trimmed);

    // Check if line represents telemetry data
    // Protocol: key1:val1,key2:val2,...
    // E.g.: "pot:512,light:340,temp:23.5"
    if (trimmed.includes(':')) {
      const data = {};
      let isTelemetry = true;
      
      const pairs = trimmed.split(',');
      for (const pair of pairs) {
        const parts = pair.split(':');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parseFloat(parts[1].trim());
          if (!isNaN(val)) {
            data[key] = val;
          } else {
            // It might be a system message like MSG:LED ON
            isTelemetry = false;
            break;
          }
        } else {
          isTelemetry = false;
          break;
        }
      }

      if (isTelemetry && Object.keys(data).length > 0) {
        pendingTelemetry.current = { ...pendingTelemetry.current, ...data };
      }
    }
  };

  // Connect to the actual Web Serial device
  const connect = async () => {
    if (!isSupported) {
      addLog('sys', 'Web Serial API not supported by this browser.');
      return false;
    }

    if (isSimulated) {
      // Turn off simulation first
      setSimulated(false);
    }

    setIsConnecting(true);
    setConnectionLost(false);
    addLog('sys', 'Requesting serial port selection...');
    
    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      
      addLog('sys', `Opening port at ${baudRate} baud...`);
      await port.open({ baudRate });
      
      setIsConnected(true);
      setIsConnecting(false);
      setPortName('Arduino Uno / Serial Device');
      addLog('sys', 'Port opened successfully. Start communicating.');

      // Start the reading loop
      keepReadingRef.current = true;
      startReadingLoop(port);
      return true;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      addLog('sys', `Connection error: ${err.message}`);
      return false;
    }
  };

  // Start reading loop
  const startReadingLoop = async (port) => {
    const decoder = new TextDecoder();
    let buffer = '';

    while (port.readable && keepReadingRef.current) {
      try {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        
        try {
          while (keepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            
            // Decode chunk and append to buffer
            bufferRef.current += decoder.decode(value, { stream: true });
            
            // Clear existing flush timeout
            if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
            
            // Process complete lines
            let newlineIndex;
            while ((newlineIndex = bufferRef.current.indexOf('\n')) !== -1) {
              const line = bufferRef.current.substring(0, newlineIndex);
              bufferRef.current = bufferRef.current.substring(newlineIndex + 1);
              processIncomingLine(line);
            }
            
            // If there's data left but no newline, set a timeout to flush it
            if (bufferRef.current.length > 0) {
              flushTimeoutRef.current = setTimeout(() => {
                if (bufferRef.current.length > 0) {
                  processIncomingLine(bufferRef.current);
                  bufferRef.current = '';
                }
              }, 150);
            }
          }
        } catch (error) {
          console.error('Serial read error:', error);
          addLog('sys', `Read error: ${error.message}`);
        } finally {
          reader.releaseLock();
          readerRef.current = null;
        }
      } catch (err) {
        console.error('Readable stream error:', err);
        break;
      }
    }
  };

  // Disconnect from serial port
  const disconnect = async () => {
    // Stop simulation if it is active
    if (isSimulated) {
      setSimulated(false);
      return;
    }

    addLog('sys', 'Disconnecting...');
    keepReadingRef.current = false;
    setConnectionLost(false);
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error(e);
      }
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {
        console.error('Error closing port:', e);
      }
      portRef.current = null;
    }

    setIsConnected(false);
    setPortName(null);
    addLog('sys', 'Disconnected.');
  };

  // Send data through serial (or simulated)
  const sendData = async (text, terminator = '\n') => {
    let formattedText = String(text);
    let resolvedTerminator = terminator;

    // Resolve double-escaped string representations from UI select options
    if (resolvedTerminator === '\\n') resolvedTerminator = '\n';
    else if (resolvedTerminator === '\\r') resolvedTerminator = '\r';
    else if (resolvedTerminator === '\\r\\n') resolvedTerminator = '\r\n';

    if (resolvedTerminator !== 'none' && resolvedTerminator !== '') {
      formattedText += resolvedTerminator;
    }

    addLog('out', text);

    if (isSimulated) {
      // Simulate Arduino action locally
      setTimeout(() => {
        const command = text.trim();
        if (command === '1' || command === 'LED_ON') {
          addLog('in', 'MSG:LED Encendido');
        } else if (command === '0' || command === 'LED_OFF') {
          addLog('in', 'MSG:LED Apagado');
        } else if (command.startsWith('SERVO:') || /^[A-Z].*\d+$/.test(command)) {
          // Generic servo/slider simulation: any prefix+number pattern
          const val = command.replace(/[^0-9]/g, '') || '?';
          addLog('in', `MSG:Actuador -> ${val}`);
        } else {
          addLog('in', `ECHO: ${command}`);
        }
      }, 200);
      return true;
    }

    if (!portRef.current) {
      addLog('sys', 'Cannot send data: No device connected.');
      return false;
    }

    const writeTask = async () => {
      if (!portRef.current) return false;
      let writer;
      try {
        writer = portRef.current.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(formattedText));
        return true;
      } catch (err) {
        console.error(err);
        addLog('sys', `Write error: ${err.message}`);
        return false;
      } finally {
        if (writer) {
          writer.releaseLock();
        }
      }
    };

    // Queue the writes sequentially to avoid "stream is already locked" errors
    if (!portRef.current.writeQueue) {
      portRef.current.writeQueue = Promise.resolve();
    }
    
    portRef.current.writeQueue = portRef.current.writeQueue.then(writeTask).catch(() => false);
    return portRef.current.writeQueue;
  };

  // Toggle simulated port mode
  const setSimulated = (enable) => {
    if (enable === isSimulated) return;

    if (enable) {
      // Disconnect real port if connected
      if (isConnected) {
        disconnect();
      }
      setIsSimulated(true);
      setIsConnected(true);
      setPortName('Simulated Arduino Board');
      addLog('sys', 'Simulation mode activated. Esperando comandos...');

      // Start dummy telemetry generation
      // The user requested NO random data in simulation mode. It should just respond to dashboard commands.
      // (The dummy response logic is handled inside sendData).
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setIsSimulated(false);
      setIsConnected(false);
      setPortName(null);
      addLog('sys', 'Simulation mode deactivated.');
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Quick reconnect functionality
  const reconnect = async () => {
    if (!isSupported) return false;
    setIsConnecting(true);
    setConnectionLost(false);
    addLog('sys', 'Intentando reconexión rápida...');
    
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const port = ports[0];
        portRef.current = port;
        
        await port.open({ baudRate });
        
        setIsConnected(true);
        setIsConnecting(false);
        setPortName('Arduino (Reconectado)');
        addLog('sys', 'Reconexión exitosa.');
        
        keepReadingRef.current = true;
        startReadingLoop(port);
        return true;
      } else {
        throw new Error("No hay puertos previamente autorizados.");
      }
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      setConnectionLost(true);
      addLog('sys', `Error de reconexión: ${err.message}`);
      return false;
    }
  };

  // Listen for unexpected disconnects / reconnects
  useEffect(() => {
    if (!isSupported) return;

    const handleDisconnect = (e) => {
      // e.target is the SerialPort that disconnected
      if (portRef.current && e.target === portRef.current) {
        addLog('sys', '⚠️ ¡Conexión perdida inesperadamente! (Desconexión física)');
        setIsConnected(false);
        setConnectionLost(true);
        setPortName(null);
        portRef.current = null;
        keepReadingRef.current = false;
        
        if (readerRef.current) {
          readerRef.current.cancel().catch(() => {});
        }
      }
    };

    const handleConnect = (e) => {
      if (connectionLostRef.current) {
        addLog('sys', 'Dispositivo detectado nuevamente. Intentando reconectar en 1s...');
        setTimeout(() => {
          reconnect();
        }, 1000);
      }
    };

    navigator.serial.addEventListener('disconnect', handleDisconnect);
    navigator.serial.addEventListener('connect', handleConnect);

    return () => {
      navigator.serial.removeEventListener('disconnect', handleDisconnect);
      navigator.serial.removeEventListener('connect', handleConnect);
    };
  }, [isSupported, baudRate]); // Need baudRate so reconnect uses the latest

  return {
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
    reconnect,
    sendData,
    clearLogs,
    setSimulated,
    connectionLost,
  };
}
